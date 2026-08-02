"""Gemini API key pool and rotation policy (spec §6).

Why this exists: Gemini applies per-key rate limits (RPM/TPM/RPD). One admin
portal doing OCR extraction, field validation, RAG chat and quick prompts can
burst past a single key's quota quickly. Rotation spreads load and fails over
automatically instead of the assistant hard-failing during a burst.

Keys live in `gemini_api_keys` encrypted at rest (spec §6.2) - never plaintext
in the database and never in a committed `.env`. Only this class decrypts,
using `MASTER_ENCRYPTION_KEY`.

**Bookkeeping runs in its own transaction, not the caller's.** Key health is
operational state: if a request fails *after* an AI call, the cooldown that
call earned must survive the rollback, or the next request hands the same
exhausted key straight back out. That is why this takes the session factory
rather than a request-scoped session.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum

from core.config import Settings
from core.crypto import EncryptionError, decrypt_secret, encrypt_secret, mask_secret
from core.exceptions import AIUnavailableError
from core.logger import get_logger
from db.session import DatabaseProvider
from repositories.gemini_key_repository import GeminiKeyRepository
from services.ai.errors import GeminiError
from services.ai.retry import cooldown_until

logger = get_logger(__name__)


class KeyStatus(str, Enum):
    active = "active"
    cooling_down = "cooling_down"
    disabled = "disabled"


@dataclass
class ApiKeyRecord:
    """One eligible key, with its secret decrypted for immediate use."""

    id: str
    key_label: str
    status: KeyStatus
    daily_quota: int
    used_today: int
    priority: int
    last_used_at: datetime | None = None
    last_error: str | None = None
    cooldown_until: datetime | None = None

    # Decrypted. Never logged, never serialised into a response.
    secret: str | None = None

    @property
    def masked(self) -> str:
        """Spec §6.3: label plus last 4 characters, never the key."""
        return f"{self.key_label}(...{mask_secret(self.secret or '')})"

    def __repr__(self) -> str:
        # Overridden so a stray repr in a log line or traceback cannot print
        # the secret. The default dataclass repr would include every field.
        return f"ApiKeyRecord(id={self.id!r}, key_label={self.key_label!r}, status={self.status})"


class KeyRotationPolicy:
    """Weighted round-robin with health-based exclusion (spec §6.2).

    - `active` keys are eligible; so is a `cooling_down` key whose cooldown has
      elapsed.
    - On 429 / quota exceeded: mark `cooling_down` with an exponential backoff
      capped at ~15 minutes.
    - On repeated auth errors (invalid or revoked key): mark `disabled` and log
      an alert.
    - Track `used_today` against `daily_quota`; reset at UTC midnight.
    - Pick: filter eligible -> order by (priority, used_today ascending) -> first.
    """

    def __init__(self, database: DatabaseProvider, settings: Settings) -> None:
        self._database = database
        self._settings = settings
        self._master_key = settings.master_encryption_key
        # Keys handed out during the current call, so a retry never re-picks
        # the key that just failed.
        self._excluded: set[str] = set()

    # --- selection ----------------------------------------------------------

    async def get_key(self) -> ApiKeyRecord:
        """Return the next eligible key, decrypted.

        Raises `AIUnavailableError` when the pool is exhausted, so the frontend
        receives a clean "AI temporarily unavailable" rather than a raw 500.
        """
        if not self._database.is_connected:
            seed_keys = self._settings.gemini_seed_keys
            for i, secret in enumerate(seed_keys):
                key_id = f"seed-{i}"
                if key_id in self._excluded:
                    continue
                return ApiKeyRecord(
                    id=key_id,
                    key_label=f"Seed Key #{i+1}",
                    status=KeyStatus.active,
                    daily_quota=10000,
                    used_today=0,
                    priority=i,
                    secret=secret,
                )
            raise AIUnavailableError("All seed Gemini API keys are exhausted or excluded.")

        async with self._database.session() as session:
            repository = GeminiKeyRepository(session)
            candidates = await repository.eligible_keys()

        undecryptable = 0
        for candidate in candidates:
            key_id = str(candidate.id)
            if key_id in self._excluded:
                continue
            try:
                secret = decrypt_secret(candidate.encrypted_key, self._master_key)
            except EncryptionError as exc:
                # A key that cannot be decrypted is unusable, but it is a
                # configuration fault, not a Gemini fault - do not cool it down
                # or disable it, because rotating MASTER_ENCRYPTION_KEY back
                # would make it good again.
                undecryptable += 1
                logger.error(
                    "gemini_key_undecryptable",
                    extra={"gemini_key_label": candidate.key_label, "reason": str(exc)},
                )
                continue

            self._excluded.add(key_id)
            return ApiKeyRecord(
                id=key_id,
                key_label=candidate.key_label,
                status=KeyStatus(candidate.status),
                daily_quota=candidate.daily_quota,
                used_today=candidate.used_today,
                priority=candidate.priority,
                last_used_at=candidate.last_used_at,
                last_error=candidate.last_error,
                cooldown_until=candidate.cooldown_until,
                secret=secret,
            )

        logger.warning(
            "gemini_key_pool_exhausted",
            extra={
                "eligible": len(candidates),
                "already_tried": len(self._excluded),
                "undecryptable": undecryptable,
            },
        )
        raise AIUnavailableError()

    def reset_attempt_history(self) -> None:
        """Clear the per-call exclusion set. Called at the start of each call."""
        self._excluded.clear()

    # --- reporting ----------------------------------------------------------

    async def report_success(self, key_id: str, tokens_used: int) -> None:
        if not self._database.is_connected:
            return
        async with self._database.session() as session:
            await GeminiKeyRepository(session).record_success(key_id, tokens_used=tokens_used)

    async def report_failure(self, key_id: str, error: GeminiError) -> None:
        """Apply the health transition this failure implies."""
        if not self._database.is_connected:
            return
        message = str(error)[:1000]
        async with self._database.session() as session:
            repository = GeminiKeyRepository(session)

            if error.is_auth_failure:
                disabled = await repository.record_auth_failure(
                    key_id,
                    error=message,
                    disable_at=self._settings.gemini_auth_failures_before_disable,
                )
                if disabled:
                    # Spec §6.2 asks for an alert. Structured and loud: a
                    # silently disabled key shrinks the pool until the next
                    # outage explains why.
                    logger.error("gemini_key_disabled", extra={"gemini_key_id": key_id})
                return

            if error.is_rate_limited:
                key = await repository.get(key_id)
                failures = (key.consecutive_auth_failures if key else 0) + 1
                until = cooldown_until(
                    failures,
                    base_seconds=self._settings.gemini_cooldown_base_seconds,
                    max_seconds=self._settings.gemini_cooldown_max_seconds,
                )
                await repository.record_cooldown(key_id, until=until, error=message)
                logger.warning(
                    "gemini_key_cooling_down",
                    extra={"gemini_key_id": key_id, "cooldown_until": until.isoformat()},
                )
                return

            # Anything else - transient upstream error, timeout, bad request -
            # is recorded but does not change eligibility. Cooling a key down
            # because a prompt was malformed would shrink the pool for a fault
            # the key had nothing to do with.
            await repository.record_error(key_id, error=message)

    async def reset_daily_counters(self) -> int:
        """Scheduled at UTC midnight (spec §6.2). Returns rows reset."""
        async with self._database.session() as session:
            count = await GeminiKeyRepository(session).reset_daily_counters(now=datetime.now(UTC))
        logger.info("gemini_quota_reset", extra={"keys_reset": count})
        return count

    # --- pool management ----------------------------------------------------

    async def add_key(
        self,
        *,
        key_label: str,
        api_key: str,
        daily_quota: int = 0,
        priority: int = 100,
    ) -> str:
        """Encrypt and store a key. Returns its id.

        Encryption happens here rather than in the repository so plaintext
        never crosses the persistence boundary - the repository handles
        ciphertext exclusively and cannot leak what it never receives.
        """
        encrypted = self.encrypt(api_key)
        async with self._database.session() as session:
            record = await GeminiKeyRepository(session).create_key(
                key_label=key_label,
                encrypted_key=encrypted,
                key_suffix=mask_secret(api_key),
                daily_quota=daily_quota,
                priority=priority,
            )
            return str(record.id)

    async def seed_from_environment(self) -> int:
        """Bootstrap the pool from `GEMINI_API_KEYS_SEED` (dev only).

        Refuses outside development: production keys belong in the table, and
        an environment variable that silently becomes the source of truth in
        production is exactly what spec §6.2 rules out.
        """
        seeds = self._settings.gemini_seed_keys
        if not seeds:
            return 0
        if self._settings.environment != "development":
            logger.warning("gemini_seed_ignored: GEMINI_API_KEYS_SEED is development-only")
            return 0

        added = 0
        async with self._database.session() as session:
            repository = GeminiKeyRepository(session)
            for index, secret in enumerate(seeds, start=1):
                label = f"seed-{index}"
                if await repository.find_by_label(label):
                    continue
                await repository.create_key(
                    key_label=label,
                    encrypted_key=self.encrypt(secret),
                    key_suffix=mask_secret(secret),
                    daily_quota=0,
                    priority=100 + index,
                )
                added += 1
        if added:
            logger.info("gemini_keys_seeded", extra={"count": added})
        return added

    def encrypt(self, plaintext_key: str) -> str:
        """AES-GCM encrypt with `MASTER_ENCRYPTION_KEY` (spec §6.2)."""
        if not self._master_key:
            raise EncryptionError(
                "MASTER_ENCRYPTION_KEY is not configured; refusing to store a key in plaintext."
            )
        return encrypt_secret(plaintext_key, self._master_key)

    def decrypt(self, encrypted_key: str) -> str:
        return decrypt_secret(encrypted_key, self._master_key)

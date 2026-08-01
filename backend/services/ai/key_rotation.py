"""Gemini API key pool and rotation policy (spec §6).

Why this exists: Gemini applies per-key rate limits (RPM/TPM/RPD). One admin
portal doing OCR extraction, field validation, RAG chat and quick-prompts can
burst past a single key's quota quickly. Rotation spreads load and fails over
automatically instead of the assistant hard-failing during a burst.

Keys live in the `gemini_api_keys` table **encrypted at rest** (spec §6.2) —
never plaintext in the database and never in a committed `.env`. Only FastAPI
can decrypt, via `MASTER_ENCRYPTION_KEY` from Railway.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class KeyStatus(str, Enum):
    active = "active"
    cooling_down = "cooling_down"
    disabled = "disabled"


@dataclass
class ApiKeyRecord:
    id: str
    key_label: str
    status: KeyStatus
    daily_quota: int
    used_today: int
    priority: int
    last_used_at: datetime | None = None
    last_error: str | None = None
    cooldown_until: datetime | None = None

    # The decrypted value. Never logged, never serialised into a response.
    secret: str | None = None

    @property
    def masked(self) -> str:
        """Spec §6.3: never log full key values — label plus last 4 only."""
        tail = self.secret[-4:] if self.secret else "????"
        return f"{self.key_label}(...{tail})"


class GeminiError(Exception):
    """Normalised Gemini failure, classified for the rotation policy."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_rate_limited(self) -> bool:
        return self.status_code == 429

    @property
    def is_auth_failure(self) -> bool:
        return self.status_code in (401, 403)


class KeyRotationPolicy:
    """Weighted round-robin with health-based exclusion (spec §6.2).

    - `status='active'` keys are eligible.
    - On 429 / quota-exceeded: mark `cooling_down`, `cooldown_until = now +
      backoff` (exponential, capped ~15 min).
    - On repeated auth errors (invalid/revoked key): mark `disabled`, alert.
    - Track `used_today` / `daily_quota`; reset via a scheduled job at UTC
      midnight.
    - Pick: filter eligible -> sort by (priority, used_today ascending) -> first.
    """

    MAX_BACKOFF_SECONDS = 15 * 60
    AUTH_FAILURES_BEFORE_DISABLE = 2

    def __init__(self, repository: object, master_encryption_key: str | None) -> None:
        self._repository = repository
        self._master_key = master_encryption_key

    async def get_key(self) -> ApiKeyRecord:
        """Return the next eligible key, decrypted.

        Raises `AIUnavailableError` when the pool is exhausted, so the frontend
        sees a clean "AI temporarily unavailable" rather than a raw 500.
        """
        raise NotImplementedError

    async def report_success(self, key_id: str, tokens_used: int) -> None:
        raise NotImplementedError

    async def report_failure(self, key_id: str, error: GeminiError) -> None:
        raise NotImplementedError

    async def reset_daily_counters(self) -> None:
        """Scheduled at UTC midnight."""
        raise NotImplementedError

    def _decrypt(self, encrypted_key: str) -> str:
        """AES-GCM decrypt using MASTER_ENCRYPTION_KEY."""
        raise NotImplementedError

    def _encrypt(self, plaintext_key: str) -> str:
        raise NotImplementedError

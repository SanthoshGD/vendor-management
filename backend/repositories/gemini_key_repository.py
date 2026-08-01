"""Gemini key pool persistence (spec §4 `gemini_api_keys`, §6).

Ciphertext in, ciphertext out. This layer never decrypts and never sees a
plaintext key — that capability belongs to `KeyRotationPolicy` alone, which is
what keeps the blast radius of a bug here to "cannot pick a key" rather than
"leaked the pool".
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import ClassVar
from uuid import UUID

from sqlalchemy import select, update

from models.orm import GeminiApiKey
from repositories.base import BaseRepository, parse_uuid


class GeminiKeyRepository(BaseRepository[GeminiApiKey]):
    model: ClassVar[type[GeminiApiKey]] = GeminiApiKey

    async def list_keys(self, *, include_disabled: bool = True) -> list[GeminiApiKey]:
        statement = select(GeminiApiKey)
        if not include_disabled:
            statement = statement.where(GeminiApiKey.status != "disabled")
        statement = statement.order_by(
            GeminiApiKey.priority.asc(), GeminiApiKey.key_label.asc()
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def find_by_label(self, key_label: str) -> GeminiApiKey | None:
        result = await self.session.execute(
            select(GeminiApiKey).where(GeminiApiKey.key_label == key_label)
        )
        return result.scalar_one_or_none()

    async def eligible_keys(self, *, now: datetime | None = None) -> list[GeminiApiKey]:
        """Keys that may serve a request, in selection order (spec §6.2).

        Selection order is `(priority, used_today ascending)`, which the
        composite index on `(status, priority, used_today)` serves directly.

        A `cooling_down` key whose cooldown has elapsed is included here rather
        than being reset by a background job first: a key that has served its
        cooldown is eligible the moment it has, and waiting for a sweeper would
        idle capacity during exactly the burst that caused the cooldown.
        """
        moment = now or datetime.now(UTC)
        result = await self.session.execute(
            select(GeminiApiKey)
            .where(
                GeminiApiKey.status != "disabled",
                (GeminiApiKey.status == "active")
                | (GeminiApiKey.cooldown_until.is_(None))
                | (GeminiApiKey.cooldown_until <= moment),
                (GeminiApiKey.daily_quota == 0)
                | (GeminiApiKey.used_today < GeminiApiKey.daily_quota),
            )
            .order_by(GeminiApiKey.priority.asc(), GeminiApiKey.used_today.asc())
        )
        return list(result.scalars().all())

    async def create_key(
        self,
        *,
        key_label: str,
        encrypted_key: str,
        key_suffix: str,
        daily_quota: int = 0,
        priority: int = 100,
    ) -> GeminiApiKey:
        return await self.add(
            GeminiApiKey(
                key_label=key_label,
                encrypted_key=encrypted_key,
                key_suffix=key_suffix,
                status="active",
                daily_quota=daily_quota,
                used_today=0,
                tokens_used_today=0,
                priority=priority,
                consecutive_auth_failures=0,
            )
        )

    async def record_success(
        self, key_id: str | UUID, *, tokens_used: int, now: datetime | None = None
    ) -> None:
        """Increment usage counters (spec §6.2 quota tracking).

        An in-database increment, not read-modify-write in Python: several
        requests share a key concurrently, and `used_today = used_today + 1`
        in SQL is the only version of this that does not lose counts.
        """
        moment = now or datetime.now(UTC)
        await self.session.execute(
            update(GeminiApiKey)
            .where(GeminiApiKey.id == parse_uuid(key_id, field="key_id"))
            .values(
                used_today=GeminiApiKey.used_today + 1,
                tokens_used_today=GeminiApiKey.tokens_used_today + max(tokens_used, 0),
                last_used_at=moment,
                last_error=None,
                consecutive_auth_failures=0,
                status="active",
                cooldown_until=None,
            )
        )
        await self.session.flush()

    async def record_cooldown(
        self,
        key_id: str | UUID,
        *,
        until: datetime,
        error: str,
        now: datetime | None = None,
    ) -> None:
        await self.session.execute(
            update(GeminiApiKey)
            .where(GeminiApiKey.id == parse_uuid(key_id, field="key_id"))
            .values(
                status="cooling_down",
                cooldown_until=until,
                last_error=error,
                last_used_at=now or datetime.now(UTC),
            )
        )
        await self.session.flush()

    async def record_auth_failure(
        self, key_id: str | UUID, *, error: str, disable_at: int
    ) -> bool:
        """Count an auth failure and disable the key once the limit is hit.

        Returns True when the key was disabled, so the caller can raise the
        alert spec §6.2 asks for.
        """
        key_uuid = parse_uuid(key_id, field="key_id")
        key = await self.session.get(GeminiApiKey, key_uuid)
        if key is None:
            return False
        key.consecutive_auth_failures += 1
        key.last_error = error
        disabled = key.consecutive_auth_failures >= disable_at
        if disabled:
            key.status = "disabled"
        await self.session.flush()
        return disabled

    async def record_error(self, key_id: str | UUID, *, error: str) -> None:
        await self.session.execute(
            update(GeminiApiKey)
            .where(GeminiApiKey.id == parse_uuid(key_id, field="key_id"))
            .values(last_error=error)
        )
        await self.session.flush()

    async def reset_daily_counters(self, *, now: datetime | None = None) -> int:
        """Scheduled at UTC midnight (spec §6.2). Returns rows reset.

        Also clears elapsed cooldowns, so a key rate-limited late yesterday
        starts the day eligible.
        """
        moment = now or datetime.now(UTC)
        result = await self.session.execute(
            update(GeminiApiKey)
            .where(GeminiApiKey.status != "disabled")
            .values(
                used_today=0,
                tokens_used_today=0,
                quota_reset_at=moment,
                status="active",
                cooldown_until=None,
            )
        )
        await self.session.flush()
        return int(result.rowcount or 0)

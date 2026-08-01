"""Audit trail persistence (spec §4 `activity_log`, §11).

Append-only. There is deliberately no `update` and no `delete` method on this
repository, and the underlying table should have UPDATE/DELETE revoked at the
database role level. Spec §11: "Never delete."

Every entry captures actor, action, before, after, reason, timestamp and IP
address — that is what backs "Every action is logged" on the Activity tab, and
it is exactly what enterprise buyers check for.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar

from repositories.base import BaseRepository


class ActivityRepository(BaseRepository):
    table: ClassVar[str] = "activity_log"

    async def append(
        self,
        *,
        actor: str,
        action: str,
        vendor_id: str | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        reason: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Insert one immutable entry.

        `actor` and the timestamp are resolved by the caller from the
        authenticated session and the server clock — never from a request body.
        """
        raise NotImplementedError

    async def list_entries(
        self,
        *,
        vendor_id: str | None = None,
        actor: str | None = None,
        action: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        raise NotImplementedError

    async def list_recent(self, limit: int = 5) -> list[dict[str, Any]]:
        """Feed for the dashboard's Recent Activity card."""
        raise NotImplementedError

"""Audit trail persistence (spec §4 `activity_log`, §11).

Append-only. There is deliberately no update and no delete method here, and the
API's database role should have UPDATE and DELETE revoked on the table.
Spec §11: "Never delete."

Every entry captures actor, action, before, after, reason, timestamp and IP -
that is what backs "Every action is logged" on the Activity tab, and it is
exactly what enterprise buyers check for.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import Select, select

from models.orm import ActivityLog
from repositories.base import BaseRepository, parse_uuid


class ActivityRepository(BaseRepository[ActivityLog]):
    model: ClassVar[type[ActivityLog]] = ActivityLog

    async def append(
        self,
        *,
        actor: str,
        action: str,
        vendor_id: str | UUID | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        reason: str | None = None,
        ip_address: str | None = None,
    ) -> ActivityLog:
        """Insert one immutable entry.

        `actor` and the timestamp are resolved by the caller from the
        authenticated session and the database clock - never from a request
        body. No commit: the entry lands in the same transaction as the
        mutation it records (spec §11).
        """
        entry = ActivityLog(
            vendor_id=parse_uuid(vendor_id, field="vendor_id") if vendor_id else None,
            actor=actor,
            action=action,
            before=before,
            after=after,
            reason=reason,
            ip_address=ip_address,
        )
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    def _filtered(
        self,
        *,
        vendor_id: str | UUID | None,
        actor: str | None,
        action: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> Select[tuple[ActivityLog]]:
        statement = select(ActivityLog)
        if vendor_id:
            statement = statement.where(
                ActivityLog.vendor_id == parse_uuid(vendor_id, field="vendorId")
            )
        if actor:
            statement = statement.where(ActivityLog.actor == actor)
        if action:
            statement = statement.where(ActivityLog.action == action)
        if date_from:
            statement = statement.where(ActivityLog.created_at >= date_from)
        if date_to:
            statement = statement.where(ActivityLog.created_at <= date_to)
        return statement

    async def list_entries(
        self,
        *,
        vendor_id: str | UUID | None = None,
        actor: str | None = None,
        action: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[ActivityLog], int]:
        statement = self._filtered(
            vendor_id=vendor_id,
            actor=actor,
            action=action,
            date_from=date_from,
            date_to=date_to,
        ).order_by(ActivityLog.created_at.desc(), ActivityLog.id.asc())
        return await self.paginate(statement, limit=limit, offset=offset)

    async def list_recent(self, limit: int = 5) -> list[ActivityLog]:
        """Feed for the dashboard's Recent Activity card."""
        result = await self.session.execute(
            select(ActivityLog)
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

"""Notification persistence (spec §4 `notifications`, `notification_events`).

Demo scope is in-app only (spec §14). The `notification_events` table is the
raw log notifications are generated from, kept separate so a delivery bug never
loses the fact that something happened.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import select, update

from models.orm import Notification, NotificationEvent, NotificationPreference
from repositories.base import BaseRepository, parse_uuid


class NotificationRepository(BaseRepository[Notification]):
    model: ClassVar[type[Notification]] = Notification

    async def record_event(
        self, *, event_type: str, source: str | None, payload: dict[str, Any]
    ) -> NotificationEvent:
        event = NotificationEvent(event_type=event_type, source=source, payload=payload)
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def create(
        self, *, user_id: str | UUID, event_type: str, payload: dict[str, Any]
    ) -> Notification:
        return await self.add(
            Notification(
                user_id=parse_uuid(user_id, field="user_id"),
                event_type=event_type,
                payload=payload,
            )
        )

    async def list_for_user(
        self, user_id: str | UUID, *, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        statement = select(Notification).where(
            Notification.user_id == parse_uuid(user_id, field="user_id")
        )
        if unread_only:
            statement = statement.where(Notification.read_at.is_(None))
        result = await self.session.execute(
            statement.order_by(Notification.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(self, notification_id: str | UUID, user_id: str | UUID) -> None:
        """Scoped to the owner, so one user cannot mark another's notification read."""
        await self.session.execute(
            update(Notification)
            .where(
                Notification.id == parse_uuid(notification_id, field="notification_id"),
                Notification.user_id == parse_uuid(user_id, field="user_id"),
                Notification.read_at.is_(None),
            )
            .values(read_at=datetime.now(UTC))
        )
        await self.session.flush()

    async def preferences_for(self, user_id: str | UUID) -> list[NotificationPreference]:
        result = await self.session.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == parse_uuid(user_id, field="user_id")
            )
        )
        return list(result.scalars().all())

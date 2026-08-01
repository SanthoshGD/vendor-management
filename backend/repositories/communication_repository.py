"""Vendor communication persistence (spec §4 `communications`).

Backs the Communication tab: vendor chat, internal notes and the chaser panel.
"""

from __future__ import annotations

from typing import ClassVar
from uuid import UUID

from sqlalchemy import select

from models.orm import Communication
from repositories.base import BaseRepository, parse_uuid


class CommunicationRepository(BaseRepository[Communication]):
    model: ClassVar[type[Communication]] = Communication

    async def list_for_vendor(
        self,
        vendor_id: str | UUID,
        *,
        channel: str | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[Communication], int]:
        statement = select(Communication).where(
            Communication.vendor_id == parse_uuid(vendor_id, field="vendor_id")
        )
        if channel:
            statement = statement.where(Communication.channel == channel)
        # Ascending: a conversation reads oldest-first, unlike an audit trail.
        statement = statement.order_by(Communication.created_at.asc(), Communication.id.asc())
        return await self.paginate(statement, limit=limit, offset=offset)

    async def post(
        self,
        vendor_id: str | UUID,
        *,
        channel: str,
        sender: str,
        message: str,
    ) -> Communication:
        """Append a message.

        `sender` comes from the authenticated session, never from the payload,
        so a client cannot post as somebody else.
        """
        return await self.add(
            Communication(
                vendor_id=parse_uuid(vendor_id, field="vendor_id"),
                channel=channel,
                sender=sender,
                message=message,
            )
        )

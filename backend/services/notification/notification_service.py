"""Notification fan-out (spec §4, §14).

Demo scope is a single `notifications` table, in-app only. Multi-channel
preferences (email/sms/push/slack/teams) are explicitly deferrable, so the
channel argument exists in the signature but only `in_app` is wired first —
adding a channel later must not change any caller.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)


class Channel(str, Enum):
    in_app = "in_app"
    email = "email"
    sms = "sms"
    push = "push"
    slack = "slack"
    teams = "teams"


class NotificationService:
    def __init__(self, supabase_provider: object) -> None:
        self._supabase = supabase_provider

    async def notify(
        self,
        *,
        user_id: str,
        event_type: str,
        payload: dict[str, Any],
        channels: list[Channel] | None = None,
    ) -> None:
        raise NotImplementedError

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        raise NotImplementedError

    async def list_for_user(self, user_id: str, *, unread_only: bool = False) -> list[dict]:
        raise NotImplementedError

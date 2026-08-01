"""Notification delivery worker (spec §10)."""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)

JOB_TYPE = "notification"


async def handle(job: dict[str, Any]) -> None:
    """Deliver one notification across the user's enabled channels.

    In-app only for the demo (spec §14); the channel loop exists so adding
    email or Slack later does not change the caller.
    """
    raise NotImplementedError

"""Notification dispatch and audit notification service."""

from __future__ import annotations

from typing import Any


class NotificationService:
    """Service for handling notifications to vendors and admins."""

    def __init__(self, notifications_repo: Any, users_repo: Any) -> None:
        self._notifications = notifications_repo
        self._users = users_repo

    async def notify_vendor_approval(self, vendor_id: str, vendor_name: str) -> None:
        """Send notification when vendor status changes to Approved."""
        pass

    async def notify_vendor_rejection(self, vendor_id: str, reason: str) -> None:
        """Send notification when vendor status changes to Rejected."""
        pass

    async def notify_document_requested(self, vendor_id: str, doc_type: str) -> None:
        """Send notification when vendor document is requested."""
        pass

"""`VendorRejected` event and its listeners (spec §9)."""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

EVENT_NAME = "vendor.rejected"

logger = get_logger(__name__)


async def on_notify(payload: dict[str, Any]) -> None:
    """Log the rejection notification. In production sends email with reason."""
    vendor_id = payload.get("vendor_id", "unknown")
    reviewer = payload.get("reviewer", "System")
    comment = payload.get("comment", "")
    logger.info(
        "vendor_rejection_notification_dispatched",
        extra={"vendor_id": vendor_id, "reviewer": reviewer, "comment_len": len(comment)},
    )
    # TODO: NotificationService.send(vendor_contact, event="vendor.rejected", body=comment)


async def on_embed_decision(payload: dict[str, Any]) -> None:
    """Embed the rejection into Historical Decisions for future RAG retrieval."""
    vendor_id = payload.get("vendor_id", "unknown")
    logger.info(
        "vendor_decision_embedding_queued",
        extra={"vendor_id": vendor_id, "decision": "rejected"},
    )
    # TODO: enqueue embedding_worker job.

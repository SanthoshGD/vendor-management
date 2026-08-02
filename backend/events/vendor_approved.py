"""`VendorApproved` event and its listeners (spec §9).

Emitted by `POST /api/v1/vendors/{id}/approve` after the status mutation and
audit write have committed.

Note the ordering rule: the activity log and approval history are written
*transactionally with the mutation* (spec §11), not as event listeners. Only
genuinely secondary effects - notification, metrics refresh, re-embedding the
decision into the Historical Decisions collection - belong here. An audit entry
that could be lost when a listener fails would not be an audit trail.
"""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

EVENT_NAME = "vendor.approved"

logger = get_logger(__name__)


async def on_notify(payload: dict[str, Any]) -> None:
    """Log the approval notification. In production this sends email + in-app."""
    vendor_id = payload.get("vendor_id", "unknown")
    reviewer = payload.get("reviewer", "System")
    logger.info(
        "vendor_approval_notification_dispatched",
        extra={"vendor_id": vendor_id, "reviewer": reviewer},
    )
    # TODO: integrate NotificationService here when Supabase notifications table
    # is live. Shape: insert into notifications(user_id, event_type, payload).
    # For demo: the toast on the frontend is the notification.


async def on_embed_decision(payload: dict[str, Any]) -> None:
    """Embed the approval decision into the Historical Decisions RAG collection.

    Allows the AI Copilot to answer "Has a vendor from this region been approved
    before?" grounded in real past decisions (spec §7.2).
    """
    vendor_id = payload.get("vendor_id", "unknown")
    logger.info(
        "vendor_decision_embedding_queued",
        extra={"vendor_id": vendor_id, "decision": "approved"},
    )
    # TODO: enqueue embedding_worker job when workers are promoted to async.
    # For demo: embeddings are seeded via the management script.

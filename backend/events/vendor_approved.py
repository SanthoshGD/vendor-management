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

EVENT_NAME = "vendor.approved"


async def on_notify(payload: dict[str, Any]) -> None:
    """Notify the assigned executive and the vendor contact."""
    raise NotImplementedError


async def on_embed_decision(payload: dict[str, Any]) -> None:
    """Embed the decision into the Historical Decisions collection (spec §7.2)."""
    raise NotImplementedError

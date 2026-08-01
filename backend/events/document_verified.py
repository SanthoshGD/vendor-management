"""`DocumentVerified` event and its listeners (spec §9, §10).

Emitted by the OCR worker once extraction completes. Triggers the two things
that depend on fresh document facts: a risk recalculation (a new driver-relevant
fact may have landed) and embedding into the Vendor Documents collection.
"""

from __future__ import annotations

from typing import Any

EVENT_NAME = "document.verified"


async def on_recalculate_risk(payload: dict[str, Any]) -> None:
    """Re-run `core.risk_engine.calculate` and persist the new drivers."""
    raise NotImplementedError


async def on_embed_document(payload: dict[str, Any]) -> None:
    """Chunk and embed into the Vendor Documents collection (spec §7.2)."""
    raise NotImplementedError


async def on_notify(payload: dict[str, Any]) -> None:
    raise NotImplementedError

"""`VendorRejected` event and its listeners (spec §9)."""

from __future__ import annotations

from typing import Any

EVENT_NAME = "vendor.rejected"


async def on_notify(payload: dict[str, Any]) -> None:
    """Notify the vendor with the rejection reason.

    Per the product rule, the message names what is wrong and what to resend —
    never a bare "rejected".
    """
    raise NotImplementedError


async def on_embed_decision(payload: dict[str, Any]) -> None:
    raise NotImplementedError

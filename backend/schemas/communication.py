"""Communication contracts (spec §4 `communications`, §8).

Backs the Vendor Communication tab: vendor chat, internal notes and the chaser
panel — currently local component state that vanishes on unmount.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field

from core.response import CamelModel


class CommunicationChannel(str, Enum):
    vendor_chat = "vendor_chat"
    internal_note = "internal_note"
    chaser = "chaser"


class MessageOut(CamelModel):
    id: str
    vendor_id: str
    channel: CommunicationChannel
    sender: str
    message: str
    created_at: datetime


class PostMessageRequest(CamelModel):
    channel: CommunicationChannel
    message: str = Field(min_length=1, max_length=8000)
    # `sender` is intentionally absent — resolved from the session, so a client
    # cannot post as somebody else.

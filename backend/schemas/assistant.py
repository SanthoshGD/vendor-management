"""Assistant contracts (spec §7.3).

The assistant is a copilot, not a chatbot: responses cite vendor and document
ids, and `suggestions` are structured quick prompts rather than free text.
It has no mutation surface by design.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field

from core.response import CamelModel


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class ChatTurn(CamelModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=8000)


class Citation(CamelModel):
    """Provenance for a grounded answer."""

    collection: str
    title: str | None = None
    vendor_id: str | None = None
    document_id: str | None = None
    excerpt: str | None = None
    similarity: float | None = None


class ChatRequest(CamelModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None
    # Set when opened from a Vendor Details page; null for the global FAB.
    vendor_id: str | None = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=50)
    stream: bool = Field(
        default=True,
        description="SSE token streaming (spec §7.3). False returns one JSON body.",
    )


class ChatResponse(CamelModel):
    """Non-streaming shape. The SSE stream emits these fields as events."""

    conversation_id: str
    message: str
    citations: list[Citation] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    created_at: datetime

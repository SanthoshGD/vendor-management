"""AI provider abstraction (spec §5).

Gemini is never hardcoded into services or routers. `chat_service`,
`extraction_service` and `embedding_service` each depend on this Protocol, not
on Gemini - swapping in Claude, OpenAI or Azure later means writing one new
class, not touching three services.

The three AI concerns are kept separate on purpose: chat, extraction and
embeddings have different latency, cost and failure characteristics and should
not share one undifferentiated client.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass
class AIResponse:
    text: str
    tokens_used: int = 0
    model: str = ""
    key_label: str = ""
    latency_ms: float = 0.0
    estimated_cost_usd: float | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class AIProvider(Protocol):
    """The only interface services may depend on."""

    async def generate(self, prompt: str, **kwargs: Any) -> AIResponse:
        """Chat / assistant completion."""
        ...

    async def embed(self, text: str, **kwargs: Any) -> list[float]:
        """RAG embedding vector."""
        ...

    async def extract(self, document: bytes, schema: dict, **kwargs: Any) -> dict:
        """OCR / structured field extraction against a target schema."""
        ...

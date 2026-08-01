"""RAG embedding generation (spec §5, §7.2).

Depends on `AIProvider.embed()`, not on Gemini directly, so the embedding model
is swappable without touching the pipeline.
"""

from __future__ import annotations

from core.config import Settings
from core.logger import get_logger
from services.ai.provider import AIProvider

logger = get_logger(__name__)


class EmbeddingService:
    def __init__(self, provider: AIProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings

    async def embed_one(self, text: str) -> list[float]:
        raise NotImplementedError

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch to amortise per-call overhead and key-quota consumption."""
        raise NotImplementedError

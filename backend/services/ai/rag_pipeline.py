"""RAG orchestration (spec §7).

Separate collections, not one flat index. Each chunk carries metadata
(`vendor_id`, `country`, `doc_type`, `category`, `created_at`) so a query from
a Vendor Details page filters to that vendor plus the global Compliance
Policies collection, rather than searching everything and hoping ranking sorts
it out.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from core.config import Settings
from services.ai.embedding_service import EmbeddingService


class RagCollection(str, Enum):
    """Spec §7.1 - distinct collections, queried by scope."""

    compliance_policy = "compliance_policy"
    vendor_document = "vendor_document"
    historical_decision = "historical_decision"
    internal_sop = "internal_sop"
    product_rule = "product_rule"


@dataclass
class RetrievedChunk:
    chunk_text: str
    similarity: float
    collection: RagCollection
    rag_document_id: str
    vendor_id: str | None = None
    doc_type: str | None = None
    title: str | None = None


class RagPipeline:
    """Ingest -> Chunk -> Embed -> Store -> Retrieve -> Augment -> Generate."""

    def __init__(
        self,
        embeddings: EmbeddingService,
        rag_repository: object,
        settings: Settings,
    ) -> None:
        self._embeddings = embeddings
        self._repository = rag_repository
        self._settings = settings

    def chunk(self, text: str) -> list[str]:
        """~500–800 tokens with ~10% overlap (spec §7.2)."""
        raise NotImplementedError

    async def ingest(
        self,
        *,
        collection: RagCollection,
        source_id: str,
        title: str,
        text: str,
        vendor_id: str | None = None,
        country: str | None = None,
        doc_type: str | None = None,
        category: str | None = None,
    ) -> int:
        """Chunk, embed and upsert. Returns the chunk count.

        Spec §7.2: re-indexing runs as a background job, never inline in the
        request that triggered it.
        """
        raise NotImplementedError

    async def retrieve(
        self,
        query: str,
        *,
        collections: list[RagCollection],
        vendor_id: str | None = None,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        """Cosine similarity via pgvector, filtered by collection + metadata."""
        raise NotImplementedError

    def augment(self, prompt: str, chunks: list[RetrievedChunk]) -> str:
        """Build the grounded prompt, preserving chunk provenance for citation."""
        raise NotImplementedError

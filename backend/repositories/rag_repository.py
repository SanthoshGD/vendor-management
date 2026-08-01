"""RAG persistence (spec §4 `rag_documents` / `rag_chunks`, §7).

pgvector-backed. `rag_chunks.embedding` is `vector(768)` with an IVFFlat or
HNSW index for retrieval speed.

Retrieval is always filtered by collection plus metadata — never a flat
similarity search across everything (spec §7.1).
"""

from __future__ import annotations

from typing import Any, ClassVar

from repositories.base import BaseRepository


class RagRepository(BaseRepository):
    table: ClassVar[str] = "rag_documents"
    chunks_table: ClassVar[str] = "rag_chunks"

    async def create_document(
        self,
        *,
        collection: str,
        source_id: str,
        title: str,
    ) -> dict[str, Any]:
        raise NotImplementedError

    async def upsert_chunks(
        self,
        rag_document_id: str,
        chunks: list[dict[str, Any]],
    ) -> int:
        """Insert chunk text + embedding + metadata. Returns the count."""
        raise NotImplementedError

    async def similarity_search(
        self,
        embedding: list[float],
        *,
        collections: list[str],
        vendor_id: str | None = None,
        country: str | None = None,
        doc_type: str | None = None,
        category: str | None = None,
        top_k: int = 6,
    ) -> list[dict[str, Any]]:
        """Cosine similarity via pgvector, scoped by collection + metadata.

        Implemented as a Postgres RPC rather than a client-side query — the
        `<=>` operator and the index are not reachable through PostgREST
        filters.
        """
        raise NotImplementedError

    async def delete_for_source(self, *, collection: str, source_id: str) -> None:
        """Remove chunks before re-embedding an updated source."""
        raise NotImplementedError

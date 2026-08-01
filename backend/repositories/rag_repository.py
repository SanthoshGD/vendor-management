"""RAG persistence (spec §4 `rag_documents` / `rag_chunks`, §7).

pgvector-backed. `rag_chunks.embedding` is `vector(768)` with an HNSW cosine
index (migration 0002).

Retrieval is always filtered by collection plus metadata — never a flat
similarity search across everything (spec §7.1). That filtering is what makes
retrieval quality better than one undifferentiated index, so the API makes
`collections` a required argument rather than an optional one.

The pipeline that chunks and embeds text is a later phase; this layer is the
storage and retrieval half, and it is complete.
"""

from __future__ import annotations

from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import delete, select

from models.orm import RagChunk, RagDocument
from repositories.base import BaseRepository, parse_uuid


class RagRepository(BaseRepository[RagDocument]):
    model: ClassVar[type[RagDocument]] = RagDocument

    async def create_document(
        self, *, collection: str, source_id: str | None, title: str | None
    ) -> RagDocument:
        return await self.add(
            RagDocument(collection=collection, source_id=source_id, title=title)
        )

    async def find_document(self, *, collection: str, source_id: str) -> RagDocument | None:
        result = await self.session.execute(
            select(RagDocument).where(
                RagDocument.collection == collection,
                RagDocument.source_id == source_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert_chunks(
        self, rag_document_id: str | UUID, chunks: list[dict[str, Any]]
    ) -> int:
        """Replace a document's chunks. Returns the count written.

        Replace rather than merge: re-embedding happens because the source
        changed, and leaving orphaned chunks from the previous version would
        let retired policy text keep surfacing in answers.
        """
        document_uuid = parse_uuid(rag_document_id, field="rag_document_id")
        await self.session.execute(
            delete(RagChunk).where(RagChunk.rag_document_id == document_uuid)
        )
        rows = [
            RagChunk(
                rag_document_id=document_uuid,
                chunk_text=chunk["chunk_text"],
                chunk_index=int(chunk.get("chunk_index", index)),
                embedding=chunk.get("embedding"),
                vendor_id=(
                    parse_uuid(chunk["vendor_id"], field="vendor_id")
                    if chunk.get("vendor_id")
                    else None
                ),
                country=chunk.get("country"),
                doc_type=chunk.get("doc_type"),
                category=chunk.get("category"),
            )
            for index, chunk in enumerate(chunks)
        ]
        self.session.add_all(rows)
        await self.session.flush()
        return len(rows)

    async def similarity_search(
        self,
        embedding: list[float],
        *,
        collections: list[str],
        vendor_id: str | UUID | None = None,
        country: str | None = None,
        doc_type: str | None = None,
        category: str | None = None,
        top_k: int = 6,
    ) -> list[dict[str, Any]]:
        """Cosine similarity, scoped by collection and metadata (spec §7.1).

        `cosine_distance` maps to pgvector's `<=>`, which the HNSW index
        serves. Similarity is reported as `1 - distance` so callers get the
        intuitive "higher is better" number.
        """
        if not collections:
            raise ValueError("similarity_search requires at least one collection (spec §7.1).")

        distance = RagChunk.embedding.cosine_distance(embedding).label("distance")
        statement = (
            select(RagChunk, RagDocument, distance)
            .join(RagDocument, RagDocument.id == RagChunk.rag_document_id)
            .where(
                RagDocument.collection.in_(collections),
                RagChunk.embedding.is_not(None),
            )
            .order_by(distance)
            .limit(top_k)
        )
        if vendor_id:
            statement = statement.where(
                RagChunk.vendor_id == parse_uuid(vendor_id, field="vendor_id")
            )
        if country:
            statement = statement.where(RagChunk.country == country)
        if doc_type:
            statement = statement.where(RagChunk.doc_type == doc_type)
        if category:
            statement = statement.where(RagChunk.category == category)

        result = await self.session.execute(statement)
        return [
            {
                "chunk_id": str(chunk.id),
                "collection": document.collection,
                "title": document.title,
                "source_id": document.source_id,
                "vendor_id": str(chunk.vendor_id) if chunk.vendor_id else None,
                "chunk_text": chunk.chunk_text,
                "chunk_index": chunk.chunk_index,
                "similarity": round(1.0 - float(distance_value), 4),
            }
            for chunk, document, distance_value in result.all()
        ]

    async def delete_for_source(self, *, collection: str, source_id: str) -> None:
        """Remove a source entirely before re-ingesting it."""
        await self.session.execute(
            delete(RagDocument).where(
                RagDocument.collection == collection,
                RagDocument.source_id == source_id,
            )
        )
        await self.session.flush()

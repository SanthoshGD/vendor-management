"""Embedding worker (spec §7.2, §10).

Re-index triggers: a document is approved and OCR'd, a vendor decision is
recorded, or the policy pack is edited. All three run here rather than inline
in the request that triggered them.
"""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)

JOB_TYPE = "embedding"


async def handle(job: dict[str, Any]) -> None:
    """Chunk, embed and upsert into `rag_chunks`.

    Deletes the previous chunks for the source first, so re-embedding an
    updated document does not leave stale vectors behind to be retrieved.
    """
    raise NotImplementedError

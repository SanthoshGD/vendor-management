"""Supabase Storage helpers (spec §18 phase 2, step 5).

Buckets are kept separate, not mixed: `documents/`, `products/`, `avatars/`,
`exports/`, `knowledge-base/`.

Raw object paths are never returned to a client — only time-limited signed
URLs, so bucket structure is not part of the public contract.
"""

from __future__ import annotations

from enum import Enum

from core.logger import get_logger

logger = get_logger(__name__)


class Bucket(str, Enum):
    documents = "documents"
    products = "products"
    avatars = "avatars"
    exports = "exports"
    knowledge_base = "knowledge-base"


class StorageService:
    def __init__(self, supabase_provider: object) -> None:
        self._supabase = supabase_provider

    async def upload(
        self,
        *,
        bucket: Bucket,
        path: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """Store an object and return its storage path."""
        raise NotImplementedError

    async def signed_url(self, *, bucket: Bucket, path: str, expires_in: int = 900) -> str:
        raise NotImplementedError

    async def download(self, *, bucket: Bucket, path: str) -> bytes:
        raise NotImplementedError

    async def delete(self, *, bucket: Bucket, path: str) -> None:
        raise NotImplementedError

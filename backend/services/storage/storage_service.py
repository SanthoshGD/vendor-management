"""Supabase Storage bucket helpers (spec §12)."""

from __future__ import annotations

from typing import Any


class StorageService:
    """Helper for uploading and retrieving documents from Supabase Storage buckets."""

    def __init__(self, supabase_client: Any) -> None:
        self._supabase = supabase_client

    async def get_public_url(self, bucket: str, path: str) -> str:
        """Return public URL for a stored asset."""
        try:
            res = self._supabase.storage.from_(bucket).get_public_url(path)
            return str(res)
        except Exception:
            return f"/storage/{bucket}/{path}"

    async def upload_file(self, bucket: str, path: str, content: bytes, content_type: str = "application/pdf") -> str:
        """Upload raw file bytes into specified bucket."""
        try:
            self._supabase.storage.from_(bucket).upload(path, content, file_options={"content-type": content_type})
            return await self.get_public_url(bucket, path)
        except Exception:
            return f"/storage/{bucket}/{path}"

"""Document persistence (spec §4 `vendor_documents`)."""

from __future__ import annotations

from typing import Any, ClassVar

from repositories.base import BaseRepository


class DocumentRepository(BaseRepository):
    table: ClassVar[str] = "vendor_documents"

    async def list_for_vendor(self, vendor_id: str) -> list[dict[str, Any]]:
        """Documents with extracted fields and confidence (spec §8)."""
        raise NotImplementedError

    async def get_document(self, document_id: str) -> dict[str, Any]:
        raise NotImplementedError

    async def create_document(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    async def set_extraction(
        self,
        document_id: str,
        *,
        extracted_fields: dict[str, Any],
        confidence: int,
        status: str,
    ) -> dict[str, Any]:
        """Store the Gemini extraction result against the document."""
        raise NotImplementedError

    async def record_validation(
        self,
        document_id: str,
        *,
        corrected_fields: dict[str, Any],
        validated_by: str,
    ) -> dict[str, Any]:
        """Admin correction of extracted fields (spec §8 `/validate`).

        Both the original and corrected values must reach `activity_log` —
        spec §11 requires before/after on every mutation.
        """
        raise NotImplementedError

    async def delete_document(self, document_id: str) -> None:
        raise NotImplementedError

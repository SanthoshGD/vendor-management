"""Document persistence (spec §4 `vendor_documents`)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import func, select

from core.exceptions import NotFoundError
from models.orm import VendorDocument
from repositories.base import BaseRepository, parse_uuid


class DocumentRepository(BaseRepository[VendorDocument]):
    model: ClassVar[type[VendorDocument]] = VendorDocument

    async def list_for_vendor(self, vendor_id: str | UUID) -> list[VendorDocument]:
        result = await self.session.execute(
            select(VendorDocument)
            .where(VendorDocument.vendor_id == parse_uuid(vendor_id, field="vendor_id"))
            .order_by(VendorDocument.doc_type.asc())
        )
        return list(result.scalars().all())

    async def get_for_vendor(
        self, vendor_id: str | UUID, document_id: str | UUID
    ) -> VendorDocument:
        """Fetch scoped to the vendor in the path.

        Scoped rather than by id alone on purpose: a mismatched pair must be a
        404, not a document from another vendor served through someone else's
        URL.
        """
        result = await self.session.execute(
            select(VendorDocument).where(
                VendorDocument.id == parse_uuid(document_id, field="doc_id"),
                VendorDocument.vendor_id == parse_uuid(vendor_id, field="vendor_id"),
            )
        )
        document = result.scalar_one_or_none()
        if document is None:
            raise NotFoundError(f"Document {document_id} does not exist for vendor {vendor_id}.")
        return document

    async def find_by_type(self, vendor_id: str | UUID, doc_type: str) -> VendorDocument | None:
        result = await self.session.execute(
            select(VendorDocument).where(
                VendorDocument.vendor_id == parse_uuid(vendor_id, field="vendor_id"),
                VendorDocument.doc_type == doc_type,
            )
        )
        return result.scalar_one_or_none()

    async def create_document(self, **values: Any) -> VendorDocument:
        return await self.add(VendorDocument(**values))

    async def set_extraction(
        self,
        document: VendorDocument,
        *,
        extracted_fields: dict[str, Any],
        confidence: int | None,
        status: str,
    ) -> VendorDocument:
        """Store an extraction result against the document."""
        document.extracted_fields = extracted_fields
        document.confidence = confidence
        document.status = status
        await self.session.flush()
        return document

    async def record_validation(
        self,
        document: VendorDocument,
        *,
        corrections: dict[str, str],
        validated_by: str,
        status: str = "Verified",
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Apply admin corrections; return `(before, after)` for the audit trail.

        Both halves are returned because spec §11 requires before *and* after on
        every mutation, and only this method can see the original values.

        A corrected field is marked `human_verified` and pinned to confidence
        100 — a human typing the value is the highest-confidence source there
        is, and leaving the model's score in place would keep firing
        `LOW_AI_CONFIDENCE` on a field that is now certain.
        """
        before = dict(document.extracted_fields or {})
        after: dict[str, Any] = {key: dict(value) if isinstance(value, dict) else value
                                 for key, value in before.items()}

        for key, value in corrections.items():
            existing = after.get(key)
            if isinstance(existing, dict):
                entry = dict(existing)
            else:
                entry = {"label": key.replace("_", " ").title(), "value": existing}
            entry["value"] = value
            entry["confidence"] = 100
            entry["human_verified"] = True
            after[key] = entry

        # Reassign rather than mutate: SQLAlchemy does not track in-place edits
        # to a JSONB dict, so an in-place update would silently never persist.
        document.extracted_fields = after
        document.validated_by = validated_by
        document.validated_at = datetime.now(UTC)
        document.status = status
        await self.session.flush()
        return before, after

    async def count_by_status(self, vendor_id: str | UUID | None = None) -> dict[str, int]:
        statement = select(VendorDocument.status, func.count()).group_by(VendorDocument.status)
        if vendor_id is not None:
            statement = statement.where(
                VendorDocument.vendor_id == parse_uuid(vendor_id, field="vendor_id")
            )
        result = await self.session.execute(statement)
        return {status: int(count) for status, count in result.all()}

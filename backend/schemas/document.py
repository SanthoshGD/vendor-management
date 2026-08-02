"""Document contracts - mirrors `types/vendor.ts` document shapes."""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from core.response import CamelModel
from schemas.common import DocumentStatus


class ExtractedFieldOut(CamelModel):
    key: str
    label: str
    value: str
    confidence: int = Field(ge=0, le=100)
    human_verified: bool = False
    cross_doc_mismatch: bool = False
    note: str | None = None


class DocumentOut(CamelModel):
    id: str
    vendor_id: str
    doc_type: str
    title: str | None = None
    status: DocumentStatus
    confidence: int | None = Field(default=None, ge=0, le=100)
    file_name: str | None = None
    page_count: int | None = None
    language: str | None = None
    extracted_fields: list[ExtractedFieldOut] = Field(default_factory=list)
    validated_by: str | None = None
    validated_at: datetime | None = None
    download_url: str | None = Field(
        default=None,
        description="Time-limited signed URL. Raw storage paths are never exposed.",
    )


class ExtractionQueued(CamelModel):
    """Spec §10: uploads and extraction requests do not block on OCR."""

    document_id: str
    job_id: str
    status: DocumentStatus


class FieldCorrection(CamelModel):
    key: str
    value: str = Field(min_length=1)


class ValidateDocumentRequest(CamelModel):
    """Admin correction of extracted fields (spec §8 `/validate`).

    Corrections are the signal for extraction quality, so a reason is required
    and both before/after reach `activity_log` (spec §11).
    """

    corrections: list[FieldCorrection] = Field(min_length=1)
    reason: str = Field(min_length=1, max_length=2000)

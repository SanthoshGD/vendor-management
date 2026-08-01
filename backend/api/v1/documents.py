"""Document routes (spec §8)."""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, status

from api.deps import (
    ActivityRepoDep,
    CurrentUserDep,
    DocumentRepoDep,
    StorageDep,
)
from core.response import ApiResponse
from schemas.document import DocumentOut, ExtractionQueued, ValidateDocumentRequest

router = APIRouter(prefix="/vendors/{vendor_id}/documents", tags=["documents"])


@router.post(
    "",
    response_model=ApiResponse[ExtractionQueued],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document",
    description=(
        "202, not 200. Spec §10: store in Supabase Storage, queue the "
        "extraction job, respond immediately. Uploads never block on OCR."
    ),
)
async def upload_document(
    vendor_id: str,
    documents: DocumentRepoDep,
    storage: StorageDep,
    activity: ActivityRepoDep,
    user: CurrentUserDep,
    doc_type: str = "",
    file: UploadFile = File(...),
) -> ApiResponse[ExtractionQueued]:
    raise NotImplementedError


@router.get(
    "/{doc_id}",
    response_model=ApiResponse[DocumentOut],
    responses={404: {"description": "Document not found."}},
    summary="One document with its extracted fields",
)
async def get_document(
    vendor_id: str, doc_id: str, documents: DocumentRepoDep
) -> ApiResponse[DocumentOut]:
    raise NotImplementedError


@router.post(
    "/{doc_id}/extract",
    response_model=ApiResponse[ExtractionQueued],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue Gemini OCR + field extraction",
    description=(
        "Worker-backed (spec §10). Synchronous extraction is acceptable for "
        "demo volume, but the contract is async from day one so moving to the "
        "worker later is not a breaking change."
    ),
)
async def extract_document(
    vendor_id: str,
    doc_id: str,
    documents: DocumentRepoDep,
    user: CurrentUserDep,
) -> ApiResponse[ExtractionQueued]:
    raise NotImplementedError


@router.post(
    "/{doc_id}/validate",
    response_model=ApiResponse[DocumentOut],
    summary="Admin correction of extracted fields",
    description=(
        "Writes before/after to `activity_log` in the same transaction "
        "(spec §11) and queues a risk recalculation, since a corrected field "
        "may change a driver."
    ),
)
async def validate_document(
    vendor_id: str,
    doc_id: str,
    payload: ValidateDocumentRequest,
    documents: DocumentRepoDep,
    activity: ActivityRepoDep,
    user: CurrentUserDep,
) -> ApiResponse[DocumentOut]:
    raise NotImplementedError

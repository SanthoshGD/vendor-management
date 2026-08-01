"""Vendor routes (spec §8).

Routes stay thin: parse the request, call one or two repositories/services,
return through the standard envelope. No Supabase call happens here.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.deps import (
    ActivityRepoDep,
    CurrentUserDep,
    DocumentRepoDep,
    PaginationDep,
    ProductRepoDep,
    RiskRepoDep,
    VendorRepoDep,
)
from core.response import ApiResponse
from schemas.activity import ActivityEntry
from schemas.common import Priority, RiskLevel, VendorStatus
from schemas.document import DocumentOut
from schemas.product import ProductOut
from schemas.risk import RiskOut
from schemas.vendor import (
    DecisionRequest,
    DecisionResult,
    RequestChangesRequest,
    VendorDetail,
    VendorSummary,
)

router = APIRouter(prefix="/vendors", tags=["vendors"])

DECISION_RESPONSES = {
    404: {"description": "Vendor not found."},
    422: {"description": "The decision was refused; `errors` carries the blockers."},
}


@router.get(
    "",
    response_model=ApiResponse[list[VendorSummary]],
    summary="List vendors",
    description="Filterable and sortable. Pagination is reported in `meta`.",
)
async def list_vendors(
    vendors: VendorRepoDep,
    pagination: PaginationDep,
    status_filter: str | None = Query(default=None, alias="status"),
    country: str | None = Query(default=None),
    risk: RiskLevel | None = Query(default=None),
    priority: Priority | None = Query(default=None),
    assigned_to: str | None = Query(default=None, alias="assignedTo"),
    search: str | None = Query(default=None, max_length=200),
    sort_by: str = Query(default="submission_date", alias="sortBy"),
    descending: bool = Query(default=True),
) -> ApiResponse[list[VendorSummary]]:
    raise NotImplementedError


@router.get(
    "/{vendor_id}",
    response_model=ApiResponse[VendorDetail],
    responses={404: {"description": "Vendor not found."}},
    summary="Vendor detail including risk",
)
async def get_vendor(vendor_id: str, vendors: VendorRepoDep) -> ApiResponse[VendorDetail]:
    raise NotImplementedError


@router.get(
    "/{vendor_id}/documents",
    response_model=ApiResponse[list[DocumentOut]],
    summary="Documents with extracted fields and confidence",
)
async def list_vendor_documents(
    vendor_id: str, documents: DocumentRepoDep
) -> ApiResponse[list[DocumentOut]]:
    raise NotImplementedError


@router.get(
    "/{vendor_id}/risk",
    response_model=ApiResponse[RiskOut],
    summary="Risk score, level, drivers and recommendation",
    description=(
        "Deterministic (spec §12). Always returns the driver decomposition — a "
        "score a reviewer cannot decompose is not explainable."
    ),
)
async def get_vendor_risk(
    vendor_id: str, risk: RiskRepoDep, vendors: VendorRepoDep
) -> ApiResponse[RiskOut]:
    raise NotImplementedError


@router.get(
    "/{vendor_id}/products",
    response_model=ApiResponse[list[ProductOut]],
    summary="Products listed by this vendor",
)
async def list_vendor_products(
    vendor_id: str, products: ProductRepoDep, pagination: PaginationDep
) -> ApiResponse[list[ProductOut]]:
    raise NotImplementedError


@router.get(
    "/{vendor_id}/activity",
    response_model=ApiResponse[list[ActivityEntry]],
    summary="Vendor-scoped audit trail",
)
async def list_vendor_activity(
    vendor_id: str, activity: ActivityRepoDep, pagination: PaginationDep
) -> ApiResponse[list[ActivityEntry]]:
    raise NotImplementedError


# --- Decisions --------------------------------------------------------------
# Spec §11: each of these writes `activity_log` + `approval_history` in the
# same transaction as the status mutation, then emits its event (spec §9).


@router.post(
    "/{vendor_id}/approve",
    response_model=ApiResponse[DecisionResult],
    responses=DECISION_RESPONSES,
    summary="Approve a vendor",
    description="Emits `VendorApproved` (spec §9) after the transaction commits.",
)
async def approve_vendor(
    vendor_id: str,
    payload: DecisionRequest,
    vendors: VendorRepoDep,
    activity: ActivityRepoDep,
    user: CurrentUserDep,
) -> ApiResponse[DecisionResult]:
    raise NotImplementedError


@router.post(
    "/{vendor_id}/reject",
    response_model=ApiResponse[DecisionResult],
    responses=DECISION_RESPONSES,
    summary="Reject a vendor",
    description="Emits `VendorRejected` (spec §9).",
)
async def reject_vendor(
    vendor_id: str,
    payload: DecisionRequest,
    vendors: VendorRepoDep,
    activity: ActivityRepoDep,
    user: CurrentUserDep,
) -> ApiResponse[DecisionResult]:
    raise NotImplementedError


@router.post(
    "/{vendor_id}/request-changes",
    response_model=ApiResponse[DecisionResult],
    responses=DECISION_RESPONSES,
    summary="Request corrections from the vendor",
    description=(
        "Same audit requirements as approve/reject. The message names what is "
        "wrong and what to resend, never a bare 'rejected'."
    ),
)
async def request_changes(
    vendor_id: str,
    payload: RequestChangesRequest,
    vendors: VendorRepoDep,
    activity: ActivityRepoDep,
    user: CurrentUserDep,
) -> ApiResponse[DecisionResult]:
    raise NotImplementedError

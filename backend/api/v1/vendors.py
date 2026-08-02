"""Vendor routes (spec §8).

Routes stay thin: parse the request, call one or two repositories/services,
return through the standard envelope. No Supabase call happens here.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.deps import (
    ActivityRepoDep,
    AdminDep,
    ClientIpDep,
    CurrentUserDep,
    DecisionServiceDep,
    DocumentRepoDep,
    PaginationDep,
    ProductRepoDep,
    RiskRepoDep,
    VendorRepoDep,
)
from core.response import ApiResponse, ok, paginated
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
    items, total = await vendors.list_vendors(
        status=status_filter,
        country=country,
        risk_level=risk.value if risk else None,
        priority=priority.value if priority else None,
        assigned_executive=assigned_to,
        search=search,
        sort_by=sort_by,
        descending=descending,
        limit=pagination.page_size,
        offset=pagination.offset,
    )
    return paginated(items, page=pagination.page, page_size=pagination.page_size, total=total)


@router.get(
    "/{vendor_id}",
    response_model=ApiResponse[VendorDetail],
    responses={404: {"description": "Vendor not found."}},
    summary="Vendor detail including risk",
)
async def get_vendor(vendor_id: str, vendors: VendorRepoDep) -> ApiResponse[VendorDetail]:
    v = await vendors.get_vendor(vendor_id)
    return ok(v)


@router.get(
    "/{vendor_id}/documents",
    response_model=ApiResponse[list[DocumentOut]],
    summary="Documents with extracted fields and confidence",
)
async def list_vendor_documents(
    vendor_id: str, documents: DocumentRepoDep
) -> ApiResponse[list[DocumentOut]]:
    docs = await documents.list_for_vendor(vendor_id)
    return ok(docs)


@router.get(
    "/{vendor_id}/risk",
    response_model=ApiResponse[RiskOut],
    summary="Risk score, level, drivers and recommendation",
    description=(
        "Deterministic (spec §12). Always returns the driver decomposition - a "
        "score a reviewer cannot decompose is not explainable."
    ),
)
async def get_vendor_risk(
    vendor_id: str, risk: RiskRepoDep, vendors: VendorRepoDep
) -> ApiResponse[RiskOut]:
    v = await vendors.get_vendor(vendor_id)
    drivers = await risk.list_drivers(vendor_id)
    payload = RiskOut(
        score=v.risk_score or 0,
        level=v.risk_level or RiskLevel.low,
        drivers=[
            {"code": d.driver_code, "points": d.points, "description": d.description}
            for d in drivers
        ],
        recommendation="Standard onboarding path." if (v.risk_score or 0) < 40 else "Enhanced document review required.",
        calculated_at=v.risk_calculated_at,
    )
    return ok(payload)


@router.get(
    "/{vendor_id}/products",
    response_model=ApiResponse[list[ProductOut]],
    summary="Products listed by this vendor",
)
async def list_vendor_products(
    vendor_id: str, products: ProductRepoDep, pagination: PaginationDep
) -> ApiResponse[list[ProductOut]]:
    items, total = await products.list_products(vendor_id=vendor_id, limit=pagination.page_size, offset=pagination.offset)
    return paginated(items, page=pagination.page, page_size=pagination.page_size, total=total)


@router.get(
    "/{vendor_id}/activity",
    response_model=ApiResponse[list[ActivityEntry]],
    summary="Vendor-scoped audit trail",
)
async def list_vendor_activity(
    vendor_id: str, activity: ActivityRepoDep, pagination: PaginationDep
) -> ApiResponse[list[ActivityEntry]]:
    items, total = await activity.list_entries(vendor_id=vendor_id, limit=pagination.page_size, offset=pagination.offset)
    return paginated(items, page=pagination.page, page_size=pagination.page_size, total=total)


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
    decision_service: DecisionServiceDep,
    user: AdminDep,
    client_ip: ClientIpDep = None,
) -> ApiResponse[DecisionResult]:
    result = await decision_service.approve(
        vendor_id=vendor_id,
        comment=payload.comment,
        reviewer=user.name or user.email,
        reviewer_id=user.id,
        ip_address=client_ip,
    )
    return ApiResponse(data=result)


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
    decision_service: DecisionServiceDep,
    user: AdminDep,
    client_ip: ClientIpDep = None,
) -> ApiResponse[DecisionResult]:
    result = await decision_service.reject(
        vendor_id=vendor_id,
        comment=payload.comment,
        reviewer=user.name or user.email,
        reviewer_id=user.id,
        ip_address=client_ip,
    )
    return ApiResponse(data=result)


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
    decision_service: DecisionServiceDep,
    user: AdminDep,
    client_ip: ClientIpDep = None,
) -> ApiResponse[DecisionResult]:
    result = await decision_service.request_changes(
        vendor_id=vendor_id,
        comment=payload.comment,
        changes=payload.changes,
        reviewer=user.name or user.email,
        reviewer_id=user.id,
        ip_address=client_ip,
    )
    return ApiResponse(data=result)

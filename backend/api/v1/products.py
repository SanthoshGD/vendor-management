"""Product catalog route (spec §8)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.deps import PaginationDep, ProductRepoDep
from core.response import ApiResponse, paginated
from schemas.product import ProductApprovalStatus, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get(
    "",
    response_model=ApiResponse[list[ProductOut]],
    summary="Product catalog listing",
)
async def list_products(
    products: ProductRepoDep,
    pagination: PaginationDep,
    vendor_id: str | None = Query(default=None, alias="vendorId"),
    approval_status: ProductApprovalStatus | None = Query(default=None, alias="status"),
    category: str | None = Query(default=None),
    country: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
) -> ApiResponse[list[ProductOut]]:
    items, total = await products.list_products(
        vendor_id=vendor_id,
        approval_status=approval_status.value if approval_status else None,
        category=category,
        country=country,
        search=search,
        limit=pagination.page_size,
        offset=pagination.offset,
    )
    return paginated(items, page=pagination.page, page_size=pagination.page_size, total=total)

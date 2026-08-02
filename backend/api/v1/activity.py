"""Global audit trail routes (spec §8, §11).

Read-only. There is no POST: audit entries are written as a side effect of the
action being audited, never by a client calling an endpoint.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query

from api.deps import ActivityRepoDep, PaginationDep
from core.response import ApiResponse, ok, paginated
from schemas.activity import ActivityEntry

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get(
    "",
    response_model=ApiResponse[list[ActivityEntry]],
    summary="Global audit trail",
)
async def list_activity(
    activity: ActivityRepoDep,
    pagination: PaginationDep,
    vendor_id: str | None = Query(default=None, alias="vendorId"),
    actor: str | None = Query(default=None),
    action: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> ApiResponse[list[ActivityEntry]]:
    items, total = await activity.list_entries(
        vendor_id=vendor_id,
        actor=actor,
        action=action,
        date_from=date_from,
        date_to=date_to,
        limit=pagination.page_size,
        offset=pagination.offset,
    )
    return paginated(items, page=pagination.page, page_size=pagination.page_size, total=total)


@router.get(
    "/recent",
    response_model=ApiResponse[list[ActivityEntry]],
    summary="Recent entries for the dashboard card",
)
async def list_recent(
    activity: ActivityRepoDep,
    limit: int = Query(default=5, ge=1, le=50),
) -> ApiResponse[list[ActivityEntry]]:
    items = await activity.list_recent(limit=limit)
    return ok(items)

"""Analytics route (spec §8)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.deps import AnalyticsDep
from core.response import ApiResponse
from schemas.analytics import AnalyticsPayload, TimeRange

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "",
    response_model=ApiResponse[AnalyticsPayload],
    summary="Aggregated analytics view data",
    description=(
        "Approval trend, country distribution and cycle times. These are real "
        "server-side aggregates — a trend over time cannot be derived from a "
        "vendor list in the browser."
    ),
)
async def get_analytics(
    analytics: AnalyticsDep,
    range_key: TimeRange = Query(default=TimeRange.d30, alias="range"),
) -> ApiResponse[AnalyticsPayload]:
    raise NotImplementedError

"""Dashboard route (spec §8)."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import AnalyticsDep
from core.response import ApiResponse
from schemas.dashboard import DashboardPayload

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "",
    response_model=ApiResponse[DashboardPayload],
    summary="Admin dashboard aggregate",
    description=(
        "Metrics, approval trend, pipeline funnel, priority queue, recent "
        "activity and approval rate by country — one round trip."
    ),
)
async def get_dashboard(analytics: AnalyticsDep) -> ApiResponse[DashboardPayload]:
    raise NotImplementedError

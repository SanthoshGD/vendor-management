"""Analytics aggregation (spec §8 `/api/v1/analytics`).

These are genuine server-side aggregates. An approval trend over time cannot be
derived from a vendor list in the browser, which is why `TrendChart` and
`AnalyticsView` are hardcoded on the frontend today.
"""

from __future__ import annotations

from core.logger import get_logger

logger = get_logger(__name__)


class AnalyticsService:
    def __init__(self, analytics_repository: object) -> None:
        self._repository = analytics_repository

    async def dashboard_aggregate(self) -> dict:
        """Spec §8: metrics, approval trend, pipeline funnel, priority queue,
        recent activity, China approval rate — in one round trip.

        Implementation note: zero is a valid result. Never substitute a
        placeholder count when a query returns empty — that is the `|| 3` /
        `|| 18` fallback pattern being removed from the frontend.
        """
        raise NotImplementedError

    async def analytics_view(self, *, range_key: str) -> dict:
        raise NotImplementedError

    async def approval_trend(self, *, range_key: str) -> list[dict]:
        raise NotImplementedError

    async def approval_rate_by_country(self) -> list[dict]:
        raise NotImplementedError

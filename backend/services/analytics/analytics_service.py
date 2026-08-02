"""Dashboard and analytics composition (spec §8).

Thin by design: `AnalyticsRepository` owns the SQL, this owns the shape. The
split matters because the dashboard and the analytics view share most of their
aggregates but assemble them differently - duplicating the queries to serve two
payloads is how they drift apart.

Zero is a valid result and is returned as zero. A placeholder count when a
query comes back empty is the `|| 3` / `|| 18` fallback pattern being removed
from the frontend, and re-creating it server-side would be worse: the frontend
could no longer tell invented data from real data.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from core.logger import get_logger
from repositories.activity_repository import ActivityRepository
from repositories.analytics_repository import AnalyticsRepository
from settings import load_settings_pack

logger = get_logger(__name__)

# Which vendor statuses roll up into each headline metric.
PENDING_STATUSES = ("Profile Submitted", "Doc Review", "Pending Review")
IN_REVIEW_STATUSES = ("In Review",)


class AnalyticsService:
    def __init__(self, analytics: AnalyticsRepository, activity: ActivityRepository) -> None:
        self._analytics = analytics
        self._activity = activity

    async def dashboard_aggregate(self, *, recent_limit: int = 8) -> dict[str, Any]:
        """Metrics, trend, funnel, priority queue, recent activity, approval rate.

        Sequential rather than gathered: these share one `AsyncSession`, and a
        session is not safe for concurrent use - `asyncio.gather` over the same
        session raises `InterfaceError: another operation is in progress`. The
        queries are indexed and cheap; correctness beats a few milliseconds.
        """
        counts = await self._analytics.status_counts()
        pipeline = await self._analytics.pipeline()
        trend = await self._analytics.approval_trend(range_key="30d")
        queue = await self._analytics.priority_queue(limit=recent_limit)
        approval_rates = await self._analytics.approval_rate_by_country()
        recent = await self._activity.list_recent(limit=recent_limit)

        return {
            "metrics": {
                "pending_vendors": sum(counts.get(status, 0) for status in PENDING_STATUSES),
                "in_review": sum(counts.get(status, 0) for status in IN_REVIEW_STATUSES),
                "approved": counts.get("Approved", 0),
                "rejected": counts.get("Rejected", 0),
            },
            "approval_trend": trend,
            "pipeline": pipeline,
            "priority_queue": [self._with_sla(item) for item in queue],
            "recent_activity": [
                {
                    "id": str(entry.id),
                    "vendor_id": str(entry.vendor_id) if entry.vendor_id else None,
                    "actor": entry.actor,
                    "action": entry.action,
                    "reason": entry.reason,
                    "created_at": entry.created_at,
                }
                for entry in recent
            ],
            "approval_rate_by_country": approval_rates,
            "generated_at": datetime.now(UTC),
        }

    async def analytics_view(self, *, range_key: str = "30d") -> dict[str, Any]:
        return {
            "range": range_key,
            "approval_trend": await self._analytics.approval_trend(range_key=range_key),
            "country_distribution": await self._analytics.country_distribution(),
            "approval_rate_by_country": await self._analytics.approval_rate_by_country(),
            "cycle_times": await self._analytics.cycle_times(range_key=range_key),
            "avg_review_days": await self._analytics.average_review_days(range_key=range_key),
            "high_risk_ratio": await self._analytics.high_risk_ratio(),
            "generated_at": datetime.now(UTC),
        }

    def _with_sla(self, item: dict[str, Any]) -> dict[str, Any]:
        """Annotate a queue row with its SLA position.

        Windows come from `settings/sla.json` (spec §13) so they are tunable
        without a redeploy. A vendor with no submission date has no clock
        running, so the fields stay null rather than defaulting to breached.
        """
        sla = load_settings_pack().get("sla", {}).get("review_sla_hours", {})
        priority = str(item.get("priority") or "")
        # Priorities are stored as "P1 - High"; the JSON keys on the code.
        window_hours = sla.get(priority.split(" ")[0]) if priority else None
        submitted = item.get("submission_date")

        remaining: float | None = None
        breached = False
        if window_hours and isinstance(submitted, datetime):
            elapsed = (datetime.now(UTC) - submitted).total_seconds() / 3600.0
            remaining = round(float(window_hours) - elapsed, 1)
            breached = remaining < 0

        return {
            "vendor_id": item["vendor_id"],
            "company_name": item["company_name"],
            "assigned_vendor_executive": item.get("assigned_vendor_executive"),
            "issue": item.get("status") or "Awaiting review",
            "priority": item.get("priority"),
            "risk_level": item.get("risk_level"),
            "sla_hours_remaining": remaining,
            "sla_breached": breached,
        }


__all__ = ["AnalyticsService", "asyncio"]

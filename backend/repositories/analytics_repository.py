"""Aggregate queries for the dashboard and analytics views (spec §8).

These are genuine server-side aggregates. An approval trend over time cannot be
derived from a page of vendors in the browser, which is why it belongs here and
not in the frontend.

Grouping and date truncation happen in Postgres rather than in Python: pulling
every row back to bucket it in the application would transfer the whole table
to compute a dozen numbers.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.orm import ApprovalHistory, Vendor, VendorDocument

# Statuses that mean "a human still has to look at this" — the pipeline funnel
# and the priority queue both key off this ordering.
PIPELINE_STAGES = (
    "Invited",
    "Profile Submitted",
    "Doc Review",
    "Pending Review",
    "In Review",
    "Approved",
    "Rejected",
)
OPEN_STATUSES = ("Profile Submitted", "Doc Review", "Pending Review", "In Review")
RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}


class AnalyticsRepository:
    """Not a `BaseRepository`: it owns no table, only cross-table aggregates."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def window_start(range_key: str, *, now: datetime | None = None) -> datetime:
        moment = now or datetime.now(UTC)
        return moment - timedelta(days=RANGE_DAYS.get(range_key, 30))

    async def status_counts(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Vendor.status, func.count()).group_by(Vendor.status)
        )
        return {status: int(count) for status, count in result.all()}

    async def pipeline(self) -> list[dict[str, Any]]:
        """Funnel counts in stage order, including stages with zero vendors.

        Zero is a real answer and is rendered as one. Dropping empty stages
        would make the funnel silently change shape as data moves through it.
        """
        counts = await self.status_counts()
        return [{"stage": stage, "count": counts.get(stage, 0)} for stage in PIPELINE_STAGES]

    async def approval_trend(self, *, range_key: str = "30d") -> list[dict[str, Any]]:
        """Daily approvals, rejections and submissions over the window."""
        start = self.window_start(range_key)
        day = func.date_trunc("day", ApprovalHistory.decided_at).label("period")
        decisions = await self.session.execute(
            select(
                day,
                func.count(case((ApprovalHistory.decision == "approved", 1))).label("approvals"),
                func.count(case((ApprovalHistory.decision == "rejected", 1))).label("rejections"),
            )
            .where(ApprovalHistory.decided_at >= start)
            .group_by(day)
            .order_by(day)
        )
        submissions_day = func.date_trunc("day", Vendor.submission_date).label("period")
        submissions = await self.session.execute(
            select(submissions_day, func.count().label("submissions"))
            .where(Vendor.submission_date >= start)
            .group_by(submissions_day)
            .order_by(submissions_day)
        )

        buckets: dict[date, dict[str, Any]] = {}

        def bucket(period: datetime) -> dict[str, Any]:
            key = period.date()
            return buckets.setdefault(
                key,
                {"period": key, "label": key.isoformat(), "approvals": 0,
                 "rejections": 0, "submissions": 0},
            )

        for period, approvals, rejections in decisions.all():
            entry = bucket(period)
            entry["approvals"] = int(approvals)
            entry["rejections"] = int(rejections)
        for period, count in submissions.all():
            bucket(period)["submissions"] = int(count)

        return [buckets[key] for key in sorted(buckets)]

    async def approval_rate_by_country(self, *, minimum_sample: int = 1) -> list[dict[str, Any]]:
        """Share of decided vendors that were approved, per country.

        The denominator is *decided* vendors, not all vendors: counting
        in-flight vendors as unapproved would make the rate drift downward
        purely because new applications arrived.
        """
        decided = case((Vendor.status.in_(("Approved", "Rejected")), 1))
        approved = case((Vendor.status == "Approved", 1))
        result = await self.session.execute(
            select(
                Vendor.country,
                func.count(approved).label("approved"),
                func.count(decided).label("decided"),
            )
            .where(Vendor.country.is_not(None))
            .group_by(Vendor.country)
            .having(func.count(decided) >= minimum_sample)
            .order_by(func.count(decided).desc())
        )
        return [
            {
                "country": country,
                "percentage": round(100.0 * int(approved_count) / int(decided_count), 1),
                "sample_size": int(decided_count),
            }
            for country, approved_count, decided_count in result.all()
            if int(decided_count) > 0
        ]

    async def country_distribution(self) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(Vendor.country, func.count())
            .where(Vendor.country.is_not(None))
            .group_by(Vendor.country)
            .order_by(func.count().desc())
        )
        rows = [(country, int(count)) for country, count in result.all()]
        total = sum(count for _, count in rows)
        return [
            {
                "country": country,
                "count": count,
                "percentage": round(100.0 * count / total, 1) if total else 0.0,
            }
            for country, count in rows
        ]

    async def priority_queue(self, *, limit: int = 10) -> list[dict[str, Any]]:
        """Open vendors most in need of attention.

        Ordered by risk score then age, so the queue answers "what should I
        look at next", not "what arrived most recently".
        """
        result = await self.session.execute(
            select(Vendor)
            .where(Vendor.status.in_(OPEN_STATUSES))
            .order_by(
                Vendor.risk_score.desc().nullslast(),
                Vendor.submission_date.asc().nullslast(),
            )
            .limit(limit)
        )
        return [
            {
                "vendor_id": str(vendor.id),
                "company_name": vendor.company_name,
                "assigned_vendor_executive": vendor.assigned_vendor_executive,
                "priority": vendor.priority,
                "risk_level": vendor.risk_level,
                "status": vendor.status,
                "submission_date": vendor.submission_date,
            }
            for vendor in result.scalars().all()
        ]

    async def cycle_times(self, *, range_key: str = "30d") -> list[dict[str, Any]]:
        """Median and p90 hours from submission to decision.

        `percentile_cont` in Postgres rather than sorting in Python: the
        percentile is computed where the rows already are.
        """
        start = self.window_start(range_key)
        hours = cast(
            func.extract("epoch", ApprovalHistory.decided_at - Vendor.submission_date) / 3600.0,
            Float,
        )
        result = await self.session.execute(
            select(
                ApprovalHistory.decision,
                func.percentile_cont(0.5).within_group(hours).label("median_hours"),
                func.percentile_cont(0.9).within_group(hours).label("p90_hours"),
                func.count().label("sample_size"),
            )
            .join(Vendor, Vendor.id == ApprovalHistory.vendor_id)
            .where(
                ApprovalHistory.decided_at >= start,
                Vendor.submission_date.is_not(None),
            )
            .group_by(ApprovalHistory.decision)
        )
        return [
            {
                "stage": str(decision).replace("_", " ").title(),
                "median_hours": round(float(median or 0.0), 1),
                "p90_hours": round(float(p90 or 0.0), 1),
                "sample_size": int(sample),
            }
            for decision, median, p90, sample in result.all()
        ]

    async def average_review_days(self, *, range_key: str = "30d") -> float | None:
        start = self.window_start(range_key)
        result = await self.session.execute(
            select(
                func.avg(
                    func.extract(
                        "epoch", ApprovalHistory.decided_at - Vendor.submission_date
                    )
                    / 86400.0
                )
            )
            .join(Vendor, Vendor.id == ApprovalHistory.vendor_id)
            .where(
                ApprovalHistory.decided_at >= start,
                Vendor.submission_date.is_not(None),
            )
        )
        value = result.scalar_one_or_none()
        return round(float(value), 2) if value is not None else None

    async def high_risk_ratio(self) -> float | None:
        """Percentage of scored vendors in the High band.

        None when nothing has been scored yet — an unscored portfolio is not a
        0% high-risk portfolio, and reporting it as one would be a lie the
        dashboard cannot distinguish from good news.
        """
        result = await self.session.execute(
            select(
                func.count(case((Vendor.risk_level == "High", 1))),
                func.count(Vendor.risk_level),
            )
        )
        high, scored = result.one()
        if not scored:
            return None
        return round(100.0 * int(high) / int(scored), 1)

    async def document_status_counts(self) -> dict[str, int]:
        result = await self.session.execute(
            select(VendorDocument.status, func.count()).group_by(VendorDocument.status)
        )
        return {status: int(count) for status, count in result.all()}

"""Dashboard contract (spec §8).

One composite payload: metrics, approval trend, pipeline funnel, priority
queue, recent activity, China approval rate. Deliberately a single endpoint
rather than six - the page renders as a unit, and six parallel requests would
only add latency and six independent loading states.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import Field

from core.response import CamelModel
from schemas.common import Priority, RiskLevel


class DashboardMetrics(CamelModel):
    pending_vendors: int = Field(ge=0)
    in_review: int = Field(ge=0)
    approved: int = Field(ge=0)
    rejected: int = Field(ge=0)


class TrendPoint(CamelModel):
    period: date
    label: str
    approvals: int = Field(ge=0)
    rejections: int = Field(ge=0)
    submissions: int = Field(ge=0)


class PipelineStage(CamelModel):
    stage: str
    count: int = Field(ge=0)


class PriorityQueueItem(CamelModel):
    vendor_id: str
    company_name: str
    assigned_vendor_executive: str | None = None
    issue: str
    priority: Priority | None = None
    risk_level: RiskLevel | None = None
    sla_hours_remaining: float | None = None
    sla_breached: bool = False


class RecentActivityItem(CamelModel):
    id: str
    vendor_id: str | None = None
    actor: str
    action: str
    target: str | None = None
    reason: str | None = None
    created_at: datetime


class CountryApprovalRate(CamelModel):
    country: str
    percentage: float = Field(ge=0, le=100)
    sample_size: int = Field(ge=0)


class DashboardPayload(CamelModel):
    metrics: DashboardMetrics
    approval_trend: list[TrendPoint] = Field(default_factory=list)
    pipeline: list[PipelineStage] = Field(default_factory=list)
    priority_queue: list[PriorityQueueItem] = Field(default_factory=list)
    recent_activity: list[RecentActivityItem] = Field(default_factory=list)
    approval_rate_by_country: list[CountryApprovalRate] = Field(default_factory=list)
    generated_at: datetime

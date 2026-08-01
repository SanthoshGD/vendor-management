"""Analytics contracts (spec §8 `/api/v1/analytics`)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field

from core.response import CamelModel
from schemas.dashboard import CountryApprovalRate, TrendPoint


class TimeRange(str, Enum):
    d7 = "7d"
    d30 = "30d"
    d90 = "90d"
    d365 = "365d"


class CountryStat(CamelModel):
    country: str
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class CycleTimeStat(CamelModel):
    stage: str
    median_hours: float = Field(ge=0)
    p90_hours: float = Field(ge=0)
    sample_size: int = Field(ge=0)


class AnalyticsPayload(CamelModel):
    range: TimeRange
    approval_trend: list[TrendPoint] = Field(default_factory=list)
    country_distribution: list[CountryStat] = Field(default_factory=list)
    approval_rate_by_country: list[CountryApprovalRate] = Field(default_factory=list)
    cycle_times: list[CycleTimeStat] = Field(default_factory=list)
    avg_review_days: float | None = None
    high_risk_ratio: float | None = Field(default=None, ge=0, le=100)
    generated_at: datetime

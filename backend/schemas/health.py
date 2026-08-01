"""Health and readiness payloads."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from core.response import CamelModel


class HealthStatus(str, Enum):
    ok = "ok"
    degraded = "degraded"
    unavailable = "unavailable"


class DependencyHealth(CamelModel):
    name: str
    status: HealthStatus
    detail: str | None = None


class HealthPayload(CamelModel):
    """Liveness: is this process running?"""

    status: HealthStatus
    service: str
    version: str
    environment: str
    timestamp: datetime


class ReadinessPayload(HealthPayload):
    """Readiness: can this process serve traffic?"""

    dependencies: list[DependencyHealth]

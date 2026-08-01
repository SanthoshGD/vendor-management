"""Health endpoints.

Mounted at the root, outside `/api/v1`: an orchestrator's probe target must not
move when the API version changes.

These are the only routes that return their payload outside the spec §8
envelope — probes are consumed by Railway and load balancers, not by the
frontend, and they expect a flat body.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request, Response, status

from core.config import get_settings
from schemas.health import (
    DependencyHealth,
    HealthPayload,
    HealthStatus,
    ReadinessPayload,
)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthPayload,
    summary="Liveness probe",
    description=(
        "200 while the process is running. Touches no dependency, so a database "
        "outage can never cause a Railway restart loop. This is the "
        "`healthcheckPath` in railway.json."
    ),
)
async def health() -> HealthPayload:
    settings = get_settings()
    return HealthPayload(
        status=HealthStatus.ok,
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        timestamp=datetime.now(UTC),
    )


@router.get(
    "/health/ready",
    response_model=ReadinessPayload,
    summary="Readiness probe",
    responses={503: {"description": "A required dependency is unavailable."}},
    description=(
        "Per-dependency status. Returns 503 when a required dependency is down "
        "so a load balancer stops routing here. In development a missing "
        "Supabase is `degraded` but still ready, so the API stays explorable."
    ),
)
async def readiness(request: Request, response: Response) -> ReadinessPayload:
    settings = get_settings()
    provider = request.app.state.supabase

    if provider.is_connected:
        db_status, db_detail = HealthStatus.ok, None
    elif settings.environment == "development":
        db_status = HealthStatus.degraded
        db_detail = provider.connect_error or "not configured (development)"
    else:
        db_status = HealthStatus.unavailable
        db_detail = provider.connect_error or "not configured"

    problems = settings.validate_runtime()
    dependencies = [
        DependencyHealth(name="supabase", status=db_status, detail=db_detail),
        DependencyHealth(
            name="configuration",
            status=HealthStatus.ok if not problems else HealthStatus.degraded,
            detail="; ".join(problems) or None,
        ),
    ]

    is_ready = not any(d.status is HealthStatus.unavailable for d in dependencies)
    if not is_ready:
        overall = HealthStatus.unavailable
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif any(d.status is HealthStatus.degraded for d in dependencies):
        overall = HealthStatus.degraded
    else:
        overall = HealthStatus.ok

    return ReadinessPayload(
        status=overall,
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        timestamp=datetime.now(UTC),
        dependencies=dependencies,
    )

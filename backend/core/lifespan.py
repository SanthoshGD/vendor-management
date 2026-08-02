"""Application lifespan.

Owns process-wide resources: the SQLAlchemy engine, the Supabase client used
for Storage and Auth, the editable settings pack (spec §13), and configuration
validation.

Neither connection failing is fatal outside production. The API must still boot
and serve `/health` so a Railway deploy reports *why* it is unhealthy instead of
crash-looping with no diagnostics; data routes answer 503 until the dependency
is back.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.config import get_settings
from core.logger import get_logger
from core.supabase import SupabaseClientProvider
from db.session import DatabaseProvider
from settings import load_settings_pack

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()

    problems = settings.validate_runtime()
    for problem in problems:
        logger.error("config_invalid: %s", problem)
    if problems and settings.is_production:
        # Fail fast rather than serve a misconfigured production process.
        raise RuntimeError(f"Invalid configuration: {'; '.join(problems)}")

    if settings.auth_bypass_active:
        logger.warning(
            "dev_auth_bypass_enabled: every request resolves to a synthetic admin. "
            "Development only."
        )

    database = DatabaseProvider(settings)
    await database.connect()

    supabase = SupabaseClientProvider(settings)
    await supabase.connect()

    app.state.settings = settings
    app.state.database = database
    app.state.supabase = supabase
    app.state.settings_pack = load_settings_pack()

    # Register event listeners (spec §9)
    from events import bus
    from events.vendor_approved import EVENT_NAME as APPROVED_EVENT, on_embed_decision as on_app_embed, on_notify as on_app_notify
    from events.vendor_rejected import EVENT_NAME as REJECTED_EVENT, on_embed_decision as on_rej_embed, on_notify as on_rej_notify

    bus.subscribe(APPROVED_EVENT, on_app_notify)
    bus.subscribe(APPROVED_EVENT, on_app_embed)
    bus.subscribe(REJECTED_EVENT, on_rej_notify)
    bus.subscribe(REJECTED_EVENT, on_rej_embed)

    logger.info(
        "application_started",
        extra={
            "environment": settings.environment,
            "database_connected": database.is_connected,
            "supabase_configured": settings.supabase_configured,
            "version": settings.app_version,
        },
    )

    try:
        yield
    finally:
        # Reverse order of acquisition, so the engine's pooled connections are
        # returned before anything else it might depend on goes away.
        await supabase.disconnect()
        await database.disconnect()
        logger.info("application_stopped")

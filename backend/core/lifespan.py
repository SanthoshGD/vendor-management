"""Application lifespan.

Owns process-wide resources: the Supabase client, the editable settings pack
(spec §13), and configuration validation.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.config import get_settings
from core.logger import get_logger
from core.supabase import SupabaseClientProvider
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

    provider = SupabaseClientProvider(settings)
    await provider.connect()

    app.state.settings = settings
    app.state.supabase = provider
    app.state.settings_pack = load_settings_pack()

    logger.info(
        "application_started",
        extra={
            "environment": settings.environment,
            "supabase_configured": settings.supabase_configured,
            "version": settings.app_version,
        },
    )

    try:
        yield
    finally:
        await provider.disconnect()
        logger.info("application_stopped")

"""Supabase async client provider (spec §2).

`supabase-py` rather than SQLAlchemy, per the plan: Supabase already provides
auth-aware queries, storage and RLS-friendly access, so an ORM in between only
duplicates it. Where a query genuinely needs raw SQL, call Postgres directly
rather than reaching for an ORM.

One client per process - `AsyncClient` wraps a long-lived `httpx.AsyncClient`,
so creating one per request would leak connections and defeat pooling.

Deliberately non-fatal when unconfigured: the API must still boot and serve
`/health` so a Railway deploy reports *why* it is unhealthy instead of
crash-looping with no diagnostics.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from core.config import Settings
from core.exceptions import ServiceUnavailableError
from core.logger import get_logger

if TYPE_CHECKING:  # pragma: no cover - typing only
    from supabase import AsyncClient

logger = get_logger(__name__)


class SupabaseClientProvider:
    """Owns the process-wide `AsyncClient` lifecycle."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncClient | None = None
        self._connect_error: str | None = None

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    @property
    def connect_error(self) -> str | None:
        return self._connect_error

    async def connect(self) -> None:
        """Create the client if credentials are present. Never raises."""
        if not self._settings.supabase_configured:
            self._connect_error = "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured"
            logger.warning("supabase_not_configured: running without a database")
            return

        try:
            from supabase import acreate_client

            self._client = await acreate_client(
                self._settings.supabase_url,  # type: ignore[arg-type]
                self._settings.supabase_service_role_key,  # type: ignore[arg-type]
            )
            self._connect_error = None
            logger.info("supabase_connected")
        except Exception as exc:  # noqa: BLE001 - deliberate: boot must not fail here
            self._client = None
            self._connect_error = f"{type(exc).__name__}: {exc}"
            logger.error("supabase_connect_failed: %s", self._connect_error)

    async def disconnect(self) -> None:
        self._client = None
        logger.info("supabase_disconnected")

    def get_client(self) -> AsyncClient:
        """Return the client or refuse the request with a 503."""
        if self._client is None:
            raise ServiceUnavailableError(
                "The database is not available.",
                detail=self._connect_error,
            )
        return self._client

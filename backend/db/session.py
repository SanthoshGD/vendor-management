"""Engine and session lifecycle.

One engine per process, created in the lifespan and disposed on shutdown. A
`AsyncSession` is created per request by `api.deps.get_session`, which commits
on success and rolls back on any exception - so a route that raises never
leaves a half-applied mutation behind.

Deliberately non-fatal when unconfigured, matching `core/supabase.py`: the API
still boots and serves `/health` so a Railway deploy reports *why* it is
unhealthy instead of crash-looping with no diagnostics. Data routes answer 503.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import Settings
from core.exceptions import ServiceUnavailableError
from core.logger import get_logger

logger = get_logger(__name__)

# libpq query parameters that asyncpg does not understand. Supabase hands out
# connection strings containing `sslmode=require`; passing it through raises
# `TypeError: connect() got an unexpected keyword argument 'sslmode'` at the
# first connection rather than at startup, which is a miserable way to find out.
_LIBPQ_ONLY_PARAMS = {"sslmode", "sslrootcert", "sslcert", "sslkey", "target_session_attrs"}


def normalise_database_url(url: str) -> tuple[str, dict[str, object]]:
    """Return an asyncpg-compatible URL plus the connect args it implies.

    Accepts the connection string Supabase displays verbatim, so nobody has to
    remember to rewrite the scheme or strip `sslmode` by hand.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql", "postgresql+psycopg2"):
        scheme = "postgresql+asyncpg"

    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    ssl_mode = query.pop("sslmode", None)
    for key in _LIBPQ_ONLY_PARAMS:
        query.pop(key, None)

    connect_args: dict[str, object] = {}
    if ssl_mode in ("require", "verify-ca", "verify-full"):
        connect_args["ssl"] = True
    elif ssl_mode == "disable":
        connect_args["ssl"] = False

    normalised = urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return normalised, connect_args


class DatabaseProvider:
    """Owns the process-wide engine and session factory."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._engine: AsyncEngine | None = None
        self._sessionmaker: async_sessionmaker[AsyncSession] | None = None
        self._connect_error: str | None = None

    @property
    def is_connected(self) -> bool:
        return self._sessionmaker is not None

    @property
    def connect_error(self) -> str | None:
        return self._connect_error

    @property
    def engine(self) -> AsyncEngine | None:
        return self._engine

    async def connect(self) -> None:
        """Create the engine and verify it can reach Postgres. Never raises."""
        if not self._settings.database_url:
            self._connect_error = "DATABASE_URL is not configured"
            logger.warning("database_not_configured: running without a relational database")
            return

        url, connect_args = normalise_database_url(self._settings.database_url)
        try:
            self._engine = create_async_engine(
                url,
                echo=self._settings.db_echo,
                pool_size=self._settings.db_pool_size,
                max_overflow=self._settings.db_max_overflow,
                pool_timeout=self._settings.db_pool_timeout,
                # Supabase's pooler drops idle connections; recycling below that
                # window turns a would-be `ConnectionDoesNotExistError` on the
                # first query after a quiet period into a no-op.
                pool_recycle=self._settings.db_pool_recycle,
                pool_pre_ping=True,
                connect_args=connect_args,
            )
            async with self._engine.connect() as connection:
                await connection.execute(text("SELECT 1"))

            self._sessionmaker = async_sessionmaker(
                bind=self._engine,
                expire_on_commit=False,  # response models read attributes after commit
                autoflush=False,
            )
            self._connect_error = None
            logger.info("database_connected")
        except Exception as exc:  # noqa: BLE001 - deliberate: boot must not fail here
            await self._dispose_engine()
            self._connect_error = f"{type(exc).__name__}: {exc}"
            logger.error("database_connect_failed: %s", self._connect_error)

    async def disconnect(self) -> None:
        await self._dispose_engine()
        logger.info("database_disconnected")

    async def _dispose_engine(self) -> None:
        self._sessionmaker = None
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None

    def get_sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        """Return the factory, or refuse the request with a clean 503."""
        if self._sessionmaker is None:
            raise ServiceUnavailableError(
                "The database is not available.",
                detail=self._connect_error,
            )
        return self._sessionmaker

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """Transactional scope for callers outside the request cycle.

        Used by workers and scripts. Request handlers get their session from
        `api.deps.get_session` instead, so FastAPI owns the teardown ordering.
        """
        factory = self.get_sessionmaker()
        session = factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

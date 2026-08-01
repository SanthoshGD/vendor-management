"""Base repository (spec §3).

The repository layer is the ONLY layer that talks to Supabase. No Supabase call
ever happens inside a router — that is what makes the layer worth having:
swapping Supabase, or adding caching, touches one file per entity instead of
every route.

Repositories return plain dicts. Mapping to Pydantic response schemas is the
router/service boundary's job.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar

from core.logger import get_logger
from core.supabase import SupabaseClientProvider

if TYPE_CHECKING:  # pragma: no cover - typing only
    from supabase import AsyncClient

logger = get_logger(__name__)


class BaseRepository:
    table: ClassVar[str] = ""

    def __init__(self, provider: SupabaseClientProvider) -> None:
        self._provider = provider

    @property
    def client(self) -> AsyncClient:
        # Resolved per operation, not cached on the instance, so a reconnect
        # (or a not-yet-configured database) surfaces as a clean 503 on the
        # next call rather than a stale handle.
        return self._provider.get_client()

    def _table(self) -> Any:
        if not self.table:
            raise NotImplementedError(f"{type(self).__name__} must declare `table`.")
        return self.client.table(self.table)

    async def get_by_id(self, entity_id: str) -> dict[str, Any]:
        raise NotImplementedError

    async def list(
        self,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 25,
        offset: int = 0,
        order_by: str | None = None,
        descending: bool = True,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return `(rows, total_count)`."""
        raise NotImplementedError

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    async def update(self, entity_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    async def delete(self, entity_id: str) -> None:
        raise NotImplementedError

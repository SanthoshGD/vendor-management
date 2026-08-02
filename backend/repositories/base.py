"""Base repository (spec §3).

The repository layer is the only layer that touches the database. No query ever
happens inside a router - that is what makes the layer worth having: adding
caching, or changing how a table is reached, touches one file per entity
instead of every route.

Repositories return ORM instances. Mapping to Pydantic response schemas is the
router boundary's job, so a new column does not leak into the wire contract for
free.

**Transactions belong to the caller, not to the repository.** No method here
commits. `api.deps.get_session` commits once, after the handler returns, so
spec §11's requirement - that a status mutation, its `approval_history` row and
its `activity_log` row all land together - holds by construction rather than by
every route remembering to arrange it.
"""

from __future__ import annotations

from typing import Any, ClassVar, Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError, ValidationFailure
from core.logger import get_logger
from db.base import Base

logger = get_logger(__name__)

ModelT = TypeVar("ModelT", bound=Base)


def parse_uuid(value: str | UUID, *, field: str = "id") -> UUID:
    """Coerce a path parameter to a UUID.

    A malformed id is a 422 - not a 500, and not a 404: the client sent
    something that could never identify a row, and "not found" would imply it
    might have.
    """
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValidationFailure(f"{field} must be a UUID.", detail=str(value)) from exc


class BaseRepository(Generic[ModelT]):
    model: ClassVar[type[Any]]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- reads --------------------------------------------------------------

    async def get(self, entity_id: str | UUID) -> ModelT | None:
        return await self.session.get(self.model, parse_uuid(entity_id))

    async def get_or_404(self, entity_id: str | UUID) -> ModelT:
        entity = await self.get(entity_id)
        if entity is None:
            raise NotFoundError(f"{self.model.__name__} {entity_id} does not exist.")
        return entity

    async def count(self, statement: Select[Any]) -> int:
        """Count the rows a statement would return.

        Derived from the statement's own WHERE clause rather than a
        hand-written parallel query, so a filter can never be applied to the
        page but forgotten in the total.
        """
        subquery = statement.order_by(None).limit(None).offset(None).subquery()
        result = await self.session.execute(select(func.count()).select_from(subquery))
        return int(result.scalar_one())

    async def paginate(
        self,
        statement: Select[Any],
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        """Return `(rows, total)` for one page."""
        total = await self.count(statement)
        result = await self.session.execute(statement.limit(limit).offset(offset))
        return list(result.scalars().unique().all()), total

    # --- writes -------------------------------------------------------------

    async def add(self, entity: ModelT) -> ModelT:
        """Stage an insert and populate server-generated columns.

        `flush`, not `commit`. The row becomes visible to the rest of this
        transaction - so a follow-up audit write can reference its id - while
        staying rollback-able if anything later in the handler fails.
        """
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def apply(self, entity: ModelT, values: dict[str, Any]) -> ModelT:
        """Assign supplied values and flush.

        `None` means "not supplied" in a PATCH body. A route that genuinely
        needs to null a column assigns it directly rather than going through
        here.
        """
        for key, value in values.items():
            if value is not None:
                setattr(entity, key, value)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def remove(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.flush()

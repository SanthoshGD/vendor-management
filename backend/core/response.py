"""Standard response envelope (spec §8).

Every endpoint returns the same shape so the frontend can handle success and
error generically:

    { "success": bool, "data": {}, "message": "", "errors": [], "meta": {} }

Implemented once here and used by every router - per the spec, "not something
each route reinvents". Spec §14 calls this out as trivial to start with and
painful to retrofit, which is why it exists before any business logic does.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(word.capitalize() for word in tail)


class CamelModel(BaseModel):
    """snake_case in Python, camelCase on the wire.

    `types/*.ts` are camelCase and remain the source of truth for shape
    (spec §3), so an alias generator means `services/api.ts` needs zero
    response transformation.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ErrorItem(CamelModel):
    code: str
    message: str
    field: str | None = None


from core.logger import request_id_ctx

class ResponseMeta(CamelModel):
    request_id: str | None = Field(default_factory=lambda: request_id_ctx.get(None))
    page: int | None = None
    page_size: int | None = None
    total: int | None = None
    total_pages: int | None = None


class ApiResponse(CamelModel, Generic[T]):
    """The envelope. `data` is None on failure, `errors` is empty on success."""

    success: bool = True
    data: T | None = None
    message: str = ""
    errors: list[ErrorItem] = Field(default_factory=list)
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


def ok(
    data: T | None = None,
    *,
    message: str = "",
    meta: ResponseMeta | None = None,
) -> ApiResponse[T]:
    """Build a success envelope."""
    return ApiResponse[T](
        success=True,
        data=data,
        message=message,
        errors=[],
        meta=meta or ResponseMeta(),
    )


def paginated(
    items: list[Any],
    *,
    page: int,
    page_size: int,
    total: int,
    message: str = "",
) -> ApiResponse[list[Any]]:
    """Success envelope with pagination populated in `meta`."""
    total_pages = (total + page_size - 1) // page_size if page_size else 0
    return ApiResponse[list[Any]](
        success=True,
        data=items,
        message=message,
        errors=[],
        meta=ResponseMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


def failure(
    *,
    message: str,
    errors: list[ErrorItem] | None = None,
    request_id: str | None = None,
) -> ApiResponse[None]:
    """Build a failure envelope.

    `success` is always False here. A failure is never reported as a success -
    the frontend's current `catch { return true }` on approve/reject is exactly
    the bug this shape exists to prevent.
    """
    return ApiResponse[None](
        success=False,
        data=None,
        message=message,
        errors=errors or [],
        meta=ResponseMeta(request_id=request_id),
    )

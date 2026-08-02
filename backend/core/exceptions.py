"""Domain exceptions and their HTTP handlers.

Every failure - domain, validation, framework, or unexpected - is rendered
through the spec §8 envelope with `success: false`. A client parsing responses
only ever has to understand one shape, and a failure can never be mistaken for
a success.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.logger import get_logger, request_id_ctx
from core.response import ErrorItem, failure

logger = get_logger(__name__)

# Starlette renamed HTTP_422_UNPROCESSABLE_ENTITY -> ..._CONTENT and deprecated
# the old name; the literal is version-independent.
HTTP_422_UNPROCESSABLE = 422


class NexusError(Exception):
    """Base for every expected application error."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, *, detail: Any = None) -> None:
        self.message = message or self.message
        self.detail = detail
        super().__init__(self.message)


class NotFoundError(NexusError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "The requested resource does not exist."


class ValidationFailure(NexusError):
    status_code = HTTP_422_UNPROCESSABLE
    code = "validation_error"
    message = "The request payload failed validation."


class ConflictError(NexusError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"
    message = "The request conflicts with the current state of the resource."


class UnauthorizedError(NexusError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"
    message = "Authentication is required."


class ForbiddenError(NexusError):
    """Spec §15: vendor role limited to its own record; admin role portal-wide."""

    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"
    message = "You do not have permission to perform this action."


class AIUnavailableError(NexusError):
    """Spec §6.2: surfaced when the key pool is exhausted.

    The plan is explicit that this must reach the frontend as a clean
    "AI temporarily unavailable", never a raw 500.
    """

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "ai_unavailable"
    message = "AI is temporarily unavailable. Please try again shortly."


class UpstreamError(NexusError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "upstream_error"
    message = "A dependency failed to respond."


class ServiceUnavailableError(NexusError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"
    message = "The service is not ready to handle requests."


def _envelope(
    status_code: int,
    code: str,
    message: str,
    detail: Any = None,
) -> JSONResponse:
    errors = [ErrorItem(code=code, message=message)]
    if isinstance(detail, list):
        for item in detail:
            if isinstance(item, dict):
                loc = item.get("loc") or []
                errors.append(
                    ErrorItem(
                        code=str(item.get("type", code)),
                        message=str(item.get("msg", message)),
                        field=".".join(str(part) for part in loc) or None,
                    )
                )
    body = failure(message=message, errors=errors, request_id=request_id_ctx.get())
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(mode="json", by_alias=True),
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NexusError)
    async def _handle_nexus_error(_: Request, exc: NexusError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error("%s: %s", exc.code, exc.message, exc_info=exc)
        else:
            logger.info("%s: %s", exc.code, exc.message)
        return _envelope(exc.status_code, exc.code, exc.message, exc.detail)

    @app.exception_handler(NotImplementedError)
    async def _handle_not_implemented(request: Request, exc: NotImplementedError) -> JSONResponse:
        # This scaffold ships routers, wiring and seams but no business logic.
        # 501 is the honest answer: the route exists and is correctly wired,
        # the behaviour behind it is not built. Deliberately not a 500 -
        # 500 must mean "something broke", and nothing is broken here.
        logger.info("not_implemented: %s %s", request.method, request.url.path)
        return _envelope(
            status.HTTP_501_NOT_IMPLEMENTED,
            "not_implemented",
            str(exc) or "This endpoint is scaffolded but not yet implemented.",
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        codes = {
            400: "bad_request",
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            405: "method_not_allowed",
            415: "unsupported_media_type",
            429: "rate_limited",
        }
        return _envelope(
            exc.status_code,
            codes.get(exc.status_code, "http_error"),
            str(exc.detail) if exc.detail else "Request could not be completed.",
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _envelope(
            HTTP_422_UNPROCESSABLE,
            "validation_error",
            "The request payload failed validation.",
            exc.errors(),
        )

    @app.exception_handler(PydanticValidationError)
    async def _handle_pydantic_validation(
        _: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        # Defence in depth: a model constraint firing inside a dependency is
        # not a RequestValidationError and would otherwise reach the 500
        # handler. Bad input must never be reported as a server fault.
        logger.warning("model_validation_error: %d error(s)", exc.error_count())
        return _envelope(
            HTTP_422_UNPROCESSABLE,
            "validation_error",
            "A value failed model validation.",
            exc.errors(include_url=False),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error on %s %s", request.method, request.url.path)
        return _envelope(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "An unexpected error occurred.",
        )

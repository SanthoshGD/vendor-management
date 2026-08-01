"""HTTP middleware: request correlation and access logging (spec §17).

Implemented as pure ASGI rather than Starlette's `BaseHTTPMiddleware` on
purpose. `BaseHTTPMiddleware` runs the downstream app in a separate anyio task,
which breaks `ContextVar` propagation — the request id would be invisible to
every log record and error envelope produced downstream, logging `"-"` instead.
Pure ASGI runs in the same task, so the context is shared. It also avoids an
extra task hop and does not interfere with the SSE streaming that spec §7.3
requires for the assistant.
"""

from __future__ import annotations

import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from core.logger import admin_id_ctx, get_logger, request_id_ctx, vendor_id_ctx

logger = get_logger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware:
    """Assigns a request id, echoes it, and logs one access line per request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        inbound = Headers(scope=scope).get(REQUEST_ID_HEADER.lower())
        request_id = inbound or uuid.uuid4().hex
        req_token = request_id_ctx.set(request_id)
        admin_token = admin_id_ctx.set(None)
        vendor_token = vendor_id_ctx.set(None)
        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            # Log before resetting, so the access line carries the ids.
            elapsed_ms = (time.perf_counter() - started) * 1000
            path = scope.get("path", "")
            if not path.startswith("/health"):
                logger.info(
                    "request_completed",
                    extra={
                        "method": scope.get("method", ""),
                        "path": path,
                        "status_code": status_code,
                        "latency_ms": round(elapsed_ms, 2),
                    },
                )
            vendor_id_ctx.reset(vendor_token)
            admin_id_ctx.reset(admin_token)
            request_id_ctx.reset(req_token)

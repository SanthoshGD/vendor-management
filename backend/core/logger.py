"""Structured logging (spec §17).

Every request and AI call logs — structured JSON, never printed — request id,
vendor id, admin id, latency, endpoint, tokens used, which Gemini key served
the call (label only, never the key), and estimated cost. That is what makes
key-rotation and cost problems debuggable after the fact instead of guessed at.
"""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar
from typing import Any

try:  # python-json-logger >= 3.1 moved the module
    from pythonjsonlogger.json import JsonFormatter
except ImportError:  # pragma: no cover - older releases
    from pythonjsonlogger.jsonlogger import JsonFormatter  # type: ignore[no-redef]

from core.config import Settings

# Per-request context, populated by RequestContextMiddleware.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
admin_id_ctx: ContextVar[str | None] = ContextVar("admin_id", default=None)
vendor_id_ctx: ContextVar[str | None] = ContextVar("vendor_id", default=None)

_CONSOLE_FORMAT = "%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s"


class ContextFilter(logging.Filter):
    """Injects request-scoped identifiers into every record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        record.admin_id = admin_id_ctx.get()
        record.vendor_id = vendor_id_ctx.get()
        return True


class NexusJsonFormatter(JsonFormatter):
    def add_fields(
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["request_id"] = getattr(record, "request_id", "-")
        for key in ("admin_id", "vendor_id"):
            value = getattr(record, key, None)
            if value is not None:
                log_record[key] = value
        log_record.pop("levelname", None)


def configure_logging(settings: Settings) -> None:
    """Install handlers on the root logger. Idempotent."""
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(ContextFilter())

    if settings.log_format == "json":
        handler.setFormatter(NexusJsonFormatter("%(asctime)s %(message)s", timestamp=True))
    else:
        handler.setFormatter(logging.Formatter(_CONSOLE_FORMAT))

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level)

    # uvicorn ships its own handlers; drop them so we do not double-log and so
    # access lines pick up the context filter.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_ai_call(
    logger: logging.Logger,
    *,
    operation: str,
    model: str,
    key_label: str,
    tokens_used: int,
    latency_ms: float,
    estimated_cost_usd: float | None = None,
    success: bool = True,
    error: str | None = None,
) -> None:
    """Spec §17: one structured line per AI call.

    `key_label` only — never the key value, and never its last characters here
    (spec §6.3 permits label + last 4 for admin surfaces, not for logs).
    """
    logger.info(
        "ai_call",
        extra={
            "operation": operation,
            "model": model,
            "gemini_key_label": key_label,
            "tokens_used": tokens_used,
            "latency_ms": round(latency_ms, 2),
            "estimated_cost_usd": estimated_cost_usd,
            "ai_success": success,
            "ai_error": error,
        },
    )

"""Worker entrypoint - Railway service #2 (spec §10, §19).

Consumes the job queue so OCR, embedding, notification and risk-recalculation
work never blocks API request latency.

Spec §10: a simple Postgres-backed job table is enough to start; move to Redis
or RQ if throughput demands it. The queue interface is deliberately narrow
(`claim` / `complete` / `fail`) so that swap touches this file only.

Run with: `python -m workers.runner`
"""

from __future__ import annotations

import asyncio
import signal
from typing import Any

from core.config import get_settings
from core.logger import configure_logging, get_logger
from core.supabase import SupabaseClientProvider

logger = get_logger(__name__)

POLL_INTERVAL_SECONDS = 2.0

# Job type -> handler module. Handlers are resolved lazily so the worker does
# not import the whole AI stack just to process a notification.
HANDLERS: dict[str, str] = {
    "ocr": "workers.ocr_worker:handle",
    "embedding": "workers.embedding_worker:handle",
    "notification": "workers.notification_worker:handle",
    "risk_recalc": "workers.risk_recalc_worker:handle",
}


async def claim_job(provider: SupabaseClientProvider) -> dict[str, Any] | None:
    """Atomically claim the next pending job.

    Must be a single atomic statement (`UPDATE ... RETURNING` with
    `FOR UPDATE SKIP LOCKED`), or two workers will process the same job.
    """
    raise NotImplementedError


async def complete_job(provider: SupabaseClientProvider, job_id: str) -> None:
    raise NotImplementedError


async def fail_job(provider: SupabaseClientProvider, job_id: str, error: str) -> None:
    """Record the failure and schedule a retry with backoff."""
    raise NotImplementedError


async def run() -> None:
    settings = get_settings()
    configure_logging(settings)
    provider = SupabaseClientProvider(settings)
    await provider.connect()

    stopping = asyncio.Event()

    def _request_stop(*_: object) -> None:
        logger.info("worker_stop_requested")
        stopping.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, _request_stop)
        except (ValueError, AttributeError):  # pragma: no cover - platform dependent
            pass

    logger.info("worker_started", extra={"handlers": sorted(HANDLERS)})
    try:
        while not stopping.is_set():
            job = await claim_job(provider)
            if job is None:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                continue
            # Dispatch to the registered handler, then complete or fail.
            raise NotImplementedError
    finally:
        await provider.disconnect()
        logger.info("worker_stopped")


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(run())

"""Minimal in-process event bus (spec §9).

Approving a vendor implies a status update, an activity entry, a timeline
update, a notification, a metrics refresh, a toast — and eventually email,
Slack, analytics. Calling all of that inline from `approve()` does not scale as
listeners are added.

Spec §14 marks the full bus as deferrable, so this starts as a dict of event
name -> async handlers. That alone decouples the "9 function calls" problem
without a broker. The upgrade path (Redis / Supabase Realtime / a real queue)
is a swap of this file's internals, because routers only ever call `emit()`.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)

Handler = Callable[[dict[str, Any]], Awaitable[None]]

_handlers: dict[str, list[Handler]] = defaultdict(list)


def subscribe(event_name: str, handler: Handler) -> None:
    _handlers[event_name].append(handler)


def subscribers(event_name: str) -> list[Handler]:
    return list(_handlers.get(event_name, []))


async def emit(event_name: str, payload: dict[str, Any]) -> None:
    """Dispatch to every subscriber.

    Handlers run concurrently and their failures are logged, never propagated:
    a notification handler that fails must not roll back an approval that has
    already been committed and audited.
    """
    handlers = _handlers.get(event_name, [])
    if not handlers:
        logger.debug("event_no_subscribers", extra={"event": event_name})
        return

    results = await asyncio.gather(
        *(handler(payload) for handler in handlers),
        return_exceptions=True,
    )
    for handler, result in zip(handlers, results, strict=True):
        if isinstance(result, Exception):
            logger.error(
                "event_handler_failed",
                extra={"event": event_name, "handler": getattr(handler, "__name__", "?")},
                exc_info=result,
            )

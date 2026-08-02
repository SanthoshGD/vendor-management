"""Retry and backoff policy for AI calls (spec §6.2).

Two different backoffs live in this file and they are not the same thing:

* **Retry delay** - how long the *request* waits before trying the next key.
  Sub-second and tightly capped, because a user is waiting on the other end.
* **Cooldown** - how long a *key* is taken out of the pool after a rate limit.
  Minutes, exponential, capped at ~15 minutes per the plan.

Conflating them produces either a request that hangs for minutes or a key that
is handed straight back to the next caller to be rate-limited again.

Full jitter on the retry delay: without it, a burst of requests that all hit
the same rate limit retries in lockstep and re-creates the burst.
"""

from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta


def retry_delay_seconds(
    attempt: int,
    *,
    base: float,
    maximum: float,
    jitter: bool = True,
) -> float:
    """Delay before rotation attempt `attempt` (0-indexed)."""
    if attempt <= 0:
        return 0.0
    ceiling = min(base * (2 ** (attempt - 1)), maximum)
    if not jitter:
        return ceiling
    # Full jitter (uniform over [0, ceiling]) rather than equal jitter: it
    # spreads a synchronised burst more effectively, and the worst case is
    # still bounded by `maximum`.
    return random.uniform(0.0, ceiling)


def cooldown_until(
    consecutive_failures: int,
    *,
    base_seconds: int,
    max_seconds: int,
    now: datetime | None = None,
) -> datetime:
    """When a rate-limited key becomes eligible again (spec §6.2)."""
    exponent = max(consecutive_failures - 1, 0)
    # Cap the exponent before shifting: 2 ** 1000 is computed exactly by
    # Python's ints and would freeze the process rather than raise.
    seconds = min(base_seconds * (2 ** min(exponent, 16)), max_seconds)
    return (now or datetime.now(UTC)) + timedelta(seconds=seconds)

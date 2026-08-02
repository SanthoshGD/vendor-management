"""Risk recalculation worker (spec §10, §12).

Runs when a new driver-relevant fact lands - a document verified, an insurance
expiry passed, a field corrected by an admin.

Calls the pure `core.risk_engine.calculate` and persists the resulting score,
level and driver decomposition. No AI call happens here: the score is
deterministic by design.
"""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)

JOB_TYPE = "risk_recalc"


async def handle(job: dict[str, Any]) -> None:
    raise NotImplementedError

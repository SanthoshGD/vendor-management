"""OCR / field extraction worker (spec §10).

Flow: upload -> store -> queue job -> [client already has its response]
      -> here: OCR -> extract fields -> persist -> emit DocumentVerified
"""

from __future__ import annotations

from typing import Any

from core.logger import get_logger

logger = get_logger(__name__)

JOB_TYPE = "ocr"


async def handle(job: dict[str, Any]) -> None:
    """Process one extraction job.

    Must be idempotent: a retried job that already produced an extraction
    should overwrite it, not duplicate it.
    """
    raise NotImplementedError

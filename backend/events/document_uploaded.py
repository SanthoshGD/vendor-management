"""`DocumentUploaded` event and its listeners (spec §9, §10).

Emitted immediately after the file lands in Supabase Storage, before any OCR.
The extraction listener queues work rather than doing it — spec §10: uploads
must not block on OCR.
"""

from __future__ import annotations

from typing import Any

EVENT_NAME = "document.uploaded"


async def on_queue_extraction(payload: dict[str, Any]) -> None:
    """Queue the OCR/extraction job for `workers/ocr_worker.py`."""
    raise NotImplementedError

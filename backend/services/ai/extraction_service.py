"""Document OCR and field extraction (spec §5, §18 phase 3).

Produces the *inputs* the deterministic risk engine consumes — extracted field
values and per-field confidence. It never produces a risk score itself; that
separation is what keeps scoring explainable (spec §12).

Synchronous extraction is acceptable for demo volume (spec §14); the worker
path in `workers/ocr_worker.py` is the same call, queued.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from core.logger import get_logger
from services.ai.provider import AIProvider

logger = get_logger(__name__)


@dataclass
class ExtractedField:
    key: str
    label: str
    value: str
    confidence: int  # 0-100; feeds the LOW_AI_CONFIDENCE risk driver


@dataclass
class ExtractionResult:
    doc_type: str
    fields: list[ExtractedField] = field(default_factory=list)
    page_count: int = 0
    language: str | None = None
    warnings: list[str] = field(default_factory=list)


class ExtractionService:
    def __init__(self, provider: AIProvider) -> None:
        self._provider = provider

    def schema_for(self, doc_type: str) -> dict:
        """Target extraction schema, from `settings/document_types.json`."""
        raise NotImplementedError

    async def extract(self, document: bytes, *, doc_type: str) -> ExtractionResult:
        raise NotImplementedError

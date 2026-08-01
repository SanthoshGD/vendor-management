"""Gemini implementation of `AIProvider` (spec §5–6).

This module is the **only** place allowed to import the Gemini SDK or call
`generativelanguage.googleapis.com` (spec §6.2). Everything else depends on the
`AIProvider` Protocol.

On failure it retries against the next eligible key up to
`GEMINI_MAX_KEY_RETRIES` (default 2) before raising `AIUnavailableError`, so
the frontend receives a clean message rather than a raw 500.
"""

from __future__ import annotations

from typing import Any

from core.config import Settings
from core.logger import get_logger
from services.ai.key_rotation import KeyRotationPolicy
from services.ai.provider import AIResponse

logger = get_logger(__name__)


class GeminiProvider:
    """Implements `AIProvider` for Google Gemini."""

    def __init__(self, key_rotation: KeyRotationPolicy, settings: Settings) -> None:
        self._keys = key_rotation
        self._settings = settings

    async def generate(self, prompt: str, **kwargs: Any) -> AIResponse:
        """Chat / assistant completion.

        Streaming for the assistant (spec §7.3, SSE) is a separate method
        rather than a flag, because the caller's response handling differs
        entirely.
        """
        raise NotImplementedError

    async def generate_stream(self, prompt: str, **kwargs: Any):
        """Yield tokens for SSE streaming to `AIComplianceAssistant.tsx`."""
        raise NotImplementedError

    async def embed(self, text: str, **kwargs: Any) -> list[float]:
        """Return a `rag_embedding_dimensions`-length vector."""
        raise NotImplementedError

    async def extract(self, document: bytes, schema: dict, **kwargs: Any) -> dict:
        """OCR + structured field extraction.

        Returns values *and* per-field confidence — the risk engine consumes
        confidence as an input (`LOW_AI_CONFIDENCE`), so it cannot be dropped.
        """
        raise NotImplementedError

    async def _call_with_rotation(self, operation: str, fn: Any) -> Any:
        """Run `fn` against an eligible key, rotating on failure.

        Reports success/failure back to the policy so `used_today`, cooldown
        and disable transitions stay accurate, and emits the spec §17 AI log
        line for every attempt.
        """
        raise NotImplementedError

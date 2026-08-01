"""Low-level Gemini SDK wrapper (spec §6.2).

This module and `gemini_provider.py` are the only places allowed to import the
Gemini SDK or reach `generativelanguage.googleapis.com`. Everything above them
depends on the `AIProvider` Protocol.

Responsibilities stop at the transport boundary: build a client for one key,
issue one call, normalise the result and the failure. It knows nothing about
key selection, retries, quota or cooldown — those belong to `KeyRotationPolicy`
and `GeminiProvider`, and keeping them out of here is what makes each testable
without a network.

The SDK is imported lazily inside the constructor so the process boots, and the
whole test suite runs, on a machine where `google-genai` is absent or where no
key is configured.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

from core.logger import get_logger
from services.ai.errors import GeminiError, classify

logger = get_logger(__name__)


@dataclass
class GeminiResult:
    """One normalised SDK response."""

    text: str = ""
    embedding: list[float] = field(default_factory=list)
    tokens_used: int = 0
    model: str = ""
    finish_reason: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


class GeminiClient:
    """A client bound to exactly one API key.

    One key per instance, deliberately. A client that could switch keys would
    have to know the rotation policy, and the reason rotation is testable is
    that it never touches the SDK.
    """

    def __init__(self, api_key: str, *, timeout_seconds: float = 60.0) -> None:
        if not api_key:
            raise GeminiError("Refusing to build a Gemini client without an API key.")
        self._timeout = timeout_seconds
        try:
            from google import genai
            from google.genai import types as genai_types
        except ImportError as exc:  # pragma: no cover - dependency is declared
            raise GeminiError(
                "The google-genai package is not installed; install it to enable AI features."
            ) from exc

        self._types = genai_types
        try:
            # Timeout is in milliseconds in the SDK's HttpOptions.
            self._client = genai.Client(
                api_key=api_key,
                http_options=genai_types.HttpOptions(timeout=int(timeout_seconds * 1000)),
            )
        except Exception as exc:  # noqa: BLE001 - normalised for the rotation policy
            raise classify(exc) from exc

    async def generate_text(
        self,
        *,
        model: str,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> GeminiResult:
        """One text completion. No prompt construction happens here.

        Prompt assembly, RAG context injection and the copilot system prompt
        belong to `chat_service.py`; this only carries what it is given.
        """
        config = self._types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        response = await self._call(
            self._client.aio.models.generate_content,
            model=model,
            contents=prompt,
            config=config,
        )
        return self._as_result(response, model=model)

    async def embed(self, *, model: str, text: str, dimensions: int | None = None) -> GeminiResult:
        """One embedding vector."""
        config = None
        if dimensions:
            config = self._types.EmbedContentConfig(output_dimensionality=dimensions)
        response = await self._call(
            self._client.aio.models.embed_content,
            model=model,
            contents=text,
            config=config,
        )
        embeddings = getattr(response, "embeddings", None) or []
        values = list(getattr(embeddings[0], "values", []) or []) if embeddings else []
        return GeminiResult(embedding=values, model=model, tokens_used=len(text) // 4)

    async def count_tokens(self, *, model: str, text: str) -> int:
        response = await self._call(
            self._client.aio.models.count_tokens, model=model, contents=text
        )
        return int(getattr(response, "total_tokens", 0) or 0)

    async def _call(self, fn: Any, **kwargs: Any) -> Any:
        """Invoke the SDK, normalising every failure into `GeminiError`.

        The explicit `asyncio.timeout` backs up the SDK's own: a transport that
        hangs without honouring its timeout would otherwise hold a request open
        indefinitely, and the rotation policy would never get the chance to try
        another key.
        """
        try:
            async with asyncio.timeout(self._timeout + 5):
                return await fn(**kwargs)
        except TimeoutError as exc:
            raise GeminiError("Gemini call timed out.", status_code=504) from exc
        except Exception as exc:  # noqa: BLE001 - classified, then re-raised
            raise classify(exc) from exc

    def _as_result(self, response: Any, *, model: str) -> GeminiResult:
        usage = getattr(response, "usage_metadata", None)
        tokens = int(getattr(usage, "total_token_count", 0) or 0) if usage else 0
        candidates = getattr(response, "candidates", None) or []
        finish_reason = str(getattr(candidates[0], "finish_reason", "")) if candidates else None
        return GeminiResult(
            text=getattr(response, "text", "") or "",
            tokens_used=tokens,
            model=model,
            finish_reason=finish_reason or None,
        )

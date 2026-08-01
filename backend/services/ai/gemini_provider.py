"""Gemini implementation of `AIProvider` (spec §5–6).

Together with `gemini_client.py`, the only place allowed to reach
`generativelanguage.googleapis.com`. Everything else depends on the
`AIProvider` Protocol, so swapping in Claude, OpenAI or Azure later means
writing one class rather than editing three services.

`_call_with_rotation` is the load-bearing part: it picks a key, runs the call,
reports the outcome back to the policy, and on a retryable failure moves to the
next eligible key up to `GEMINI_MAX_KEY_RETRIES`. When the pool is exhausted it
raises `AIUnavailableError`, which reaches the frontend as a clean "AI
temporarily unavailable" rather than a raw 500 (spec §6.2).

**Scope.** Infrastructure is complete: client, rotation, retry, quota
accounting and the spec §17 log line. `generate()` and `embed()` are thin
passes through that infrastructure. OCR (`extract`) and chat streaming
(`generate_stream`) are feature work for later phases and raise
`NotImplementedError` rather than pretending.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator, Callable, Coroutine
from typing import Any

from core.config import Settings
from core.exceptions import AIUnavailableError
from core.logger import get_logger, log_ai_call
from services.ai.errors import GeminiError, classify
from services.ai.gemini_client import GeminiClient, GeminiResult
from services.ai.key_rotation import ApiKeyRecord, KeyRotationPolicy
from services.ai.provider import AIResponse
from services.ai.retry import retry_delay_seconds

logger = get_logger(__name__)


class GeminiProvider:
    """Implements `AIProvider` for Google Gemini, behind key rotation."""

    def __init__(self, key_rotation: KeyRotationPolicy, settings: Settings) -> None:
        self._keys = key_rotation
        self._settings = settings

    # --- AIProvider ---------------------------------------------------------

    async def generate(self, prompt: str, **kwargs: Any) -> AIResponse:
        """One text completion through the rotating pool.

        Prompt construction is not this layer's job. RAG context, the copilot
        system prompt and conversation history belong to `chat_service.py`
        (spec §7.3); this carries whatever it is handed.
        """
        model = kwargs.pop("model", None) or self._settings.gemini_chat_model

        async def call(client: GeminiClient) -> GeminiResult:
            return await client.generate_text(
                model=model,
                prompt=prompt,
                system_instruction=kwargs.get("system_instruction"),
                temperature=kwargs.get("temperature"),
                max_output_tokens=kwargs.get("max_output_tokens"),
            )

        result, key, latency_ms = await self._call_with_rotation("generate", model, call)
        return AIResponse(
            text=result.text,
            tokens_used=result.tokens_used,
            model=result.model,
            key_label=key.key_label,
            latency_ms=latency_ms,
            raw={"finish_reason": result.finish_reason},
        )

    async def embed(self, text: str, **kwargs: Any) -> list[float]:
        """Return a `RAG_EMBEDDING_DIMENSIONS`-length vector.

        The dimension is asserted rather than assumed: `rag_chunks.embedding`
        is `vector(768)`, and a vector of the wrong width fails at INSERT with
        a message that points at the database instead of at the model change
        that actually caused it.
        """
        model = kwargs.pop("model", None) or self._settings.gemini_embedding_model
        dimensions = self._settings.rag_embedding_dimensions

        async def call(client: GeminiClient) -> GeminiResult:
            return await client.embed(model=model, text=text, dimensions=dimensions)

        result, _key, _latency = await self._call_with_rotation("embed", model, call)
        if len(result.embedding) != dimensions:
            raise GeminiError(
                f"Embedding model {model} returned {len(result.embedding)} dimensions; "
                f"rag_chunks.embedding is vector({dimensions})."
            )
        return result.embedding

    async def extract(self, document: bytes, schema: dict, **kwargs: Any) -> dict:
        """OCR + structured field extraction.

        Not implemented in this phase. When it lands it must return per-field
        confidence alongside values — the risk engine consumes confidence as an
        input (`LOW_AI_CONFIDENCE`), so it cannot be dropped.
        """
        raise NotImplementedError(
            "Document extraction (OCR) is not implemented yet. The Gemini transport, "
            "key rotation and quota accounting it will run on are complete."
        )

    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncIterator[str]:
        """Token stream for the SSE assistant response (spec §7.3)."""
        raise NotImplementedError(
            "Streaming chat is not implemented yet; the assistant is a later phase."
        )

    # --- health -------------------------------------------------------------

    async def health_check(self) -> dict[str, Any]:
        """Verify the pool end to end: pick a key, call Gemini, report back.

        Uses `count_tokens` — the cheapest call that still proves the key is
        accepted upstream. A check that only read the database would pass with
        a pool full of revoked keys.
        """
        model = self._settings.gemini_chat_model

        async def call(client: GeminiClient) -> GeminiResult:
            tokens = await client.count_tokens(model=model, text="ping")
            return GeminiResult(text="ok", tokens_used=tokens, model=model)

        result, key, latency_ms = await self._call_with_rotation("health_check", model, call)
        return {
            "ok": True,
            "model": result.model,
            "key_label": key.key_label,
            "latency_ms": round(latency_ms, 2),
        }

    # --- rotation core ------------------------------------------------------

    async def _call_with_rotation(
        self,
        operation: str,
        model: str,
        call: Callable[[GeminiClient], Coroutine[Any, Any, GeminiResult]],
    ) -> tuple[GeminiResult, ApiKeyRecord, float]:
        """Run `call` against an eligible key, rotating on retryable failure.

        Reports every outcome back to the policy so `used_today`, cooldown and
        disable transitions stay accurate, and emits the spec §17 AI log line
        for every attempt — including failed ones, which are the attempts worth
        having a record of.
        """
        self._keys.reset_attempt_history()
        attempts = max(self._settings.gemini_max_key_retries, 0) + 1
        last_error: GeminiError | None = None

        for attempt in range(attempts):
            if attempt:
                delay = retry_delay_seconds(
                    attempt,
                    base=self._settings.gemini_retry_base_delay_seconds,
                    maximum=self._settings.gemini_retry_max_delay_seconds,
                )
                if delay:
                    await asyncio.sleep(delay)

            # An exhausted pool raises AIUnavailableError. On the first attempt
            # that is the honest answer; on a later one the earlier failure is
            # the more useful diagnosis, so it is surfaced instead.
            try:
                key = await self._keys.get_key()
            except AIUnavailableError:
                if last_error is not None:
                    raise AIUnavailableError(
                        "Every eligible Gemini key failed for this request."
                    ) from last_error
                raise

            started = time.perf_counter()
            try:
                client = GeminiClient(
                    key.secret or "",
                    timeout_seconds=self._settings.gemini_request_timeout_seconds,
                )
                result = await call(client)
            except Exception as exc:  # noqa: BLE001 - classified immediately below
                error = classify(exc)
                latency_ms = (time.perf_counter() - started) * 1000
                log_ai_call(
                    logger,
                    operation=operation,
                    model=model,
                    key_label=key.key_label,
                    tokens_used=0,
                    latency_ms=latency_ms,
                    success=False,
                    error=str(error),
                )
                await self._keys.report_failure(key.id, error)
                last_error = error

                # A malformed request fails identically on every key. Retrying
                # it burns quota across the pool to produce the same error.
                if error.is_client_error:
                    raise error from exc
                continue

            latency_ms = (time.perf_counter() - started) * 1000
            log_ai_call(
                logger,
                operation=operation,
                model=model,
                key_label=key.key_label,
                tokens_used=result.tokens_used,
                latency_ms=latency_ms,
                success=True,
            )
            await self._keys.report_success(key.id, result.tokens_used)
            return result, key, latency_ms

        raise AIUnavailableError(
            f"Gemini call failed on {attempts} key(s)."
        ) from last_error

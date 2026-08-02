"""Gemini Provider and Key Rotation integration test."""

from __future__ import annotations

import pytest
from core.config import get_settings
from services.ai.gemini_client import GeminiClient


def test_gemini_settings_and_keys_configured() -> None:
    settings = get_settings()
    assert settings.gemini_chat_model in ("gemini-2.0-flash", "gemini-3.6-flash", "gemini-1.5-flash")
    assert settings.gemini_api_keys_seed
    keys = [k.strip() for k in settings.gemini_api_keys_seed.split(",") if k.strip()]
    assert len(keys) > 0


@pytest.mark.asyncio
async def test_gemini_client_instantiation() -> None:
    settings = get_settings()
    keys = [k.strip() for k in (settings.gemini_api_keys_seed or "").split(",") if k.strip()]
    if keys and keys[0]:
        client = GeminiClient(api_key=keys[0], timeout_seconds=12.0)
        assert client is not None


@pytest.mark.asyncio
async def test_gemini_generate_text() -> None:
    settings = get_settings()
    keys = [k.strip() for k in (settings.gemini_api_keys_seed or "").split(",") if k.strip()]
    if not keys or not keys[0]:
        pytest.skip("No Gemini API key seed available")
    
    errors = []
    success = False
    for i, key in enumerate(keys):
        try:
            client = GeminiClient(api_key=key, timeout_seconds=12.0)
            res = await client.generate_text(
                model=settings.gemini_chat_model,
                prompt="Respond with READY",
                max_output_tokens=10,
            )
            if res is not None and getattr(res, "text", None) is not None:
                success = True
                break
        except Exception as exc:
            errors.append(f"Key[{i}] failure: {exc}")

    if not success:
        pytest.fail(f"Gemini API generation failed for all keys. Errors: {errors}")

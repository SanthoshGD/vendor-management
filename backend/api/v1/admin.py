"""Admin routes - Gemini key pool management (spec §6.3, §8).

Admin-only. Lets keys be added or disabled without a redeploy.

No response model here can carry a key value - only `keyLabel` and a masked
suffix. Spec §6.3 forbids logging full keys; returning one over the API would
be strictly worse.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import AdminDep, SupabaseDep
from core.response import ApiResponse
from schemas.admin import (
    CreateGeminiKeyRequest,
    GeminiKeyOut,
    UpdateGeminiKeyRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/gemini-keys",
    response_model=ApiResponse[list[GeminiKeyOut]],
    summary="List the Gemini key pool",
    description="Masked values only - label plus last 4 characters.",
)
async def list_gemini_keys(
    supabase: SupabaseDep, admin: AdminDep
) -> ApiResponse[list[GeminiKeyOut]]:
    raise NotImplementedError


@router.post(
    "/gemini-keys",
    response_model=ApiResponse[GeminiKeyOut],
    summary="Add a key to the pool",
    description="Encrypted with MASTER_ENCRYPTION_KEY before insert (spec §6.2).",
)
async def create_gemini_key(
    payload: CreateGeminiKeyRequest, supabase: SupabaseDep, admin: AdminDep
) -> ApiResponse[GeminiKeyOut]:
    raise NotImplementedError


@router.patch(
    "/gemini-keys/{key_id}",
    response_model=ApiResponse[GeminiKeyOut],
    summary="Enable, disable or reprioritise a key",
)
async def update_gemini_key(
    key_id: str,
    payload: UpdateGeminiKeyRequest,
    supabase: SupabaseDep,
    admin: AdminDep,
) -> ApiResponse[GeminiKeyOut]:
    raise NotImplementedError

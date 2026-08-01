"""Auth routes (spec §8, §15).

Bridges a Supabase Auth session to this backend. Supabase owns identity;
FastAPI validates the JWT and enforces role-based access on every request.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrentUserDep, SettingsDep
from core.response import ApiResponse
from schemas.admin import SessionRequest, SessionResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/session",
    response_model=ApiResponse[SessionResponse],
    summary="Exchange a Supabase access token for a backend session",
    responses={401: {"description": "The token is invalid, expired, or has a bad audience."}},
)
async def create_session(
    payload: SessionRequest, settings: SettingsDep
) -> ApiResponse[SessionResponse]:
    raise NotImplementedError


@router.get(
    "/me",
    response_model=ApiResponse[SessionResponse],
    summary="The current authenticated principal",
    description=(
        "Two roles only — admin and vendor. 'Vendor Executive' is an "
        "assignment field, not a login (spec §15)."
    ),
)
async def get_me(user: CurrentUserDep) -> ApiResponse[SessionResponse]:
    raise NotImplementedError

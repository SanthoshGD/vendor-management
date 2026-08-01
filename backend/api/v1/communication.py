"""Vendor communication routes (spec §8).

Backs the Communication tab: vendor chat, internal notes and the chaser panel.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.deps import CurrentUserDep, PaginationDep, SupabaseDep
from core.response import ApiResponse
from schemas.communication import CommunicationChannel, MessageOut, PostMessageRequest

router = APIRouter(prefix="/vendors/{vendor_id}/communication", tags=["communication"])


@router.get(
    "",
    response_model=ApiResponse[list[MessageOut]],
    summary="Conversation history for a vendor",
)
async def list_messages(
    vendor_id: str,
    supabase: SupabaseDep,
    pagination: PaginationDep,
    channel: CommunicationChannel | None = Query(default=None),
) -> ApiResponse[list[MessageOut]]:
    raise NotImplementedError


@router.post(
    "",
    response_model=ApiResponse[MessageOut],
    summary="Post a message, internal note, or chaser",
    description=(
        "The sender is resolved from the session, not the payload, so a client "
        "cannot post as somebody else."
    ),
)
async def post_message(
    vendor_id: str,
    payload: PostMessageRequest,
    supabase: SupabaseDep,
    user: CurrentUserDep,
) -> ApiResponse[MessageOut]:
    raise NotImplementedError

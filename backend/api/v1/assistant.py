"""Assistant route (spec §7.3, §8).

`POST /api/v1/assistant/chat` streams via SSE so `AIComplianceAssistant.tsx`
can render token by token. The non-streaming JSON body is available via
`stream: false` for tests and non-browser callers.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.deps import AIProviderDep, CurrentUserDep, RagPipelineDep
from core.response import ApiResponse
from schemas.assistant import ChatRequest, ChatResponse, Citation
from services.ai.chat_service import ChatService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post(
    "/chat",
    response_model=ApiResponse[ChatResponse],
    summary="Ask the compliance copilot",
    description=(
        "RAG-grounded, Gemini-backed. Vendor-scoped when `vendorId` is set - "
        "the backend injects vendor id, country, risk score, document list and "
        "status into the system context before the first token, so 'Why is "
        "this High Risk?' resolves without naming the vendor. Unscoped from "
        "the global FAB.\n\n"
        "Returns `text/event-stream` when `stream` is true (the default), "
        "otherwise the JSON envelope."
    ),
    responses={
        200: {"content": {"text/event-stream": {}, "application/json": {}}},
        503: {"description": "AI temporarily unavailable - the key pool is exhausted."},
    },
)
async def chat(
    payload: ChatRequest,
    provider: AIProviderDep,
    rag: RagPipelineDep,
    user: CurrentUserDep,
) -> ApiResponse[ChatResponse] | StreamingResponse:
    chat_svc = ChatService(provider, rag)
    conv_id = payload.conversation_id or str(uuid.uuid4())

    if payload.stream:
        return StreamingResponse(
            chat_svc.stream_chat(
                payload.message,
                user=user,
                vendor_id=payload.vendor_id,
                conversation_id=conv_id,
            ),
            media_type="text/event-stream",
        )

    text, citations_raw, suggestions = await chat_svc.generate_response(
        payload.message,
        user=user,
        vendor_id=payload.vendor_id,
        history=payload.history,
    )

    citations = [
        Citation(
            collection=c.get("collection", "default"),
            title=c.get("title"),
            vendor_id=c.get("vendor_id"),
            excerpt=c.get("excerpt"),
            similarity=c.get("similarity"),
        )
        for c in citations_raw
    ]

    res = ChatResponse(
        conversation_id=conv_id,
        message=text,
        citations=citations,
        suggestions=suggestions,
        created_at=datetime.now(timezone.utc),
    )
    return ApiResponse(data=res)

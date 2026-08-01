"""Assistant route (spec §7.3, §8).

`POST /api/v1/assistant/chat` streams via SSE so `AIComplianceAssistant.tsx`
can render token by token. The non-streaming JSON body is available via
`stream: false` for tests and non-browser callers.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.deps import AIProviderDep, CurrentUserDep
from core.response import ApiResponse
from schemas.assistant import ChatRequest, ChatResponse

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post(
    "/chat",
    response_model=ApiResponse[ChatResponse],
    summary="Ask the compliance copilot",
    description=(
        "RAG-grounded, Gemini-backed. Vendor-scoped when `vendorId` is set — "
        "the backend injects vendor id, country, risk score, document list and "
        "status into the system context before the first token, so 'Why is "
        "this High Risk?' resolves without naming the vendor. Unscoped from "
        "the global FAB.\n\n"
        "Returns `text/event-stream` when `stream` is true (the default), "
        "otherwise the JSON envelope."
    ),
    responses={
        200: {"content": {"text/event-stream": {}, "application/json": {}}},
        503: {"description": "AI temporarily unavailable — the key pool is exhausted."},
    },
)
async def chat(
    payload: ChatRequest,
    provider: AIProviderDep,
    user: CurrentUserDep,
) -> ApiResponse[ChatResponse] | StreamingResponse:
    raise NotImplementedError

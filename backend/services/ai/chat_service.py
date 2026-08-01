"""Assistant / Copilot chat orchestration (spec §7.3).

The assistant is context-injected, not a blank chat box. Opened from a Vendor
Details page, the backend injects vendor id, country, risk score, document list
and status into the system context before the first token — so "Why is this
High Risk?" resolves without the admin naming the vendor. Opened from the
global FAB it runs unscoped over the policy and global collections.

Tone is deliberately un-chatbot-like per the product rule: concise, cites
vendor and document ids, reads as embedded rather than bolted on.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from core.logger import get_logger
from core.security import CurrentUser
from services.ai.provider import AIProvider
from services.ai.rag_pipeline import RagPipeline

logger = get_logger(__name__)

# Spec §7.3: the quick prompts already in the UI, as structured suggestions.
QUICK_PROMPTS = (
    "Show pending vendors",
    "High risk vendors",
    "Chinese suppliers",
    "Expired insurance",
    "Missing tax certificates",
    "Waiting for approval",
)


class ChatService:
    def __init__(self, provider: AIProvider, rag: RagPipeline) -> None:
        self._provider = provider
        self._rag = rag

    async def build_context(self, vendor_id: str | None) -> str:
        """Assemble the injected system context.

        Vendor-scoped when `vendor_id` is set; policy/global otherwise.
        """
        raise NotImplementedError

    async def stream_chat(
        self,
        message: str,
        *,
        user: CurrentUser,
        vendor_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AsyncIterator[str]:
        """Retrieve, augment, generate, stream (spec §7.2).

        Retrieval is scoped to what this user may see — the assistant must not
        become a way around vendor scoping.
        """
        raise NotImplementedError

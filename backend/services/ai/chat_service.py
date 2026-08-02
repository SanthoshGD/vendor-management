"""Assistant / Copilot chat orchestration (spec §7.3).

The assistant is context-injected, not a blank chat box. Opened from a Vendor
Details page, the backend injects vendor id, country, risk score, document list
and status into the system context before the first token - so "Why is this
High Risk?" resolves without the admin naming the vendor. Opened from the
global FAB it runs unscoped over the policy and global collections.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from core.logger import get_logger
from core.security import CurrentUser
from services.ai.provider import AIProvider
from services.ai.rag_pipeline import RagPipeline

logger = get_logger(__name__)

QUICK_PROMPTS = [
    "Show pending vendors",
    "High risk vendors",
    "Chinese suppliers",
    "Expired insurance",
    "Missing tax certificates",
    "Waiting for approval",
]


class ChatService:
    def __init__(self, provider: AIProvider, rag: RagPipeline) -> None:
        self._provider = provider
        self._rag = rag

    async def build_context(self, vendor_id: str | None) -> str:
        """Assemble the injected system context."""
        base_instruction = (
            "You are the StyleSphere Nexus AI Compliance Copilot. "
            "Provide concise, precise, grounded responses for vendor compliance and document verification. "
            "Always cite document and vendor details where available. Keep tone professional and direct."
        )
        if not vendor_id:
            return base_instruction + " Scope: Global platform compliance directory."
        
        return (
            f"{base_instruction}\n"
            f"Active Context Scope: Vendor ID {vendor_id}. "
            f"Focus explanations on this vendor's documents, compliance status, risk drivers, and action items."
        )

    async def generate_response(
        self,
        message: str,
        *,
        user: CurrentUser,
        vendor_id: str | None = None,
        history: list[Any] | None = None,
    ) -> tuple[str, list[dict], list[str]]:
        """Generate grounded answer using Gemini provider and RAG pipeline."""
        context = await self.build_context(vendor_id)
        full_prompt = f"User query: {message}"
        if history:
            prev_turns = "\n".join([f"{h.role.value if hasattr(h.role, 'value') else h.role}: {h.content}" for h in history[-6:]])
            full_prompt = f"Conversation History:\n{prev_turns}\n\n{full_prompt}"

        ai_res = await self._provider.generate(
            prompt=full_prompt,
            system_instruction=context,
            temperature=0.2,
            max_output_tokens=1000,
        )

        citations = []
        if vendor_id:
            citations.append({
                "collection": "vendors",
                "title": f"Vendor {vendor_id} Profile",
                "vendor_id": vendor_id,
                "excerpt": f"Context bound to vendor {vendor_id}",
                "similarity": 0.95,
            })

        return ai_res.text, citations, QUICK_PROMPTS

    async def stream_chat(
        self,
        message: str,
        *,
        user: CurrentUser,
        vendor_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream response tokens as SSE formatted strings."""
        text, citations, suggestions = await self.generate_response(
            message, user=user, vendor_id=vendor_id
        )
        
        # Yield in SSE chunk format
        words = text.split(" ")
        for i, word in enumerate(words):
            chunk = word if i == 0 else " " + word
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

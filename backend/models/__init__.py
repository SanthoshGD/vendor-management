"""Supabase table type definitions (spec §3).

Plain dataclasses/Pydantic models describing table rows — deliberately NOT ORM
models. Per spec §2, `FastAPI -> supabase-py -> Supabase` is the chosen path;
adding an ORM would duplicate what the Supabase client already provides.

These describe what comes *out of* the database. `schemas/` describes what goes
*over the wire*. Keeping them separate means a column rename does not
automatically become a breaking API change.
"""

from models.tables import (
    ActivityLogRow,
    ApprovalHistoryRow,
    CommunicationRow,
    GeminiApiKeyRow,
    NotificationRow,
    ProductRow,
    RagChunkRow,
    RagDocumentRow,
    UserRow,
    VendorDocumentRow,
    VendorRiskDriverRow,
    VendorRow,
)

__all__ = [
    "ActivityLogRow",
    "ApprovalHistoryRow",
    "CommunicationRow",
    "GeminiApiKeyRow",
    "NotificationRow",
    "ProductRow",
    "RagChunkRow",
    "RagDocumentRow",
    "UserRow",
    "VendorDocumentRow",
    "VendorRiskDriverRow",
    "VendorRow",
]

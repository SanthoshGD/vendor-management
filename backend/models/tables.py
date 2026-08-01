"""Row shapes for the spec §4 tables.

Field names are snake_case, matching the Postgres columns exactly — these are
database rows, not API payloads.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class VendorRow(BaseModel):
    id: str
    company_name: str
    country: str | None = None
    status: str | None = None
    priority: str | None = None
    assigned_vendor_executive: str | None = None
    submission_date: datetime | None = None
    risk_score: int | None = None
    risk_level: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class VendorDocumentRow(BaseModel):
    id: str
    vendor_id: str
    doc_type: str
    file_url: str | None = None  # Supabase Storage path, never a public URL
    status: str | None = None
    confidence: int | None = None
    extracted_fields: dict[str, Any] = Field(default_factory=dict)
    validated_by: str | None = None
    validated_at: datetime | None = None


class VendorRiskDriverRow(BaseModel):
    id: str
    vendor_id: str
    driver_code: str
    points: int
    description: str | None = None
    created_at: datetime | None = None


class ProductRow(BaseModel):
    id: str
    vendor_id: str
    name: str
    country: str | None = None
    category: str | None = None
    approval_status: str | None = None
    approval_date: datetime | None = None


class ActivityLogRow(BaseModel):
    """Append-only (spec §11). Never updated, never deleted."""

    id: str
    vendor_id: str | None = None
    actor: str
    action: str
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    reason: str | None = None
    ip_address: str | None = None
    created_at: datetime | None = None


class ApprovalHistoryRow(BaseModel):
    id: str
    vendor_id: str
    decision: str
    comment: str | None = None
    reviewer: str
    decided_at: datetime | None = None


class CommunicationRow(BaseModel):
    id: str
    vendor_id: str
    channel: str  # vendor_chat | internal_note | chaser
    sender: str
    message: str
    created_at: datetime | None = None


class UserRow(BaseModel):
    """Bridges to Supabase Auth `auth.users` (spec §4, §15)."""

    id: str
    name: str | None = None
    role: str  # admin | vendor
    email: str | None = None


class GeminiApiKeyRow(BaseModel):
    """Spec §6.2. `encrypted_key` is never decrypted outside KeyRotationPolicy
    and never serialised into any API response."""

    id: str
    key_label: str
    encrypted_key: str
    status: str  # active | cooling_down | disabled
    daily_quota: int = 0
    used_today: int = 0
    last_used_at: datetime | None = None
    last_error: str | None = None
    priority: int = 100


class NotificationRow(BaseModel):
    id: str
    user_id: str
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime | None = None


class RagDocumentRow(BaseModel):
    id: str
    collection: str
    source_id: str | None = None
    title: str | None = None
    created_at: datetime | None = None


class RagChunkRow(BaseModel):
    id: str
    rag_document_id: str
    chunk_text: str
    chunk_index: int
    embedding: list[float] = Field(default_factory=list)  # vector(768)
    vendor_id: str | None = None
    country: str | None = None
    doc_type: str | None = None
    category: str | None = None
    created_at: datetime | None = None

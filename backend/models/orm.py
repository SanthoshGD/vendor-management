"""SQLAlchemy models for the spec §4 schema.

Column names are snake_case and match Postgres exactly — these are database
rows. `schemas/` describes what goes over the wire. Keeping them separate means
a column rename does not automatically become a breaking API change.

Status-like columns are `String` with an explicit `CheckConstraint` rather than
a native Postgres `ENUM`. Native enums make every added value a migration with
an `ALTER TYPE` that cannot run inside a transaction block; a check constraint
is a one-line migration and gives the same guarantee.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base, CreatedAtMixin, TimestampMixin, uuid_pk

# Mirrors of the wire enums. Duplicated as tuples rather than imported from
# `schemas/` on purpose: a database constraint must not silently change because
# somebody edited an API contract.
VENDOR_STATUSES = (
    "Invited",
    "Profile Submitted",
    "Doc Review",
    "Pending Review",
    "In Review",
    "Approved",
    "Rejected",
    "Changes Requested",
)
DOCUMENT_STATUSES = (
    "Missing",
    "Uploaded",
    "Processing",
    "Needs Review",
    "Flagged",
    "Verified",
)
RISK_LEVELS = ("Low", "Medium", "High")
PRODUCT_STATUSES = ("Draft", "Pending Review", "Approved", "Rejected")
COMMUNICATION_CHANNELS = ("vendor_chat", "internal_note", "chaser")
KEY_STATUSES = ("active", "cooling_down", "disabled")
JOB_STATUSES = ("pending", "running", "succeeded", "failed")
USER_ROLES = ("admin", "vendor")
RAG_COLLECTIONS = (
    "compliance_policy",
    "vendor_document",
    "historical_decision",
    "internal_sop",
    "product_rule",
)


def _in(column: str, values: tuple[str, ...]) -> str:
    rendered = ", ".join(f"'{value}'" for value in values)
    return f"{column} IN ({rendered})"


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    category: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Invited", index=True)
    stage: Mapped[str | None] = mapped_column(String(100))
    priority: Mapped[str | None] = mapped_column(String(50), index=True)
    assigned_vendor_executive: Mapped[str | None] = mapped_column(String(255), index=True)

    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    address: Mapped[str | None] = mapped_column(Text)
    tax_id: Mapped[str | None] = mapped_column(String(100))

    submission_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    # Entity registration date, not row creation — the input to the
    # VENDOR_AGE_UNDER_6_MONTHS driver (spec §12).
    registered_on: Mapped[date | None] = mapped_column(Date)

    risk_score: Mapped[int | None] = mapped_column(Integer)
    risk_level: Mapped[str | None] = mapped_column(String(20), index=True)
    risk_calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    documents: Mapped[list[VendorDocument]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan", lazy="selectin"
    )
    risk_drivers: Mapped[list[VendorRiskDriver]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(_in("status", VENDOR_STATUSES), name="status_valid"),
        CheckConstraint(
            "risk_level IS NULL OR " + _in("risk_level", RISK_LEVELS), name="risk_level_valid"
        ),
        CheckConstraint(
            "risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)",
            name="risk_score_range",
        ),
        # The vendor list is filtered by status and sorted by submission date on
        # nearly every request; a composite index serves both in one scan.
        Index("ix_vendors_status_submission_date", "status", "submission_date"),
    )


class VendorDocument(Base, TimestampMixin):
    __tablename__ = "vendor_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False
    )
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))
    file_name: Mapped[str | None] = mapped_column(String(500))
    # Supabase Storage object path. Never a public URL: clients receive
    # time-limited signed URLs so bucket layout is not part of the contract.
    file_url: Mapped[str | None] = mapped_column(Text)
    storage_bucket: Mapped[str | None] = mapped_column(String(100))
    content_type: Mapped[str | None] = mapped_column(String(150))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    page_count: Mapped[int | None] = mapped_column(Integer)
    language: Mapped[str | None] = mapped_column(String(20))

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Uploaded", index=True)
    confidence: Mapped[int | None] = mapped_column(Integer)
    extracted_fields: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    validated_by: Mapped[str | None] = mapped_column(String(255))
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    vendor: Mapped[Vendor] = relationship(back_populates="documents")

    __table_args__ = (
        CheckConstraint(_in("status", DOCUMENT_STATUSES), name="status_valid"),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 100)",
            name="confidence_range",
        ),
        UniqueConstraint("vendor_id", "doc_type", name="uq_vendor_documents_vendor_id_doc_type"),
        Index("ix_vendor_documents_vendor_id_status", "vendor_id", "status"),
    )


class VendorRiskDriver(Base, CreatedAtMixin):
    """One row per driver that fired, so a score is always decomposable."""

    __tablename__ = "vendor_risk_drivers"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False
    )
    driver_code: Mapped[str] = mapped_column(String(60), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    vendor: Mapped[Vendor] = relationship(back_populates="risk_drivers")

    __table_args__ = (
        CheckConstraint("points >= 0", name="points_non_negative"),
        Index("ix_vendor_risk_drivers_vendor_id", "vendor_id"),
    )


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    approval_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Draft", index=True
    )
    approval_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    image_path: Mapped[str | None] = mapped_column(Text)

    vendor: Mapped[Vendor] = relationship(lazy="joined")

    __table_args__ = (
        CheckConstraint(_in("approval_status", PRODUCT_STATUSES), name="approval_status_valid"),
    )


class ActivityLog(Base, CreatedAtMixin):
    """Append-only (spec §11). Never updated, never deleted.

    There is no `updated_at` here by design, and the repository exposes no
    update or delete. The database role used by the API should have UPDATE and
    DELETE revoked on this table as defence in depth.
    """

    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL")
    )
    actor: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    reason: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(INET)

    __table_args__ = (Index("ix_activity_log_vendor_id_created_at", "vendor_id", "created_at"),)


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    reviewer: Mapped[str] = mapped_column(String(255), nullable=False)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    __table_args__ = (Index("ix_approval_history_vendor_id_decided_at", "vendor_id", "decided_at"),)


class Communication(Base, CreatedAtMixin):
    __tablename__ = "communications"

    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String(30), nullable=False)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint(_in("channel", COMMUNICATION_CHANNELS), name="channel_valid"),
        Index("ix_communications_vendor_id_created_at", "vendor_id", "created_at"),
    )


class User(Base, TimestampMixin):
    """Bridges to Supabase Auth `auth.users` (spec §4, §15).

    Two roles only. "Vendor Executive" is an assignment field on `vendors`,
    not a login.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="vendor", index=True)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL")
    )

    __table_args__ = (CheckConstraint(_in("role", USER_ROLES), name="role_valid"),)


class GeminiApiKey(Base, TimestampMixin):
    """Spec §6.2. `encrypted_key` is AES-GCM ciphertext.

    It is decrypted only inside `KeyRotationPolicy` and never serialised into
    any API response — no response schema has a field that could carry it.
    """

    __tablename__ = "gemini_api_keys"

    id: Mapped[uuid.UUID] = uuid_pk()
    key_label: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    # Last 4 plaintext characters, stored at insert so the admin list can be
    # rendered without decrypting the pool on every page load (spec §6.3).
    key_suffix: Mapped[str] = mapped_column(String(8), nullable=False, server_default="????")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    daily_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_used_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100, index=True)
    consecutive_auth_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    quota_reset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint(_in("status", KEY_STATUSES), name="status_valid"),
        CheckConstraint("used_today >= 0 AND daily_quota >= 0", name="counters_non_negative"),
        # The selection query is exactly this ordering (spec §6.2).
        Index("ix_gemini_api_keys_status_priority_used_today", "status", "priority", "used_today"),
    )


class Notification(Base, CreatedAtMixin):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_notifications_user_id_read_at", "user_id", "read_at"),)


class NotificationEvent(Base, CreatedAtMixin):
    """The raw event log notifications are generated from (spec §4)."""

    __tablename__ = "notification_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(String(255))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")


class NotificationPreference(Base, TimestampMixin):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "channel",
            "event_type",
            name="uq_notification_preferences_user_id_channel_event_type",
        ),
    )


class RagDocument(Base, CreatedAtMixin):
    """Spec §7.1: distinct collections, not one flat index."""

    __tablename__ = "rag_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    collection: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_id: Mapped[str | None] = mapped_column(String(255), index=True)
    title: Mapped[str | None] = mapped_column(Text)

    chunks: Mapped[list[RagChunk]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(_in("collection", RAG_COLLECTIONS), name="collection_valid"),
        Index("ix_rag_documents_collection_source_id", "collection", "source_id"),
    )


class RagChunk(Base, CreatedAtMixin):
    """Chunk metadata is what makes retrieval scopeable (spec §7.1)."""

    __tablename__ = "rag_chunks"

    id: Mapped[uuid.UUID] = uuid_pk()
    rag_document_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768))
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE")
    )
    country: Mapped[str | None] = mapped_column(String(100))
    doc_type: Mapped[str | None] = mapped_column(String(50))
    category: Mapped[str | None] = mapped_column(String(100))

    document: Mapped[RagDocument] = relationship(back_populates="chunks")

    __table_args__ = (
        UniqueConstraint(
            "rag_document_id", "chunk_index", name="uq_rag_chunks_rag_document_id_chunk_index"
        ),
        Index("ix_rag_chunks_vendor_id", "vendor_id"),
    )


class Job(Base, TimestampMixin):
    """Postgres-backed job queue (spec §10).

    Deliberately simple. The claim query is a single
    `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED) ... RETURNING`, which
    is what stops two workers taking the same row. Moving to Redis/RQ later
    replaces this table and `JobRepository`, nothing else.
    """

    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = uuid_pk()
    job_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    run_after: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[str | None] = mapped_column(String(120))
    last_error: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(_in("status", JOB_STATUSES), name="status_valid"),
        Index("ix_jobs_status_run_after", "status", "run_after"),
    )

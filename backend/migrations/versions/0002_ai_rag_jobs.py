"""Gemini key pool, notifications, RAG collections and the job queue

Spec §4 (AI/notification/RAG tables), §6 (key pool), §7 (pgvector), §10 (jobs).

Split from 0001 because this is the only revision that requires the `vector`
extension: a target without pgvector fails here, on a revision boundary with an
obvious message, rather than midway through creating the core tables.

Revision ID: 0002_ai_rag_jobs
Revises: 0001_core_schema
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_ai_rag_jobs"
down_revision: str | None = "0001_core_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMBEDDING_DIMENSIONS = 768  # matches RAG_EMBEDDING_DIMENSIONS and vector(768) in spec §4


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "gemini_api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("key_label", sa.String(length=100), nullable=False),
        sa.Column("encrypted_key", sa.Text(), nullable=False),
        sa.Column("key_suffix", sa.String(length=8), server_default="????", nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("daily_quota", sa.Integer(), nullable=False),
        sa.Column("used_today", sa.Integer(), nullable=False),
        sa.Column("tokens_used_today", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("consecutive_auth_failures", sa.Integer(), nullable=False),
        sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quota_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'cooling_down', 'disabled')",
            name=op.f("ck_gemini_api_keys_status_valid"),
        ),
        sa.CheckConstraint(
            "used_today >= 0 AND daily_quota >= 0",
            name=op.f("ck_gemini_api_keys_counters_non_negative"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gemini_api_keys")),
        sa.UniqueConstraint("key_label", name=op.f("uq_gemini_api_keys_key_label")),
    )
    op.create_index(op.f("ix_gemini_api_keys_status"), "gemini_api_keys", ["status"])
    op.create_index(op.f("ix_gemini_api_keys_priority"), "gemini_api_keys", ["priority"])
    # Serves the selection query verbatim: eligible -> (priority, used_today).
    op.create_index(
        "ix_gemini_api_keys_status_priority_used_today",
        "gemini_api_keys",
        ["status", "priority", "used_today"],
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()),
                  server_default="{}", nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name=op.f("fk_notifications_user_id_users"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"])
    op.create_index("ix_notifications_user_id_read_at", "notifications", ["user_id", "read_at"])

    op.create_table(
        "notification_events",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()),
                  server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notification_events")),
    )
    op.create_index(op.f("ix_notification_events_event_type"), "notification_events",
                    ["event_type"])
    op.create_index(op.f("ix_notification_events_created_at"), "notification_events",
                    ["created_at"])

    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name=op.f("fk_notification_preferences_user_id_users"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notification_preferences")),
        sa.UniqueConstraint(
            "user_id", "channel", "event_type",
            name="uq_notification_preferences_user_id_channel_event_type",
        ),
    )

    op.create_table(
        "rag_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("collection", sa.String(length=50), nullable=False),
        sa.Column("source_id", sa.String(length=255), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "collection IN ('compliance_policy', 'vendor_document', 'historical_decision', "
            "'internal_sop', 'product_rule')",
            name=op.f("ck_rag_documents_collection_valid"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rag_documents")),
    )
    op.create_index(op.f("ix_rag_documents_collection"), "rag_documents", ["collection"])
    op.create_index(op.f("ix_rag_documents_source_id"), "rag_documents", ["source_id"])
    op.create_index(op.f("ix_rag_documents_created_at"), "rag_documents", ["created_at"])
    op.create_index(
        "ix_rag_documents_collection_source_id", "rag_documents", ["collection", "source_id"]
    )

    op.create_table(
        "rag_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("rag_document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(EMBEDDING_DIMENSIONS), nullable=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("doc_type", sa.String(length=50), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.ForeignKeyConstraint(
            ["rag_document_id"], ["rag_documents.id"],
            name=op.f("fk_rag_chunks_rag_document_id_rag_documents"), ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_rag_chunks_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rag_chunks")),
        sa.UniqueConstraint(
            "rag_document_id", "chunk_index", name="uq_rag_chunks_rag_document_id_chunk_index"
        ),
    )
    op.create_index(op.f("ix_rag_chunks_created_at"), "rag_chunks", ["created_at"])
    op.create_index("ix_rag_chunks_vendor_id", "rag_chunks", ["vendor_id"])
    # HNSW over IVFFlat: IVFFlat needs representative data present at build
    # time to pick useful lists, and this table is empty until the first
    # ingest. HNSW builds usefully on an empty table (spec §4 allows either).
    op.execute(
        "CREATE INDEX ix_rag_chunks_embedding_hnsw ON rag_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()),
                  server_default="{}", nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("run_after", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'running', 'succeeded', 'failed')",
            name=op.f("ck_jobs_status_valid"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_jobs")),
    )
    op.create_index(op.f("ix_jobs_job_type"), "jobs", ["job_type"])
    op.create_index(op.f("ix_jobs_status"), "jobs", ["status"])
    op.create_index("ix_jobs_status_run_after", "jobs", ["status", "run_after"])


def downgrade() -> None:
    op.drop_table("jobs")
    op.execute("DROP INDEX IF EXISTS ix_rag_chunks_embedding_hnsw")
    op.drop_table("rag_chunks")
    op.drop_table("rag_documents")
    op.drop_table("notification_preferences")
    op.drop_table("notification_events")
    op.drop_table("notifications")
    op.drop_table("gemini_api_keys")
    # `vector` is left enabled deliberately - see the pgcrypto note in 0001.

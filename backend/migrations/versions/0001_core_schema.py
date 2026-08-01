"""Core vendor workflow schema (spec §4)

Vendors, documents, risk drivers, products, activity log, approval history,
communications and users. Depends only on `pgcrypto` for `gen_random_uuid()`.
The AI/RAG surface is a separate revision so a target without pgvector fails
on a revision boundary rather than midway through this one.

Revision ID: 0001_core_schema
Revises:
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_core_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # gen_random_uuid() lives in pgcrypto on Postgres < 13 and is built in
    # from 13 onwards; enabling the extension is a no-op on newer servers and
    # required on older ones. Supabase ships it enabled.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "vendors",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("stage", sa.String(length=100), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=True),
        sa.Column("assigned_vendor_executive", sa.String(length=255), nullable=True),
        sa.Column("contact_name", sa.String(length=255), nullable=True),
        sa.Column("contact_email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("tax_id", sa.String(length=100), nullable=True),
        sa.Column("submission_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("registered_on", sa.Date(), nullable=True),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column("risk_level", sa.String(length=20), nullable=True),
        sa.Column("risk_calculated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "status IN ('Invited', 'Profile Submitted', 'Doc Review', 'Pending Review', "
            "'In Review', 'Approved', 'Rejected', 'Changes Requested')",
            name=op.f("ck_vendors_status_valid"),
        ),
        sa.CheckConstraint(
            "risk_level IS NULL OR risk_level IN ('Low', 'Medium', 'High')",
            name=op.f("ck_vendors_risk_level_valid"),
        ),
        sa.CheckConstraint(
            "risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)",
            name=op.f("ck_vendors_risk_score_range"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vendors")),
    )
    op.create_index(op.f("ix_vendors_company_name"), "vendors", ["company_name"])
    op.create_index(op.f("ix_vendors_country"), "vendors", ["country"])
    op.create_index(op.f("ix_vendors_status"), "vendors", ["status"])
    op.create_index(op.f("ix_vendors_priority"), "vendors", ["priority"])
    op.create_index(
        op.f("ix_vendors_assigned_vendor_executive"), "vendors", ["assigned_vendor_executive"]
    )
    op.create_index(op.f("ix_vendors_submission_date"), "vendors", ["submission_date"])
    op.create_index(op.f("ix_vendors_risk_level"), "vendors", ["risk_level"])
    op.create_index("ix_vendors_status_submission_date", "vendors", ["status", "submission_date"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint("role IN ('admin', 'vendor')", name=op.f("ck_users_role_valid")),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_users_vendor_id_vendors"), ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_index(op.f("ix_users_role"), "users", ["role"])

    op.create_table(
        "vendor_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("file_name", sa.String(length=500), nullable=True),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("storage_bucket", sa.String(length=100), nullable=True),
        sa.Column("content_type", sa.String(length=150), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("extracted_fields", postgresql.JSONB(astext_type=sa.Text()),
                  server_default="{}", nullable=False),
        sa.Column("validated_by", sa.String(length=255), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "status IN ('Missing', 'Uploaded', 'Processing', 'Needs Review', "
            "'Flagged', 'Verified')",
            name=op.f("ck_vendor_documents_status_valid"),
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 100)",
            name=op.f("ck_vendor_documents_confidence_range"),
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_vendor_documents_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vendor_documents")),
        sa.UniqueConstraint("vendor_id", "doc_type", name="uq_vendor_documents_vendor_id_doc_type"),
    )
    op.create_index(op.f("ix_vendor_documents_status"), "vendor_documents", ["status"])
    op.create_index(
        "ix_vendor_documents_vendor_id_status", "vendor_documents", ["vendor_id", "status"]
    )

    op.create_table(
        "vendor_risk_drivers",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("driver_code", sa.String(length=60), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint("points >= 0", name=op.f("ck_vendor_risk_drivers_points_non_negative")),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_vendor_risk_drivers_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vendor_risk_drivers")),
    )
    op.create_index(
        op.f("ix_vendor_risk_drivers_created_at"), "vendor_risk_drivers", ["created_at"]
    )
    op.create_index("ix_vendor_risk_drivers_vendor_id", "vendor_risk_drivers", ["vendor_id"])

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("approval_status", sa.String(length=50), nullable=False),
        sa.Column("approval_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("image_path", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "approval_status IN ('Draft', 'Pending Review', 'Approved', 'Rejected')",
            name=op.f("ck_products_approval_status_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_products_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
    )
    op.create_index(op.f("ix_products_name"), "products", ["name"])
    op.create_index(op.f("ix_products_country"), "products", ["country"])
    op.create_index(op.f("ix_products_category"), "products", ["category"])
    op.create_index(op.f("ix_products_approval_status"), "products", ["approval_status"])

    # Append-only (spec §11). No updated_at, and the API's database role should
    # have UPDATE and DELETE revoked on this table.
    op.create_table(
        "activity_log",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("before", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_activity_log_vendor_id_vendors"), ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_log")),
    )
    op.create_index(op.f("ix_activity_log_actor"), "activity_log", ["actor"])
    op.create_index(op.f("ix_activity_log_action"), "activity_log", ["action"])
    op.create_index(op.f("ix_activity_log_created_at"), "activity_log", ["created_at"])
    op.create_index(
        "ix_activity_log_vendor_id_created_at", "activity_log", ["vendor_id", "created_at"]
    )

    op.create_table(
        "approval_history",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decision", sa.String(length=50), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("reviewer", sa.String(length=255), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_approval_history_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_approval_history")),
    )
    op.create_index(op.f("ix_approval_history_decided_at"), "approval_history", ["decided_at"])
    op.create_index(
        "ix_approval_history_vendor_id_decided_at", "approval_history", ["vendor_id", "decided_at"]
    )

    op.create_table(
        "communications",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False),
        sa.Column("sender", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.CheckConstraint(
            "channel IN ('vendor_chat', 'internal_note', 'chaser')",
            name=op.f("ck_communications_channel_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"], ["vendors.id"],
            name=op.f("fk_communications_vendor_id_vendors"), ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_communications")),
    )
    op.create_index(op.f("ix_communications_created_at"), "communications", ["created_at"])
    op.create_index(
        "ix_communications_vendor_id_created_at", "communications", ["vendor_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_table("communications")
    op.drop_table("approval_history")
    op.drop_table("activity_log")
    op.drop_table("products")
    op.drop_table("vendor_risk_drivers")
    op.drop_table("vendor_documents")
    op.drop_table("users")
    op.drop_table("vendors")
    # pgcrypto is intentionally left enabled: other schemas in the same
    # database may depend on it, and dropping a shared extension on a
    # downgrade is not this migration's call.

"""Database models (spec §3, §4).

SQLAlchemy declarative models describing the tables. These describe what lives
*in* the database; `schemas/` describes what goes *over the wire*. Keeping them
separate means a column rename does not automatically become a breaking API
change.

Importing this package registers every table on `db.base.Base.metadata`, which
is what lets `alembic revision --autogenerate` see the full schema. The Alembic
environment imports this module and nothing else for that reason.

Note the deviation from plan §2 recorded in `db/__init__.py`: these are ORM
models, and spec §11's same-transaction audit requirement is why.
"""

from db.base import Base
from models.orm import (
    ActivityLog,
    ApprovalHistory,
    Communication,
    GeminiApiKey,
    Job,
    Notification,
    NotificationEvent,
    NotificationPreference,
    Product,
    RagChunk,
    RagDocument,
    User,
    Vendor,
    VendorDocument,
    VendorRiskDriver,
)

__all__ = [
    "ActivityLog",
    "ApprovalHistory",
    "Base",
    "Communication",
    "GeminiApiKey",
    "Job",
    "Notification",
    "NotificationEvent",
    "NotificationPreference",
    "Product",
    "RagChunk",
    "RagDocument",
    "User",
    "Vendor",
    "VendorDocument",
    "VendorRiskDriver",
]

"""The only layer that touches the database (spec §3).

One repository per entity. Routers depend on these; nothing else issues a
query. Every repository takes the request-scoped `AsyncSession` and leaves the
commit to `api.deps.get_session`.
"""

from repositories.activity_repository import ActivityRepository
from repositories.analytics_repository import AnalyticsRepository
from repositories.base import BaseRepository, parse_uuid
from repositories.communication_repository import CommunicationRepository
from repositories.document_repository import DocumentRepository
from repositories.gemini_key_repository import GeminiKeyRepository
from repositories.job_repository import JobRepository
from repositories.notification_repository import NotificationRepository
from repositories.product_repository import ProductRepository
from repositories.rag_repository import RagRepository
from repositories.risk_repository import RiskRepository
from repositories.user_repository import UserRepository
from repositories.vendor_repository import VendorRepository

__all__ = [
    "ActivityRepository",
    "AnalyticsRepository",
    "BaseRepository",
    "CommunicationRepository",
    "DocumentRepository",
    "GeminiKeyRepository",
    "JobRepository",
    "NotificationRepository",
    "ProductRepository",
    "RagRepository",
    "RiskRepository",
    "UserRepository",
    "VendorRepository",
    "parse_uuid",
]

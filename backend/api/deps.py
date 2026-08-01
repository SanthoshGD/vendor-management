"""Shared dependencies: session, auth, current user, pagination (spec §3).

The single place where repositories and services are constructed and injected.
Dependency direction is strictly one-way:

    router -> repository / service -> database

No router constructs a repository itself, and no query happens inside a router.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.logger import admin_id_ctx, get_logger, vendor_id_ctx
from core.security import CurrentUser, Role, decode_supabase_jwt, user_from_claims
from core.supabase import SupabaseClientProvider
from db.session import DatabaseProvider
from repositories.activity_repository import ActivityRepository
from repositories.analytics_repository import AnalyticsRepository
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
from schemas.common import PaginationParams
from services.ai.gemini_provider import GeminiProvider
from services.ai.key_rotation import KeyRotationPolicy
from services.ai.provider import AIProvider
from services.analytics.analytics_service import AnalyticsService
from services.notification.notification_service import NotificationService
from services.storage.storage_service import StorageService

logger = get_logger(__name__)

# --- Infrastructure ---------------------------------------------------------


def get_app_settings() -> Settings:
    return get_settings()


def get_database(request: Request) -> DatabaseProvider:
    """Read the process-wide provider off `app.state` (set by the lifespan)."""
    return request.app.state.database


def get_supabase(request: Request) -> SupabaseClientProvider:
    return request.app.state.supabase


SettingsDep = Annotated[Settings, Depends(get_app_settings)]
DatabaseDep = Annotated[DatabaseProvider, Depends(get_database)]
SupabaseDep = Annotated[SupabaseClientProvider, Depends(get_supabase)]


async def get_session(database: DatabaseDep) -> AsyncIterator[AsyncSession]:
    """One transaction per request.

    Commits after the handler returns; rolls back on any exception. That single
    commit is what makes spec §11 hold: a status mutation, its
    `approval_history` row and its `activity_log` entry either all land or none
    do, without every route arranging it.

    An unconfigured database raises `ServiceUnavailableError` here, so data
    routes answer a clean 503 rather than failing halfway through a handler.
    """
    factory = database.get_sessionmaker()
    session = factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


SessionDep = Annotated[AsyncSession, Depends(get_session)]


# --- Repositories -----------------------------------------------------------


def get_vendor_repository(session: SessionDep) -> VendorRepository:
    return VendorRepository(session)


def get_document_repository(session: SessionDep) -> DocumentRepository:
    return DocumentRepository(session)


def get_activity_repository(session: SessionDep) -> ActivityRepository:
    return ActivityRepository(session)


def get_risk_repository(session: SessionDep) -> RiskRepository:
    return RiskRepository(session)


def get_product_repository(session: SessionDep) -> ProductRepository:
    return ProductRepository(session)


def get_rag_repository(session: SessionDep) -> RagRepository:
    return RagRepository(session)


def get_communication_repository(session: SessionDep) -> CommunicationRepository:
    return CommunicationRepository(session)


def get_gemini_key_repository(session: SessionDep) -> GeminiKeyRepository:
    return GeminiKeyRepository(session)


def get_job_repository(session: SessionDep) -> JobRepository:
    return JobRepository(session)


def get_user_repository(session: SessionDep) -> UserRepository:
    return UserRepository(session)


def get_notification_repository(session: SessionDep) -> NotificationRepository:
    return NotificationRepository(session)


def get_analytics_repository(session: SessionDep) -> AnalyticsRepository:
    return AnalyticsRepository(session)


VendorRepoDep = Annotated[VendorRepository, Depends(get_vendor_repository)]
DocumentRepoDep = Annotated[DocumentRepository, Depends(get_document_repository)]
ActivityRepoDep = Annotated[ActivityRepository, Depends(get_activity_repository)]
RiskRepoDep = Annotated[RiskRepository, Depends(get_risk_repository)]
ProductRepoDep = Annotated[ProductRepository, Depends(get_product_repository)]
RagRepoDep = Annotated[RagRepository, Depends(get_rag_repository)]
CommunicationRepoDep = Annotated[CommunicationRepository, Depends(get_communication_repository)]
GeminiKeyRepoDep = Annotated[GeminiKeyRepository, Depends(get_gemini_key_repository)]
JobRepoDep = Annotated[JobRepository, Depends(get_job_repository)]
UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]
NotificationRepoDep = Annotated[NotificationRepository, Depends(get_notification_repository)]
AnalyticsRepoDep = Annotated[AnalyticsRepository, Depends(get_analytics_repository)]


# --- Services ---------------------------------------------------------------


def get_storage_service(supabase: SupabaseDep) -> StorageService:
    return StorageService(supabase)


def get_notification_service(
    notifications: NotificationRepoDep, users: UserRepoDep
) -> NotificationService:
    return NotificationService(notifications, users)


def get_analytics_service(
    analytics: AnalyticsRepoDep, activity: ActivityRepoDep
) -> AnalyticsService:
    return AnalyticsService(analytics, activity)


StorageDep = Annotated[StorageService, Depends(get_storage_service)]
NotificationDep = Annotated[NotificationService, Depends(get_notification_service)]
AnalyticsDep = Annotated[AnalyticsService, Depends(get_analytics_service)]


def get_key_rotation(database: DatabaseDep, settings: SettingsDep) -> KeyRotationPolicy:
    """Built on the session *factory*, not the request session.

    Key health is operational state: a cooldown earned by a call must survive a
    rollback of the business transaction that triggered it, or the next request
    is handed the same exhausted key.
    """
    return KeyRotationPolicy(database, settings)


KeyRotationDep = Annotated[KeyRotationPolicy, Depends(get_key_rotation)]


def get_ai_provider(rotation: KeyRotationDep, settings: SettingsDep) -> AIProvider:
    """Build `GeminiProvider` behind the `AIProvider` Protocol (spec §5).

    Routers and services depend on the Protocol, never on the concrete type, so
    swapping providers is one new class rather than three service edits.
    """
    return GeminiProvider(rotation, settings)


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]


# --- Request-scoped values --------------------------------------------------


def get_pagination(
    page: Annotated[int, Query(ge=1, description="1-indexed page number.")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=200, alias="pageSize", description="Rows per page.")
    ] = 25,
) -> PaginationParams:
    """Bounds are declared on the Query, not only on the model.

    A constraint that exists only on `PaginationParams` raises a Pydantic error
    *inside* the dependency, which is not a RequestValidationError and would
    surface as a 500. Declaring it here makes `?page=0` a clean 422.
    """
    return PaginationParams(page=page, page_size=page_size)


PaginationDep = Annotated[PaginationParams, Depends(get_pagination)]


def get_client_ip(request: Request) -> str | None:
    """Client IP for the audit trail (spec §11).

    `X-Forwarded-For` is honoured because Railway terminates TLS at a proxy, so
    the socket peer is always the proxy. It is spoofable by a direct caller —
    acceptable for an audit *annotation*, and it is never used for an
    authorisation decision.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    client = request.client
    return client.host if client else None


ClientIpDep = Annotated[str | None, Depends(get_client_ip)]


def _development_admin(settings: Settings) -> CurrentUser:
    return CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email=settings.dev_auth_email,
        name=settings.dev_auth_name,
        role=Role.admin,
        vendor_id=None,
    )


async def get_current_user(
    settings: SettingsDep,
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Resolve the authenticated principal from the Supabase JWT (spec §15).

    Populates the logging context, so every line emitted downstream carries the
    acting principal without any handler passing it around.
    """
    if settings.auth_bypass_active:
        user = _development_admin(settings)
    else:
        scheme, _, token = (authorization or "").partition(" ")
        if scheme.lower() != "bearer" or not token:
            from core.exceptions import UnauthorizedError

            raise UnauthorizedError("A bearer token is required.")
        claims = decode_supabase_jwt(
            token.strip(),
            secret=settings.jwt_secret,
            audience=settings.supabase_jwt_aud,
            algorithms=settings.supabase_jwt_algorithms,
        )
        user = user_from_claims(claims)

    admin_id_ctx.set(user.id if user.is_admin else None)
    vendor_id_ctx.set(user.vendor_id)
    return user


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def require_admin(user: CurrentUserDep) -> CurrentUser:
    """Admin-only routes (spec §15: admin is portal-wide, vendor is scoped)."""
    from core.security import assert_admin

    assert_admin(user)
    return user


AdminDep = Annotated[CurrentUser, Depends(require_admin)]

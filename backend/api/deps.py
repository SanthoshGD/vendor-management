"""Shared dependencies: auth, current user, pagination (spec §3).

The single place where repositories and services are constructed and injected.
Dependency direction is strictly one-way:

    router -> repository / service -> supabase

No router ever constructs a repository itself, and no Supabase call happens
inside a router (spec §3).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Query, Request

from core.config import Settings, get_settings
from core.security import CurrentUser
from core.supabase import SupabaseClientProvider
from repositories.activity_repository import ActivityRepository
from repositories.document_repository import DocumentRepository
from repositories.product_repository import ProductRepository
from repositories.rag_repository import RagRepository
from repositories.risk_repository import RiskRepository
from repositories.vendor_repository import VendorRepository
from schemas.common import PaginationParams
from services.analytics.analytics_service import AnalyticsService
from services.notification.notification_service import NotificationService
from services.storage.storage_service import StorageService

# --- Infrastructure ---------------------------------------------------------


def get_app_settings() -> Settings:
    return get_settings()


def get_supabase(request: Request) -> SupabaseClientProvider:
    """Read the process-wide provider off `app.state` (set by the lifespan)."""
    return request.app.state.supabase


SettingsDep = Annotated[Settings, Depends(get_app_settings)]
SupabaseDep = Annotated[SupabaseClientProvider, Depends(get_supabase)]


# --- Repositories -----------------------------------------------------------


def get_vendor_repository(supabase: SupabaseDep) -> VendorRepository:
    return VendorRepository(supabase)


def get_document_repository(supabase: SupabaseDep) -> DocumentRepository:
    return DocumentRepository(supabase)


def get_activity_repository(supabase: SupabaseDep) -> ActivityRepository:
    return ActivityRepository(supabase)


def get_risk_repository(supabase: SupabaseDep) -> RiskRepository:
    return RiskRepository(supabase)


def get_product_repository(supabase: SupabaseDep) -> ProductRepository:
    return ProductRepository(supabase)


def get_rag_repository(supabase: SupabaseDep) -> RagRepository:
    return RagRepository(supabase)


VendorRepoDep = Annotated[VendorRepository, Depends(get_vendor_repository)]
DocumentRepoDep = Annotated[DocumentRepository, Depends(get_document_repository)]
ActivityRepoDep = Annotated[ActivityRepository, Depends(get_activity_repository)]
RiskRepoDep = Annotated[RiskRepository, Depends(get_risk_repository)]
ProductRepoDep = Annotated[ProductRepository, Depends(get_product_repository)]
RagRepoDep = Annotated[RagRepository, Depends(get_rag_repository)]


# --- Services ---------------------------------------------------------------


def get_storage_service(supabase: SupabaseDep) -> StorageService:
    return StorageService(supabase)


def get_notification_service(supabase: SupabaseDep) -> NotificationService:
    return NotificationService(supabase)


def get_analytics_service(supabase: SupabaseDep) -> AnalyticsService:
    return AnalyticsService(supabase)


StorageDep = Annotated[StorageService, Depends(get_storage_service)]
NotificationDep = Annotated[NotificationService, Depends(get_notification_service)]
AnalyticsDep = Annotated[AnalyticsService, Depends(get_analytics_service)]


def get_ai_provider(settings: SettingsDep, supabase: SupabaseDep) -> object:
    """Build `GeminiProvider` behind the `AIProvider` Protocol (spec §5).

    Routers and services depend on the Protocol, never on this concrete type,
    so swapping providers is one new class rather than three service edits.
    """
    raise NotImplementedError(
        "AI provider wiring is scaffolded; GeminiProvider is not implemented yet."
    )


AIProviderDep = Annotated[object, Depends(get_ai_provider)]


# --- Request-scoped values --------------------------------------------------


def get_pagination(
    page: Annotated[int, Query(ge=1, description="1-indexed page number.")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=200, alias="pageSize", description="Rows per page.")
    ] = 25,
) -> PaginationParams:
    """Bounds are declared on the Query, not only on the model.

    A constraint that exists only on `PaginationParams` raises a Pydantic
    error *inside* the dependency, which is not a RequestValidationError and
    would surface as a 500. Declaring it here makes `?page=0` a clean 422.
    """
    return PaginationParams(page=page, page_size=page_size)


PaginationDep = Annotated[PaginationParams, Depends(get_pagination)]


def get_current_user() -> CurrentUser:
    """Resolve the authenticated principal from the Supabase JWT (spec §15).

    Not implemented in this scaffold, but the seam is placed now so no route is
    written without an actor. When auth lands this validates the bearer token
    and resolves role — routes will not need to change.
    """
    raise NotImplementedError(
        "Authentication is not implemented yet. This dependency must resolve the "
        "actor from the Supabase JWT, never from the request body."
    )


def require_admin() -> CurrentUser:
    """Admin-only routes (spec §15: admin is portal-wide, vendor is scoped)."""
    raise NotImplementedError("Authentication is not implemented yet.")


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
AdminDep = Annotated[CurrentUser, Depends(require_admin)]

"""FastAPI app entrypoint: CORS, router registration, error handling (spec §3).

Start command in both the Procfile and railway.json: `uvicorn app.main:app`.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.health import router as health_router
from api.v1.router import api_router
from core.config import Settings, get_settings
from core.exceptions import register_exception_handlers
from core.lifespan import lifespan
from core.logger import configure_logging, get_logger
from core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware

logger = get_logger(__name__)

DESCRIPTION = """
Vendor onboarding and compliance orchestration API for StyleSphere Nexus.

**Scaffold status** — routing, layering, dependency wiring, schemas and service
seams are in place and verified. Business logic is not implemented: those
endpoints answer `501 Not Implemented` inside the standard response envelope.
`/health` and `/health/ready` are fully implemented.

Every endpoint returns the same envelope:
`{ success, data, message, errors, meta }`.

Design constraints carried from the integration plan: risk scoring is
deterministic and explainable, never AI-generated; Gemini is reached only
through the `AIProvider` abstraction with key rotation; the audit trail is
append-only and server-stamped.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the ASGI application.

    A factory rather than a module-level singleton, so tests can construct an
    app with overridden settings without touching the process environment.
    """
    settings = settings or get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
    )

    # CORS first: a rejected preflight must not traverse the stack.
    # Spec §19 — restricted to FRONTEND_ORIGIN.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
        max_age=600,
    )
    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["meta"], summary="Service banner")
    async def root() -> dict[str, str | None]:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "docs": settings.docs_url,
            "health": "/health",
            "api": settings.api_v1_prefix,
        }

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover - local convenience only
    import uvicorn

    _settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=_settings.host,
        port=_settings.port,
        reload=_settings.debug,
    )

"""v1 router aggregation.

One place that knows the full v1 surface. Versioning is by URL prefix
(`/api/v1/...`, spec §8) so a future v2 ships alongside v1 rather than as a
coordinated frontend/backend release.
"""

from fastapi import APIRouter

from api.v1 import (
    activity,
    admin,
    analytics,
    assistant,
    auth,
    communication,
    dashboard,
    documents,
    products,
    vendors,
)

api_router = APIRouter()

api_router.include_router(dashboard.router)
api_router.include_router(vendors.router)
api_router.include_router(documents.router)
api_router.include_router(communication.router)
api_router.include_router(products.router)
api_router.include_router(activity.router)
api_router.include_router(analytics.router)
api_router.include_router(assistant.router)
api_router.include_router(admin.router)
api_router.include_router(auth.router)

"""Product catalog contracts (spec §4 `products`, §8)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field

from core.response import CamelModel


from uuid import UUID

class ProductApprovalStatus(str, Enum):
    draft = "Draft"
    pending_review = "Pending Review"
    approved = "Approved"
    rejected = "Rejected"


class ProductOut(CamelModel):
    id: UUID | str
    vendor_id: UUID | str
    vendor_name: str | None = None
    name: str
    country: str | None = None
    category: str | None = None
    approval_status: ProductApprovalStatus
    approval_date: datetime | None = None
    image_url: str | None = Field(
        default=None,
        description="Signed URL from the `products` storage bucket.",
    )

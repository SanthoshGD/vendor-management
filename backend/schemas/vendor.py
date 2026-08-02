"""Vendor contracts - mirrors `types/vendor.ts` (spec §3).

`types/*.ts` remain the source of truth for shape; these mirror them
field-for-field so `services/api.ts` needs zero response transformation.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from core.response import CamelModel
from schemas.common import Priority, RiskLevel, VendorStatus
from schemas.risk import RiskOut


from uuid import UUID

class VendorSummary(CamelModel):
    """List-row projection - the columns the Vendors table renders."""

    id: UUID | str
    company_name: str
    country: str | None = None
    category: str | None = None
    status: VendorStatus | None = None
    stage: str | None = None
    risk_level: RiskLevel | None = None
    risk_score: int | None = Field(default=None, ge=0, le=100)
    priority: Priority | None = None
    assigned_vendor_executive: str | None = None
    submission_date: datetime | None = None


class VendorDetail(VendorSummary):
    contact_name: str | None = None
    contact_email: str | None = None
    address: str | None = None
    tax_id: str | None = None
    risk: RiskOut | None = None
    document_count: int | None = None
    verified_document_count: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DecisionRequest(CamelModel):
    """Body for approve / reject / request-changes.

    `comment` is mandatory on every decision: spec §11 requires a reason on the
    audit entry, and an optional field cannot enforce that.
    """

    comment: str = Field(min_length=1, max_length=2000)


class RequestChangesRequest(DecisionRequest):
    changes: list[str] = Field(min_length=1)


class DecisionResult(CamelModel):
    vendor_id: str
    decision: str
    status: VendorStatus
    decided_at: datetime
    reviewer: str
    activity_log_id: str | None = None

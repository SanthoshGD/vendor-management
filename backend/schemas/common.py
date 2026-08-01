"""Shared enums and query models for the wire contract."""

from __future__ import annotations

from enum import Enum

from pydantic import Field

from core.response import CamelModel


class RiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class VendorStatus(str, Enum):
    invited = "Invited"
    profile_submitted = "Profile Submitted"
    doc_review = "Doc Review"
    pending_review = "Pending Review"
    in_review = "In Review"
    approved = "Approved"
    rejected = "Rejected"
    changes_requested = "Changes Requested"


class DocumentStatus(str, Enum):
    missing = "Missing"
    uploaded = "Uploaded"
    processing = "Processing"
    needs_review = "Needs Review"
    flagged = "Flagged"
    verified = "Verified"


class Priority(str, Enum):
    p1 = "P1 - High"
    p2 = "P2 - Medium"
    p3 = "P3 - Normal"


class PaginationParams(CamelModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=200)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

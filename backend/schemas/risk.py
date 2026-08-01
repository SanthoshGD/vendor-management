"""Risk contracts (spec §12).

The response always carries the driver decomposition, never a bare number —
`GET /api/v1/vendors/{id}/risk` returns "score, level, drivers, recommendation"
per spec §8.
"""

from __future__ import annotations

from pydantic import Field

from core.response import CamelModel
from schemas.common import RiskLevel


class RiskDriverOut(CamelModel):
    code: str
    points: int = Field(ge=0)
    description: str


class RiskOut(CamelModel):
    vendor_id: str
    score: int = Field(ge=0, le=100)
    level: RiskLevel
    drivers: list[RiskDriverOut] = Field(default_factory=list)
    recommendation: str = ""

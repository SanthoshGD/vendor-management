"""Deterministic risk engine (spec §12).

Pure business logic: no database calls, no AI calls, no HTTP. Per the plan,
"it isn't a service, it's a function". Gemini's role is limited to producing
the *inputs* this function consumes (extracted fields, confidence scores); the
score itself stays explainable and reproducible.

Point values are loaded from `settings/risk_rules.json` (spec §13) rather than
hardcoded, so an admin can tune weights without a redeploy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class DriverCode(str, Enum):
    """Spec §12 driver table. Codes match `vendor_risk_drivers.driver_code`."""

    insurance_expired = "INSURANCE_EXPIRED"
    tax_missing = "TAX_MISSING"
    gst_mismatch = "GST_MISMATCH"
    address_mismatch = "ADDRESS_MISMATCH"
    bank_proof_missing = "BANK_PROOF_MISSING"
    low_ai_confidence = "LOW_AI_CONFIDENCE"
    vendor_age_under_6_months = "VENDOR_AGE_UNDER_6_MONTHS"


@dataclass(frozen=True)
class RiskDriver:
    code: DriverCode
    points: int
    description: str


@dataclass(frozen=True)
class RiskResult:
    score: int
    level: RiskLevel
    drivers: list[RiskDriver] = field(default_factory=list)
    recommendation: str = ""


def calculate(vendor: dict, documents: list[dict], rules: dict | None = None) -> RiskResult:
    """`calculate(vendor, documents) -> RiskResult` (spec §12).

    Args:
        vendor: the vendor row.
        documents: that vendor's documents with extracted fields and confidence.
        rules: point table from `settings/risk_rules.json`; defaults are used
            when omitted.

    Returns:
        Score, banded level, the drivers that contributed, and a recommendation.

    Every driver that fires must appear in `drivers` with its points — a score
    a reviewer cannot decompose is not explainable, and explainability is the
    stated design philosophy.
    """
    raise NotImplementedError

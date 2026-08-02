"""Deterministic risk engine (spec §12).

Pure business logic: no database calls, no AI calls, no HTTP, and no hidden
clock - the evaluation date is injectable. Per the plan, "it isn't a service,
it's a function". Gemini's role is limited to producing the *inputs* this
consumes (extracted fields, confidence scores); the score itself stays
explainable and reproducible.

Point values, bands, thresholds and field aliases come from
`settings/risk_rules.json` (spec §13) rather than being hardcoded, so weights
are tunable without a redeploy.

Every driver that fires appears in `drivers` with its points. A score a
reviewer cannot decompose is not explainable, and explainability is the stated
design philosophy - so this returns the decomposition, never a bare number.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from enum import Enum
from typing import Any

from settings import risk_rules


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


# Fallbacks used only when `settings/risk_rules.json` is missing or partial.
# The engine must produce a defensible score even with no config on disk -
# silently scoring every vendor 0 would be worse than using the spec defaults.
_DEFAULT_POINTS: dict[DriverCode, int] = {
    DriverCode.insurance_expired: 25,
    DriverCode.tax_missing: 20,
    DriverCode.gst_mismatch: 15,
    DriverCode.address_mismatch: 15,
    DriverCode.bank_proof_missing: 10,
    DriverCode.low_ai_confidence: 10,
    DriverCode.vendor_age_under_6_months: 5,
}
_DEFAULT_BANDS: dict[str, dict[str, int]] = {
    "low": {"min": 0, "max": 34},
    "medium": {"min": 35, "max": 69},
    "high": {"min": 70, "max": 100},
}
_DEFAULT_PRESENT_STATUSES = ("Uploaded", "Processing", "Needs Review", "Flagged", "Verified")
_MAX_SCORE = 100

_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y")


# --- input normalisation ----------------------------------------------------
# Extracted fields arrive in two shapes depending on the producer: a flat
# `{key: value}` map from a seed or an admin correction, or a rich
# `{key: {"value": ..., "confidence": ...}}` map from Gemini. Normalising once
# here keeps every rule below free of shape checks.


@dataclass(frozen=True)
class _Field:
    value: str
    confidence: int | None


@dataclass(frozen=True)
class _Document:
    doc_type: str
    status: str
    confidence: int | None
    fields: dict[str, _Field]


def _normalise_fields(raw: Any) -> dict[str, _Field]:
    if not isinstance(raw, Mapping):
        return {}
    fields: dict[str, _Field] = {}
    for key, item in raw.items():
        if isinstance(item, Mapping):
            value = item.get("value")
            confidence = item.get("confidence")
        else:
            value, confidence = item, None
        if value is None:
            continue
        fields[str(key).strip().lower()] = _Field(
            value=str(value),
            confidence=int(confidence) if isinstance(confidence, (int, float)) else None,
        )
    return fields


def _get(fields: Mapping[str, _Field], aliases: Iterable[str]) -> _Field | None:
    for alias in aliases:
        found = fields.get(alias.strip().lower())
        if found is not None and found.value.strip():
            return found
    return None


def _normalise_identifier(value: str) -> str:
    """Casefold and drop separators, so `27-AAA-1Z5` == `27 aaa 1z5`."""
    return "".join(ch for ch in value.lower() if ch.isalnum())


def _normalise_address(value: str) -> str:
    """Collapse punctuation and whitespace.

    Deliberately crude: this decides whether two strings are *the same
    address*, not whether an address is valid. Anything cleverer would stop
    being reproducible, and reproducibility is the point of this module.
    """
    cleaned = "".join(ch if ch.isalnum() else " " for ch in value.lower())
    return " ".join(cleaned.split())


def _parse_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _months_between(earlier: date, later: date) -> int:
    months = (later.year - earlier.year) * 12 + (later.month - earlier.month)
    if later.day < earlier.day:
        months -= 1
    return months


# --- rule configuration -----------------------------------------------------


class _Rules:
    """Typed accessor over `risk_rules.json`, with spec defaults for gaps."""

    def __init__(self, raw: Mapping[str, Any] | None) -> None:
        self._raw: Mapping[str, Any] = raw if isinstance(raw, Mapping) else {}
        self._by_code: dict[str, Mapping[str, Any]] = {
            str(entry.get("code")): entry
            for entry in self._raw.get("drivers", [])
            if isinstance(entry, Mapping) and entry.get("code")
        }

    def points(self, code: DriverCode) -> int:
        entry = self._by_code.get(code.value, {})
        return max(0, int(entry.get("points", _DEFAULT_POINTS[code])))

    def description(self, code: DriverCode) -> str:
        entry = self._by_code.get(code.value, {})
        return str(entry.get("description") or code.value.replace("_", " ").title())

    def enabled(self, code: DriverCode) -> bool:
        """A driver removed from the JSON is switched off, not defaulted on.

        That is the point of the file being editable: deleting a rule has to
        mean something. A weight of 0 keeps a rule visible but non-scoring.
        """
        return not self._by_code or code.value in self._by_code

    @property
    def bands(self) -> Mapping[str, Any]:
        bands = self._raw.get("bands")
        return bands if isinstance(bands, Mapping) else _DEFAULT_BANDS

    @property
    def low_confidence_threshold(self) -> int:
        return int(self._raw.get("low_confidence_threshold", 60))

    @property
    def vendor_age_months(self) -> int:
        return int(self._raw.get("vendor_age_months", 6))

    @property
    def required_documents(self) -> Mapping[str, str]:
        mapping = self._raw.get("required_documents")
        if isinstance(mapping, Mapping):
            return {str(key): str(value) for key, value in mapping.items()}
        return {
            DriverCode.tax_missing.value: "TAX",
            DriverCode.bank_proof_missing.value: "BANK",
        }

    @property
    def insurance_document_type(self) -> str:
        return str(self._raw.get("insurance_document_type", "COI"))

    @property
    def present_statuses(self) -> set[str]:
        raw = self._raw.get("present_document_statuses")
        values = raw if isinstance(raw, list) else list(_DEFAULT_PRESENT_STATUSES)
        return {str(value).strip().lower() for value in values}

    def aliases(self, group: str) -> list[str]:
        raw = self._raw.get("field_aliases")
        if isinstance(raw, Mapping):
            values = raw.get(group)
            if isinstance(values, list):
                return [str(value) for value in values]
        return [group]

    def recommendation(self, key: str, fallback: str) -> str:
        raw = self._raw.get("recommendations")
        if isinstance(raw, Mapping):
            value = raw.get(key)
            if isinstance(value, str) and value:
                return value
        return fallback


# --- the engine -------------------------------------------------------------


def calculate(
    vendor: Mapping[str, Any],
    documents: Iterable[Mapping[str, Any]] | None = None,
    rules: Mapping[str, Any] | None = None,
    *,
    as_of: date | None = None,
) -> RiskResult:
    """`calculate(vendor, documents) -> RiskResult` (spec §12).

    Args:
        vendor: the vendor row. Reads `registered_on` (falling back to
            `submission_date`) for the vendor-age driver.
        documents: that vendor's documents, each with `doc_type`, `status`,
            `confidence` and `extracted_fields`.
        rules: the point table; `settings/risk_rules.json` is loaded when
            omitted.
        as_of: evaluation date. Injected rather than read from the clock so a
            result is reproducible in tests and a recalculation can be replayed
            for a past date.

    Returns:
        Score (0–100), banded level, every driver that fired with its points,
        and a recommendation.
    """
    config = _Rules(rules if rules is not None else risk_rules())
    today = as_of or datetime.now(UTC).date()
    present = _index_present_documents(documents or [], config)
    drivers: list[RiskDriver] = []

    def fire(code: DriverCode, detail: str | None = None) -> None:
        if not config.enabled(code):
            return
        description = config.description(code)
        drivers.append(
            RiskDriver(
                code=code,
                points=config.points(code),
                description=f"{description} - {detail}" if detail else description,
            )
        )

    # --- missing mandatory documents ---
    for driver_code, doc_type in config.required_documents.items():
        try:
            code = DriverCode(driver_code)
        except ValueError:
            continue  # an unknown code in the JSON is ignored, not a crash
        if doc_type.upper() not in present:
            fire(code, f"no {doc_type.upper()} document on file")

    # --- insurance expiry ---
    insurance = present.get(config.insurance_document_type.upper())
    if insurance is not None:
        expiry_field = _get(insurance.fields, config.aliases("expiry"))
        expiry = _parse_date(expiry_field.value) if expiry_field else None
        if expiry is not None and expiry < today:
            fire(DriverCode.insurance_expired, f"expired {expiry.isoformat()}")

    # --- cross-document consistency ---
    gst_values = _distinct_across_documents(
        present.values(), config.aliases("gst"), _normalise_identifier
    )
    if len(gst_values) > 1:
        fire(DriverCode.gst_mismatch, f"{len(gst_values)} distinct values across documents")

    address_values = _distinct_across_documents(
        present.values(), config.aliases("address"), _normalise_address
    )
    if len(address_values) > 1:
        fire(DriverCode.address_mismatch, f"{len(address_values)} distinct values across documents")

    # --- extraction confidence ---
    threshold = config.low_confidence_threshold
    lowest = _lowest_confidence(present.values())
    if lowest is not None and lowest < threshold:
        fire(DriverCode.low_ai_confidence, f"lowest confidence {lowest}% (threshold {threshold}%)")

    # --- vendor age ---
    registered = _vendor_registration_date(vendor)
    if registered is not None:
        age_months = _months_between(registered, today)
        if age_months < config.vendor_age_months:
            fire(
                DriverCode.vendor_age_under_6_months,
                f"registered {registered.isoformat()} ({max(age_months, 0)} months ago)",
            )

    # Highest-weight finding first: a reviewer reads top-down, and the top line
    # should be the reason this vendor is in this band.
    drivers.sort(key=lambda driver: (-driver.points, driver.code.value))

    score = min(sum(driver.points for driver in drivers), _MAX_SCORE)
    level = band_for(score, config.bands)
    return RiskResult(
        score=score,
        level=level,
        drivers=drivers,
        recommendation=_recommendation(config, level, bool(drivers)),
    )


def _index_present_documents(
    documents: Iterable[Mapping[str, Any]], config: _Rules
) -> dict[str, _Document]:
    """Index by doc type, keeping only documents that count as provided.

    A `Missing` placeholder row exists so the checklist can render it; counting
    it as present would make the missing-document drivers unreachable.
    """
    present_statuses = config.present_statuses
    indexed: dict[str, _Document] = {}
    for raw in documents:
        if not isinstance(raw, Mapping):
            continue
        status = str(raw.get("status") or "").strip()
        if status.lower() not in present_statuses:
            continue
        doc_type = str(raw.get("doc_type") or raw.get("code") or "").strip().upper()
        if not doc_type:
            continue
        confidence = raw.get("confidence")
        indexed[doc_type] = _Document(
            doc_type=doc_type,
            status=status,
            confidence=int(confidence) if isinstance(confidence, (int, float)) else None,
            fields=_normalise_fields(raw.get("extracted_fields")),
        )
    return indexed


def _distinct_across_documents(
    documents: Iterable[_Document],
    aliases: list[str],
    normalise: Callable[[str], str],
) -> set[str]:
    values: set[str] = set()
    for document in documents:
        found = _get(document.fields, aliases)
        if found is None:
            continue
        normalised = normalise(found.value)
        if normalised:
            values.add(normalised)
    return values


def _lowest_confidence(documents: Iterable[_Document]) -> int | None:
    """The weakest signal anywhere, document-level or field-level.

    Minimum rather than average, deliberately: one field extracted at 20%
    confidence is a review trigger even when nine others came back at 99%, and
    an average would hide it.
    """
    scores: list[int] = []
    for document in documents:
        if document.confidence is not None:
            scores.append(document.confidence)
        scores.extend(
            item.confidence for item in document.fields.values() if item.confidence is not None
        )
    return min(scores) if scores else None


def _vendor_registration_date(vendor: Mapping[str, Any]) -> date | None:
    """Entity registration date, falling back to submission date.

    The fallback errs conservative: a vendor whose registration date was never
    captured is treated as young, so the driver fires rather than silently
    being skipped.
    """
    for key in ("registered_on", "registration_date", "incorporated_on", "submission_date"):
        raw = vendor.get(key)
        if raw is None:
            continue
        if isinstance(raw, datetime):
            return raw.date()
        if isinstance(raw, date):
            return raw
        parsed = _parse_date(str(raw))
        if parsed is not None:
            return parsed
    return None


def band_for(score: int, bands: Mapping[str, Any] | None = None) -> RiskLevel:
    """Map a score onto its band. Exposed so every caller bands identically."""
    table = bands if isinstance(bands, Mapping) else _DEFAULT_BANDS
    for name, level in (("low", RiskLevel.low), ("medium", RiskLevel.medium)):
        entry = table.get(name)
        if isinstance(entry, Mapping) and score <= int(entry.get("max", 0)):
            return level
    return RiskLevel.high


def _recommendation(config: _Rules, level: RiskLevel, has_drivers: bool) -> str:
    if not has_drivers:
        return config.recommendation("clean", "Approve - every checked rule passed.")
    fallbacks = {
        "low": "Approve - no blocking findings.",
        "medium": "Review before approval. Resolve the findings below.",
        "high": "Do not approve as-is. Request corrected documents.",
    }
    return config.recommendation(level.name, fallbacks[level.name])

"""Editable-without-redeploy configuration (spec §13).

`countries.json`, `risk_rules.json`, `document_types.json` and `sla.json` are
loaded at startup rather than baked into code, so risk weights or document
types can be tuned from the Settings screen without a deploy.

Spec §14 lists hot-reload as deferrable; loading from JSON at boot is the seam
that makes adding it later a one-function change.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_SETTINGS_DIR = Path(__file__).parent
_FILES = ("countries", "risk_rules", "document_types", "sla")


def _read(name: str) -> dict[str, Any]:
    path = _SETTINGS_DIR / f"{name}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def load_settings_pack() -> dict[str, dict[str, Any]]:
    """Load every settings file once. Clear the cache to hot-reload."""
    return {name: _read(name) for name in _FILES}


def risk_rules() -> dict[str, Any]:
    """The spec §12 point table, as data."""
    return load_settings_pack().get("risk_rules", {})

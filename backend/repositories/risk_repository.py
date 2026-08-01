"""Risk driver persistence (spec §4 `vendor_risk_drivers`).

Stores the *decomposition* of a score, not just the number. A score a reviewer
cannot decompose is not explainable, and explainability is the stated design
philosophy (spec §12).
"""

from __future__ import annotations

from typing import Any, ClassVar

from repositories.base import BaseRepository


class RiskRepository(BaseRepository):
    table: ClassVar[str] = "vendor_risk_drivers"

    async def list_drivers(self, vendor_id: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def replace_drivers(
        self, vendor_id: str, drivers: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Overwrite the driver set after a recalculation."""
        raise NotImplementedError

    async def clear_drivers(self, vendor_id: str) -> None:
        raise NotImplementedError

"""Vendor persistence (spec §4 `vendors`)."""

from __future__ import annotations

from typing import Any, ClassVar

from repositories.base import BaseRepository


class VendorRepository(BaseRepository):
    table: ClassVar[str] = "vendors"
    approval_history_table: ClassVar[str] = "approval_history"

    async def list_vendors(
        self,
        *,
        status: str | None = None,
        country: str | None = None,
        risk_level: str | None = None,
        priority: str | None = None,
        assigned_executive: str | None = None,
        search: str | None = None,
        sort_by: str = "submission_date",
        descending: bool = True,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Filterable/sortable list, per the spec §8 columns."""
        raise NotImplementedError

    async def get_vendor(self, vendor_id: str) -> dict[str, Any]:
        raise NotImplementedError

    async def update_status(
        self,
        vendor_id: str,
        *,
        status: str,
        risk_score: int | None = None,
        risk_level: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    async def record_decision(
        self,
        vendor_id: str,
        *,
        decision: str,
        comment: str,
        reviewer: str,
    ) -> dict[str, Any]:
        """Write `approval_history`.

        Spec §11: this and the `activity_log` write happen in the same
        transaction as the status mutation itself.
        """
        raise NotImplementedError

    async def count_by_status(self) -> dict[str, int]:
        raise NotImplementedError

    async def count_by_risk_level(self) -> dict[str, int]:
        raise NotImplementedError

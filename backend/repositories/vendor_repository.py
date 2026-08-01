"""Vendor persistence (spec §4 `vendors`, `approval_history`)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import Select, func, or_, select

from models.orm import ApprovalHistory, Vendor
from repositories.base import BaseRepository, parse_uuid

# Whitelist, not `getattr(Vendor, sort_by)`: an arbitrary attribute name from a
# query string is an injection surface and an easy 500 (`?sortBy=metadata`).
SORTABLE_COLUMNS: dict[str, Any] = {
    "submission_date": Vendor.submission_date,
    "company_name": Vendor.company_name,
    "country": Vendor.country,
    "status": Vendor.status,
    "risk_score": Vendor.risk_score,
    "priority": Vendor.priority,
    "created_at": Vendor.created_at,
    "updated_at": Vendor.updated_at,
}
DEFAULT_SORT = "submission_date"


class VendorRepository(BaseRepository[Vendor]):
    model: ClassVar[type[Vendor]] = Vendor

    def _filtered(
        self,
        *,
        status: str | None,
        country: str | None,
        risk_level: str | None,
        priority: str | None,
        assigned_executive: str | None,
        search: str | None,
    ) -> Select[tuple[Vendor]]:
        statement = select(Vendor)
        if status:
            statement = statement.where(Vendor.status == status)
        if country:
            statement = statement.where(Vendor.country == country)
        if risk_level:
            statement = statement.where(Vendor.risk_level == risk_level)
        if priority:
            statement = statement.where(Vendor.priority == priority)
        if assigned_executive:
            statement = statement.where(Vendor.assigned_vendor_executive == assigned_executive)
        if search:
            # `ilike` with a leading wildcard cannot use a b-tree index. Fine at
            # this table's size; the upgrade is a pg_trgm GIN index on
            # company_name, not a different query shape.
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Vendor.company_name.ilike(pattern),
                    Vendor.contact_email.ilike(pattern),
                    Vendor.tax_id.ilike(pattern),
                )
            )
        return statement

    async def list_vendors(
        self,
        *,
        status: str | None = None,
        country: str | None = None,
        risk_level: str | None = None,
        priority: str | None = None,
        assigned_executive: str | None = None,
        search: str | None = None,
        sort_by: str = DEFAULT_SORT,
        descending: bool = True,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[Vendor], int]:
        """Filterable, sortable page plus the unpaginated total (spec §8)."""
        statement = self._filtered(
            status=status,
            country=country,
            risk_level=risk_level,
            priority=priority,
            assigned_executive=assigned_executive,
            search=search,
        )
        column = SORTABLE_COLUMNS.get(sort_by, SORTABLE_COLUMNS[DEFAULT_SORT])
        # NULLs last in both directions: a vendor with no submission date is
        # never the most interesting row on page 1.
        ordering = column.desc().nullslast() if descending else column.asc().nullslast()
        # Tie-break on the primary key, or rows with equal sort values can
        # appear on two pages and never on a third.
        statement = statement.order_by(ordering, Vendor.id.asc())
        return await self.paginate(statement, limit=limit, offset=offset)

    async def get_vendor(self, vendor_id: str | UUID) -> Vendor:
        return await self.get_or_404(vendor_id)

    async def update_status(
        self,
        vendor: Vendor,
        *,
        status: str,
        stage: str | None = None,
    ) -> Vendor:
        vendor.status = status
        if stage is not None:
            vendor.stage = stage
        await self.session.flush()
        return vendor

    async def set_risk(
        self,
        vendor: Vendor,
        *,
        score: int,
        level: str,
        calculated_at: datetime | None = None,
    ) -> Vendor:
        """Persist the score the risk engine produced.

        Cached on the vendor row because the list view sorts and filters by it;
        the authoritative decomposition lives in `vendor_risk_drivers`.
        """
        vendor.risk_score = score
        vendor.risk_level = level
        vendor.risk_calculated_at = calculated_at or datetime.now(UTC)
        await self.session.flush()
        return vendor

    async def record_decision(
        self,
        vendor_id: str | UUID,
        *,
        decision: str,
        comment: str,
        reviewer: str,
    ) -> ApprovalHistory:
        """Append to `approval_history`.

        No commit: spec §11 requires this, the status mutation and the
        `activity_log` entry to land in one transaction, which the session
        dependency commits as a unit.
        """
        entry = ApprovalHistory(
            vendor_id=parse_uuid(vendor_id, field="vendor_id"),
            decision=decision,
            comment=comment,
            reviewer=reviewer,
        )
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def list_decisions(self, vendor_id: str | UUID) -> list[ApprovalHistory]:
        result = await self.session.execute(
            select(ApprovalHistory)
            .where(ApprovalHistory.vendor_id == parse_uuid(vendor_id, field="vendor_id"))
            .order_by(ApprovalHistory.decided_at.desc())
        )
        return list(result.scalars().all())

    # --- aggregates ---------------------------------------------------------

    async def count_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Vendor.status, func.count()).group_by(Vendor.status)
        )
        return {status: int(count) for status, count in result.all()}

    async def count_by_risk_level(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Vendor.risk_level, func.count())
            .where(Vendor.risk_level.is_not(None))
            .group_by(Vendor.risk_level)
        )
        return {level: int(count) for level, count in result.all()}

    async def count_by_country(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Vendor.country, func.count())
            .where(Vendor.country.is_not(None))
            .group_by(Vendor.country)
            .order_by(func.count().desc())
        )
        return {country: int(count) for country, count in result.all()}

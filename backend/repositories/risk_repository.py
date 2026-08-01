"""Risk driver persistence (spec §4 `vendor_risk_drivers`).

Stores the *decomposition* of a score, not just the number. A score a reviewer
cannot decompose is not explainable, and explainability is the stated design
philosophy (spec §12).
"""

from __future__ import annotations

from typing import ClassVar
from uuid import UUID

from sqlalchemy import delete, select

from core.risk_engine import RiskResult
from models.orm import VendorRiskDriver
from repositories.base import BaseRepository, parse_uuid


class RiskRepository(BaseRepository[VendorRiskDriver]):
    model: ClassVar[type[VendorRiskDriver]] = VendorRiskDriver

    async def list_drivers(self, vendor_id: str | UUID) -> list[VendorRiskDriver]:
        result = await self.session.execute(
            select(VendorRiskDriver)
            .where(VendorRiskDriver.vendor_id == parse_uuid(vendor_id, field="vendor_id"))
            .order_by(VendorRiskDriver.points.desc(), VendorRiskDriver.driver_code.asc())
        )
        return list(result.scalars().all())

    async def replace_drivers(
        self, vendor_id: str | UUID, result: RiskResult
    ) -> list[VendorRiskDriver]:
        """Overwrite the driver set after a recalculation.

        Delete-then-insert rather than a diff: the engine's output is the whole
        truth for this vendor, and a driver that stopped firing must disappear.
        Both statements are in the caller's transaction, so there is no window
        in which a vendor has no drivers.
        """
        vendor_uuid = parse_uuid(vendor_id, field="vendor_id")
        await self.session.execute(
            delete(VendorRiskDriver).where(VendorRiskDriver.vendor_id == vendor_uuid)
        )
        drivers = [
            VendorRiskDriver(
                vendor_id=vendor_uuid,
                driver_code=driver.code.value,
                points=driver.points,
                description=driver.description,
            )
            for driver in result.drivers
        ]
        self.session.add_all(drivers)
        await self.session.flush()
        return drivers

    async def clear_drivers(self, vendor_id: str | UUID) -> None:
        await self.session.execute(
            delete(VendorRiskDriver).where(
                VendorRiskDriver.vendor_id == parse_uuid(vendor_id, field="vendor_id")
            )
        )
        await self.session.flush()

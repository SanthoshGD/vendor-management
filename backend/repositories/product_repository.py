"""Product catalog persistence (spec §4 `products`)."""

from __future__ import annotations

from typing import ClassVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import joinedload

from models.orm import Product
from repositories.base import BaseRepository, parse_uuid


class ProductRepository(BaseRepository[Product]):
    model: ClassVar[type[Product]] = Product

    def _filtered(
        self,
        *,
        vendor_id: str | UUID | None,
        approval_status: str | None,
        category: str | None,
        country: str | None,
        search: str | None,
    ) -> Select[tuple[Product]]:
        # Eager-load the vendor: the catalog renders the vendor name on every
        # row, and lazy loading it would be one query per product.
        statement = select(Product).options(joinedload(Product.vendor))
        if vendor_id:
            statement = statement.where(Product.vendor_id == parse_uuid(vendor_id,
                                                                        field="vendorId"))
        if approval_status:
            statement = statement.where(Product.approval_status == approval_status)
        if category:
            statement = statement.where(Product.category == category)
        if country:
            statement = statement.where(Product.country == country)
        if search:
            statement = statement.where(Product.name.ilike(f"%{search.strip()}%"))
        return statement

    async def list_products(
        self,
        *,
        vendor_id: str | UUID | None = None,
        approval_status: str | None = None,
        category: str | None = None,
        country: str | None = None,
        search: str | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[Product], int]:
        statement = self._filtered(
            vendor_id=vendor_id,
            approval_status=approval_status,
            category=category,
            country=country,
            search=search,
        ).order_by(Product.created_at.desc(), Product.id.asc())
        return await self.paginate(statement, limit=limit, offset=offset)

    async def get_product(self, product_id: str | UUID) -> Product:
        return await self.get_or_404(product_id)

    async def count_by_status(self, vendor_id: str | UUID | None = None) -> dict[str, int]:
        statement = select(Product.approval_status, func.count()).group_by(Product.approval_status)
        if vendor_id is not None:
            statement = statement.where(
                Product.vendor_id == parse_uuid(vendor_id, field="vendorId")
            )
        result = await self.session.execute(statement)
        return {status: int(count) for status, count in result.all()}

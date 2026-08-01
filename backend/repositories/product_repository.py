"""Product catalog persistence (spec §4 `products`)."""

from __future__ import annotations

from typing import Any, ClassVar

from repositories.base import BaseRepository


class ProductRepository(BaseRepository):
    table: ClassVar[str] = "products"

    async def list_products(
        self,
        *,
        vendor_id: str | None = None,
        approval_status: str | None = None,
        category: str | None = None,
        country: str | None = None,
        search: str | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        raise NotImplementedError

    async def get_product(self, product_id: str) -> dict[str, Any]:
        raise NotImplementedError

    async def count_by_status(self, vendor_id: str | None = None) -> dict[str, int]:
        raise NotImplementedError

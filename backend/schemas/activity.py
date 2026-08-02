"""Audit trail contracts - mirrors `types/audit.ts` (spec §4, §11).

Note what is absent from any *request* model: actor and timestamp. Both are
derived server-side from the session and the server clock, never accepted from
a client. That is what makes the trail non-forgeable.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from core.response import CamelModel


from uuid import UUID

class ActivityEntry(CamelModel):
    id: UUID | str
    vendor_id: UUID | str | None = None
    actor: str
    action: str
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    reason: str | None = None
    ip_address: Any = None
    created_at: datetime


class ActivityFilters(CamelModel):
    vendor_id: str | None = None
    actor: str | None = None
    action: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    search: str | None = Field(default=None, max_length=200)

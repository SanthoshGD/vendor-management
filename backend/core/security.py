"""Auth and role enforcement (spec §15).

Supabase Auth owns identity. FastAPI validates the Supabase JWT on every
request and enforces role-based access:

* `admin` — portal-wide.
* `vendor` — limited to its own vendor record.

There is no third "Vendor Executive" login; per spec it is an assignment field
only. RLS in Supabase is defence-in-depth, not the primary gate, because the
backend holds the service-role key.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Role(str, Enum):
    admin = "admin"
    vendor = "vendor"


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated principal.

    Everything actor-related — audit attribution, role checks, vendor scoping —
    reads from here and never from a request body or a client-controlled
    header. That is what makes the audit trail non-forgeable.
    """

    id: str
    email: str | None
    name: str | None
    role: Role
    vendor_id: str | None = None  # set for vendor-role users only

    @property
    def is_admin(self) -> bool:
        return self.role is Role.admin


def decode_supabase_jwt(token: str, *, secret: str, audience: str) -> dict:
    """Verify signature, expiry and audience; return the claims."""
    raise NotImplementedError


def user_from_claims(claims: dict) -> CurrentUser:
    """Map Supabase JWT claims onto `CurrentUser`."""
    raise NotImplementedError


def assert_can_access_vendor(user: CurrentUser, vendor_id: str) -> None:
    """Raise `ForbiddenError` if a vendor-role user reaches another vendor.

    Called by every vendor-scoped route. Being a plain function rather than a
    decorator keeps the check visible at the call site.
    """
    raise NotImplementedError

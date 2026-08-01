"""Auth and role enforcement (spec §15).

Supabase Auth owns identity. FastAPI validates the Supabase JWT on every
request and enforces role-based access:

* `admin` — portal-wide.
* `vendor` — limited to its own vendor record.

There is no third "Vendor Executive" login; per spec it is an assignment field
only. RLS in Supabase is defence in depth, not the primary gate, because the
backend holds the service-role key.

Supabase signs project JWTs with HS256 using the project's JWT secret. Both the
signature and the `aud` claim are verified — checking the signature alone would
accept a token minted for a different Supabase project that happens to share a
leaked secret.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

import jwt

from core.exceptions import ForbiddenError, UnauthorizedError
from core.logger import get_logger

logger = get_logger(__name__)


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

    @property
    def display_name(self) -> str:
        """What lands in `activity_log.actor`.

        Falls back through name, email, then id — an audit entry attributed to
        an empty string is worse than one attributed to a UUID.
        """
        return self.name or self.email or self.id


def decode_supabase_jwt(
    token: str,
    *,
    secret: str | None,
    audience: str,
    algorithms: list[str] | None = None,
) -> dict[str, Any]:
    """Verify signature, expiry and audience; return the claims."""
    if not secret:
        raise UnauthorizedError("Token verification is not configured on this server.")
    if not token:
        raise UnauthorizedError("A bearer token is required.")

    try:
        return jwt.decode(
            token,
            secret,
            algorithms=algorithms or ["HS256"],
            audience=audience,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("The session has expired.") from exc
    except jwt.InvalidAudienceError as exc:
        raise UnauthorizedError("The token was issued for a different audience.") from exc
    except jwt.InvalidTokenError as exc:
        # One message for every remaining failure mode. Telling a caller
        # whether the signature or the structure was wrong helps an attacker
        # more than it helps a client.
        logger.info("jwt_rejected: %s", type(exc).__name__)
        raise UnauthorizedError("The token is invalid.") from exc


def user_from_claims(claims: dict[str, Any]) -> CurrentUser:
    """Map Supabase JWT claims onto `CurrentUser`.

    Supabase splits custom claims across `app_metadata` (server-controlled) and
    `user_metadata` (user-writable). Role is read from `app_metadata` only —
    `user_metadata` can be edited by the account holder, so trusting it would
    let any vendor promote themselves to admin.
    """
    subject = claims.get("sub")
    if not subject:
        raise UnauthorizedError("The token carries no subject.")

    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}

    raw_role = app_metadata.get("role") or claims.get("role")
    try:
        role = Role(str(raw_role).lower())
    except (ValueError, AttributeError):
        # Supabase issues `role: "authenticated"` by default. Anything not
        # explicitly admin is a vendor — the lower privilege is the safe
        # default when a claim is missing or unrecognised.
        role = Role.vendor

    vendor_id = app_metadata.get("vendor_id")

    return CurrentUser(
        id=str(subject),
        email=claims.get("email"),
        # Display name may come from user_metadata: it is cosmetic, and the
        # audit trail stores the id alongside it.
        name=user_metadata.get("full_name") or user_metadata.get("name"),
        role=role,
        vendor_id=str(vendor_id) if vendor_id else None,
    )


def assert_can_access_vendor(user: CurrentUser, vendor_id: str) -> None:
    """Raise `ForbiddenError` if a vendor-role user reaches another vendor.

    Called by every vendor-scoped route. A plain function rather than a
    decorator so the check stays visible at the call site — an authorisation
    rule hidden in a decorator is one nobody notices is missing.
    """
    if user.is_admin:
        return
    if user.vendor_id and str(user.vendor_id) == str(vendor_id):
        return
    logger.warning(
        "vendor_scope_violation",
        extra={"user_id": user.id, "requested_vendor": vendor_id},
    )
    raise ForbiddenError("You do not have access to this vendor.")


def assert_admin(user: CurrentUser) -> None:
    if not user.is_admin:
        raise ForbiddenError("This action requires an administrator.")

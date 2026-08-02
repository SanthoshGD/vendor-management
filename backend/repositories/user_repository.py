"""User persistence (spec §4 `users`, §15).

Bridges Supabase Auth identities into this database. Two roles only - admin and
vendor. "Vendor Executive" is an assignment field on `vendors`, not a login.
"""

from __future__ import annotations

from typing import ClassVar
from uuid import UUID

from sqlalchemy import select

from models.orm import User
from repositories.base import BaseRepository, parse_uuid


class UserRepository(BaseRepository[User]):
    model: ClassVar[type[User]] = User

    async def find_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def upsert_from_claims(
        self,
        *,
        user_id: str | UUID,
        email: str | None,
        name: str | None,
        role: str,
        vendor_id: str | UUID | None = None,
    ) -> User:
        """Mirror a Supabase Auth identity into `users`.

        The id is Supabase's, not generated here, so the two systems agree on
        who a principal is. Role is taken from the verified JWT claims, never
        from a request body - a self-declared role is not a role.
        """
        uid = parse_uuid(user_id, field="user_id")
        user = await self.session.get(User, uid)
        if user is None:
            user = User(id=uid)
            self.session.add(user)
        user.email = email.lower() if email else None
        user.name = name
        user.role = role
        user.vendor_id = parse_uuid(vendor_id, field="vendor_id") if vendor_id else None
        await self.session.flush()
        await self.session.refresh(user)
        return user

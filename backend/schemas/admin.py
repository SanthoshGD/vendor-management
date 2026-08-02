"""Admin contracts - Gemini key pool management (spec §6.3).

Keys can be added or disabled without a redeploy, surfaced later in Admin
Settings.

`GeminiKeyOut` deliberately has no field that could carry the secret. Spec §6.3
forbids logging full key values; exposing one through an API response would be
strictly worse.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field

from core.response import CamelModel


class KeyStatus(str, Enum):
    active = "active"
    cooling_down = "cooling_down"
    disabled = "disabled"


class GeminiKeyOut(CamelModel):
    id: str
    key_label: str
    masked_key: str = Field(description="Label plus last 4 characters only.")
    status: KeyStatus
    daily_quota: int = Field(ge=0)
    used_today: int = Field(ge=0)
    priority: int
    last_used_at: datetime | None = None
    last_error: str | None = None
    cooldown_until: datetime | None = None


class CreateGeminiKeyRequest(CamelModel):
    key_label: str = Field(min_length=1, max_length=100)
    api_key: str = Field(min_length=10, description="Encrypted at rest before insert.")
    daily_quota: int = Field(default=0, ge=0)
    priority: int = Field(default=100)


class UpdateGeminiKeyRequest(CamelModel):
    status: KeyStatus | None = None
    daily_quota: int | None = Field(default=None, ge=0)
    priority: int | None = None


class SessionRequest(CamelModel):
    """Spec §8 `POST /api/v1/auth/session` - bridges a Supabase Auth session."""

    access_token: str = Field(min_length=10)


class SessionResponse(CamelModel):
    user_id: str
    email: str | None = None
    name: str | None = None
    role: str
    vendor_id: str | None = None
    expires_at: datetime | None = None

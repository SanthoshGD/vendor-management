"""Application settings (spec §16).

Single source of truth for configuration. Values come from the process
environment (Railway service variables) falling back to a local `.env`.
Nothing else in the codebase calls `os.getenv` directly, so `.env.example`
stays a complete and accurate contract.

Variable names follow spec §16 exactly — `SUPABASE_SERVICE_ROLE_KEY`,
`MASTER_ENCRYPTION_KEY`, `FRONTEND_ORIGIN` — so Railway variables set from the
plan work without translation.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]
LogFormat = Literal["json", "console"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "StyleSphere Nexus API"
    app_version: str = "0.1.0"
    environment: Environment = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"  # spec §8: versioned from day one

    host: str = "0.0.0.0"
    port: int = 8000

    # --- Supabase (spec §16) ---
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_anon_key: str | None = None
    supabase_schema: str = "public"

    # --- Gemini (spec §6) ---
    # Dev-only bootstrap list. Production keys live encrypted in the
    # `gemini_api_keys` table and are never read from the environment.
    gemini_api_keys_seed: str | None = None
    master_encryption_key: str | None = None
    gemini_chat_model: str = "gemini-2.0-flash"
    gemini_extraction_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "text-embedding-004"
    gemini_max_key_retries: int = 2  # spec §6.2: bounded retry depth

    # --- Auth (spec §15) ---
    jwt_secret: str | None = None
    supabase_jwt_aud: str = "authenticated"

    # --- CORS (spec §19) ---
    frontend_origin: str = "http://localhost:3000"
    extra_cors_origins: list[str] = Field(default_factory=list)
    cors_allow_credentials: bool = True

    # --- Logging (spec §17) ---
    log_level: str = "INFO"
    log_format: LogFormat = "json"

    # --- RAG (spec §7) ---
    rag_chunk_tokens: int = 650
    rag_chunk_overlap_ratio: float = 0.10
    rag_top_k: int = 6
    rag_embedding_dimensions: int = 768  # matches vector(768) in spec §4

    @field_validator("extra_cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalise_level(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value

    @property
    def cors_origins(self) -> list[str]:
        """Spec §19: CORS restricted to FRONTEND_ORIGIN."""
        origins = [self.frontend_origin, *self.extra_cors_origins]
        return list(dict.fromkeys(o for o in origins if o))

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def docs_url(self) -> str | None:
        return None if self.is_production else "/docs"

    @property
    def redoc_url(self) -> str | None:
        return None if self.is_production else "/redoc"

    @property
    def openapi_url(self) -> str | None:
        return None if self.is_production else "/openapi.json"

    def validate_runtime(self) -> list[str]:
        """Configuration problems. Fatal in production, warnings in development."""
        problems: list[str] = []
        if self.environment == "development":
            return problems
        if not self.supabase_url:
            problems.append("SUPABASE_URL is required outside development")
        if not self.supabase_service_role_key:
            problems.append("SUPABASE_SERVICE_ROLE_KEY is required outside development")
        if not self.master_encryption_key:
            problems.append("MASTER_ENCRYPTION_KEY is required to decrypt stored Gemini keys")
        if not self.jwt_secret:
            problems.append("JWT_SECRET is required outside development")
        if self.debug:
            problems.append("DEBUG must be false outside development")
        if "*" in self.cors_origins:
            problems.append("FRONTEND_ORIGIN may not be '*' outside development")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""Application configuration using Pydantic BaseSettings.

All configuration is loaded from environment variables or .env.
No os.getenv elsewhere in the codebase.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _resolve_env_file() -> str | None:
    """Resolve .env path relative to backend root (parent of app/)."""
    backend_root = Path(__file__).resolve().parent.parent.parent
    path = backend_root / ".env"
    return str(path) if path.exists() else None


class Settings(BaseSettings):
    """ClipBuilder settings. Loaded from env and .env."""

    model_config = SettingsConfigDict(
        env_file=_resolve_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Clerk JWT validation
    clerk_issuer: str = ""
    """Clerk issuer URL (e.g. https://your-site.clerk.accounts.dev). Used to validate `iss` and derive JWKS URL."""

    clerk_jwks_uri: str | None = None
    """Optional. If unset, derived as {clerk_issuer}/.well-known/jwks.json."""

    jwks_cache_ttl_seconds: int = 3600
    """TTL for in-memory JWKS cache. Avoids fetching from Clerk on every request."""

    # CORS
    allowed_origins: list[str] = _DEFAULT_ORIGINS
    """Origins allowed by CORS. Also used for `azp` validation when present."""

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return _DEFAULT_ORIGINS
            if raw.startswith("["):
                try:
                    parsed: list[str] = json.loads(raw)
                    return [str(x).strip() for x in parsed if str(x).strip()]
                except json.JSONDecodeError:
                    pass
            return [x.strip() for x in raw.split(",") if x.strip()]
        return _DEFAULT_ORIGINS


def get_settings() -> Settings:
    """Return application settings. Use for FastAPI Depends if needed."""
    return Settings()


settings = get_settings()

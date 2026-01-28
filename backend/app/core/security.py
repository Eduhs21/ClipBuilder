"""Clerk JWT validation using JWKS.

Fetches public keys from Clerk, caches them in memory, and verifies
RS256-signed JWTs. No os.getenv; uses app.core.config.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

import httpx
import jwt
from jwt import PyJWKSet
from jwt.exceptions import PyJWKError

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWKS cache
# ---------------------------------------------------------------------------

_JWKS_CACHE: dict[str, Any] = {}
_JWKS_LOCK = threading.Lock()


def _jwks_uri() -> str:
    """Resolve JWKS URI from config. Uses CLERK_JWKS_URI or derives from CLERK_ISSUER."""
    if settings.clerk_jwks_uri:
        return settings.clerk_jwks_uri.strip()
    base = (settings.clerk_issuer or "").strip().rstrip("/")
    if not base:
        raise ValueError("CLERK_ISSUER or CLERK_JWKS_URI must be set for JWT verification")
    return f"{base}/.well-known/jwks.json"


def _get_cached_jwks() -> dict[str, Any] | None:
    """Return cached JWKS dict if still valid, else None."""
    with _JWKS_LOCK:
        entry = _JWKS_CACHE.get("data")
        expires = _JWKS_CACHE.get("expires_at", 0.0)
    if entry and expires and time.monotonic() < expires:
        return entry
    return None


def _set_cached_jwks(data: dict[str, Any]) -> None:
    """Store JWKS in cache with TTL from config."""
    ttl = max(60, settings.jwks_cache_ttl_seconds)
    with _JWKS_LOCK:
        _JWKS_CACHE["data"] = data
        _JWKS_CACHE["expires_at"] = time.monotonic() + ttl


def _fetch_jwks(uri: str) -> dict[str, Any]:
    """Fetch JWKS JSON from URI. Raises on non-2xx or invalid JSON."""
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(uri)
        resp.raise_for_status()
        out: dict[str, Any] = resp.json()
    if "keys" not in out or not isinstance(out["keys"], list):
        raise ValueError("JWKS response missing or invalid 'keys' array")
    return out


def _get_jwks() -> dict[str, Any]:
    """Return JWKS dict, from cache or by fetching. Thread-safe."""
    cached = _get_cached_jwks()
    if cached is not None:
        return cached
    uri = _jwks_uri()
    try:
        data = _fetch_jwks(uri)
        _set_cached_jwks(data)
        return data
    except Exception as e:
        logger.warning("JWKS fetch failed for %s: %s", uri, e)
        raise


def _get_signing_key(token: str):
    """Resolve signing key for token from cached JWKS. Uses PyJWKSet."""
    jwks_data = _get_jwks()
    jwks = PyJWKSet.from_dict(jwks_data)
    return jwks.get_signing_key_from_jwt(token)


def verify_clerk_token(token: str) -> dict[str, Any]:
    """Verify a Clerk-issued JWT and return its payload.

    Fetches JWKS from Clerk (with in-memory cache), verifies signature (RS256),
    issuer (CLERK_ISSUER), exp, and nbf. Optionally validates `azp` against
    ALLOWED_ORIGINS.

    Args:
        token: Raw JWT string (no \"Bearer \" prefix).

    Returns:
        Decoded payload (e.g. sub, session_id, azp).

    Raises:
        ValueError: Token invalid, expired, wrong issuer, or azp not allowed.
    """
    issuer = (settings.clerk_issuer or "").strip()
    if not issuer:
        raise ValueError("CLERK_ISSUER must be set for JWT verification")

    try:
        signing_key = _get_signing_key(token)
    except PyJWKError as e:
        raise ValueError("Invalid or unsupported JWT (key lookup failed)") from e

    try:
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iss": True,
                "require": ["exp", "nbf"],
            },
        )
    except jwt.ExpiredSignatureError as e:
        raise ValueError("Token has expired") from e
    except jwt.ImmatureSignatureError as e:
        raise ValueError("Token not yet valid") from e
    except jwt.InvalidIssuerError as e:
        raise ValueError("Invalid token issuer") from e
    except jwt.InvalidTokenError as e:
        raise ValueError("Invalid token") from e

    # Optional: validate azp (authorized party) against allowed origins
    azp = payload.get("azp")
    if azp is not None and isinstance(azp, str):
        allowed = list(settings.allowed_origins or [])
        if allowed and azp not in allowed:
            raise ValueError("Token azp not in allowed origins")

    return payload

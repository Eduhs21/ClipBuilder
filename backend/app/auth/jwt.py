"""Create and verify our own JWTs using python-jose."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(sub: str, email: str | None = None) -> str:
    """Create a signed JWT for the given user (sub)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": sub,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }
    if email is not None:
        payload["email"] = email
    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


def verify_token(token: str) -> dict[str, Any]:
    """Verify our JWT and return payload. Raises ValueError if invalid."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e
    sub = payload.get("sub")
    if not sub:
        raise ValueError("Token missing sub")
    return payload

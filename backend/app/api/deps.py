"""FastAPI dependency injection for protected routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException

from app.core.security import verify_clerk_token


def get_current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> dict[str, Any]:
    """Extract and verify JWT from Authorization header; return payload or raise 401/403.

    Expects \"Authorization: Bearer <token>\". Uses Clerk JWKS validation.
    Use as `Depends(get_current_user)` on protected routes.

    Returns:
        Decoded JWT payload (e.g. sub, session_id, azp).

    Raises:
        HTTPException: 401 if header missing/invalid or token invalid; 403 if azp not allowed.
    """
    if not authorization or not isinstance(authorization, str):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )
    raw = authorization.strip()
    if not raw.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )
    token = raw[7:].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )
    try:
        payload = verify_clerk_token(token)
        return payload
    except ValueError as e:
        msg = str(e)
        if "azp" in msg.lower() and "allowed" in msg.lower():
            raise HTTPException(status_code=403, detail=msg) from e
        raise HTTPException(status_code=401, detail=msg) from e


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]

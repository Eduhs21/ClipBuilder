"""FastAPI dependency for current user from our own JWT."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException

from app.auth.jwt import verify_token


def get_current_user_jwt(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> dict[str, Any]:
    """Extract and verify our JWT from Authorization header; return payload or raise 401."""
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
        payload = verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    return payload


CurrentUserJWT = Annotated[dict[str, Any], Depends(get_current_user_jwt)]


def get_current_authorized_user(
    user: CurrentUserJWT,
) -> dict[str, Any]:
    """
    Return user if authorized (role='admin' or email starts with 'eduardo').
    Otherwise raise 403 Forbidden.
    """
    email = (user.get("email") or "").lower()
    # Check if we have the role in the token (need to add to token) or fetch from store
    # For now, let's just fetch from store to be safe and get the latest role
    from app.auth.store import get_user_by_id

    u = get_user_by_id(user.get("sub", ""))
    if not u:
         raise HTTPException(status_code=401, detail="User not found")

    role = u.get("role", "user")
    
    # Authorized logic: Role is admin OR email starts with 'eduardo'
    is_admin = role == "admin"
    is_eduardo = email.startswith("eduardo")
    
    if not (is_admin or is_eduardo):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to use the Doc Pro feature.",
        )
    return u


CurrentAuthorizedUser = Annotated[dict[str, Any], Depends(get_current_authorized_user)]

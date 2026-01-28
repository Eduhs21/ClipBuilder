"""Minimal API router: health check and protected /me."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Public health check. Returns {"status": "ok"}."""
    return {"status": "ok"}


@router.get("/me")
def me(user: CurrentUser) -> dict[str, str | None]:
    """Protected route. Returns JWT payload (sub, session_id, azp) for auth testing."""
    return {
        "sub": user.get("sub"),
        "session_id": user.get("session_id") or user.get("sid"),
        "azp": user.get("azp"),
    }

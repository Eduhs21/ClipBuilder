"""ClipBuilder own JWT auth: register, login, forgot-password, token verification."""

from app.auth.router import router as auth_router

__all__ = ["auth_router"]

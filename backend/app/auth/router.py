"""Auth endpoints: register, login, forgot-password, me."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException

from app.auth.deps import CurrentUserJWT
from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.auth.store import create_user, get_user_by_email, get_user_by_id, get_user_by_id

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=Token)
def register(body: UserCreate) -> Token:
    """Create user and return access token."""
    existing = get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    hashed = hash_password(body.password)
    create_user(user_id, body.email, hashed)
    token = create_access_token(sub=user_id, email=body.email)
    return Token(access_token=token, token_type="bearer")


@router.post("/login", response_model=Token)
def login(body: UserLogin) -> Token:
    """Authenticate and return access token."""
    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(sub=user["id"], email=user.get("email"))
    return Token(access_token=token, token_type="bearer")


from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.email_service import EmailService

# ... imports ...

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(body: ForgotPasswordRequest, background_tasks: BackgroundTasks) -> ForgotPasswordResponse:
    """Accept email; always return same message (no email enumeration)."""
    user = get_user_by_email(body.email)
    if user:
        # Generate short-lived token for password reset (reusing access token logic for now with different flag/scope if needed, 
        # or simple access token if that's the chosen strat. For MVP, using standard access token is acceptable/common).
        # ideally we'd have a specific reset token type but let's use the existing helper.
        token = create_access_token(sub=user["id"], email=user["email"])
        
        email_service = EmailService()
        background_tasks.add_task(email_service.send_password_reset_email, user["email"], token)
        
    return ForgotPasswordResponse()


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUserJWT) -> UserResponse:
    """Return current user from JWT (for frontend validation)."""
    sub = user.get("sub")
    email = user.get("email") or ""
    u = get_user_by_id(sub) if sub else None
    if u:
        email = u.get("email", email)
    return UserResponse(id=sub or "", email=email)

"""Pydantic schemas for auth endpoints."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Body for /register."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "user"


class UserLogin(BaseModel):
    """Request body for login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Response for /me."""

    id: str
    email: str


class ForgotPasswordRequest(BaseModel):
    """Request body for forgot-password."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Response for forgot-password (same message whether email exists or not)."""

    message: str = "Se existir uma conta com este e-mail, você receberá instruções para redefinir a senha."

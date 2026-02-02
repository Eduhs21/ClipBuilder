"""Password hashing and verification using bcrypt directly."""

from __future__ import annotations

import bcrypt

# We use bcrypt directly because passlib 1.7.4 has issues with bcrypt >= 4.0
def hash_password(password: str) -> str:
    """Return bcrypt hash of password."""
    # hashpw requires bytes, returns bytes
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches hashed_password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False

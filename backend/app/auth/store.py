"""Persistent user store using a JSON file."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from app.core.config import settings

# Path to the JSON file for storing users
# We'll use the 'data' directory which is already used for videos
_DATA_DIR = Path(os.getenv("CLIPBUILDER_DATA_DIR", Path(__file__).resolve().parent.parent.parent / "data"))
_USERS_FILE = _DATA_DIR / "users.json"

_users: dict[str, dict[str, Any]] = {}  # email (lower) -> {id, email, hashed_password}


def _load_users() -> None:
    """Load users from JSON file into memory."""
    global _users
    if not _USERS_FILE.exists():
        _users = {}
        return

    try:
        with open(_USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure data is in the expected format (list of user dicts)
            if isinstance(data, list):
                _users = {u["email"].strip().lower(): u for u in data if "email" in u}
            else:
                # Handle legacy or corrupt format if any
                _users = {}
    except (json.JSONDecodeError, OSError):
        _users = {}


def _save_users() -> None:
    """Save in-memory users to JSON file."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(list(_users.values()), f, indent=2)


# Initial load
_load_users()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Return user dict or None."""
    # Reload just in case another process updated it (simple way for now)
    _load_users()
    return _users.get((email or "").strip().lower())


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Return user dict or None."""
    _load_users()
    for u in _users.values():
        if u.get("id") == user_id:
            return u
    return None


def create_user(user_id: str, email: str, hashed_password: str, role: str = "user") -> dict[str, Any]:
    """Store user and return created user dict."""
    _load_users()
    key = (email or "").strip().lower()
    if key in _users:
        raise ValueError("User already exists")
    
    user = {
        "id": user_id, 
        "email": email.strip(), 
        "hashed_password": hashed_password,
        "role": role
    }
    _users[key] = user
    _save_users()
    return user

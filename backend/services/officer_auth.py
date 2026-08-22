"""Officer JWT (HS256) + password hashing. Used only for /api/auth/*, recipients, SMS."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from services.officers_store import create_officer, get_by_email, officer_address, public_officer

_PBKDF2_ITERS = 210_000
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERS)
    return f"pbkdf2_sha256${_PBKDF2_ITERS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters_s, salt_hex, hash_hex = (stored or "").split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iters_s),
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def create_token(officer: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": officer["email"],
        "name": str(officer.get("name") or "").strip(),
        "address": officer_address(officer),
        "exp": now + timedelta(days=7),
        "iat": now,
    }
    token = jwt.encode(payload, settings.OFFICER_JWT_SECRET, algorithm="HS256")
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.OFFICER_JWT_SECRET, algorithms=["HS256"])


def _validate_email(email: str) -> str:
    value = (email or "").strip().lower()
    if not _EMAIL_RE.match(value):
        raise ValueError("Enter a valid email address.")
    return value


def _validate_password(password: str) -> str:
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    return password


def register_officer(payload: dict[str, Any]) -> dict[str, Any]:
    email = _validate_email(str(payload.get("email") or ""))
    password = _validate_password(str(payload.get("password") or ""))
    name = str(payload.get("name") or "").strip()
    address = str(payload.get("address") or payload.get("district") or "").strip()
    officer = create_officer(
        email=email,
        password_hash=hash_password(password),
        name=name,
        address=address,
        district=str(payload.get("district") or ""),
        district_id=payload.get("district_id"),
        state=str(payload.get("state") or ""),
        state_id=payload.get("state_id"),
    )
    pub = public_officer(officer)
    return {"token": create_token(officer), "officer": pub}


def login_officer(payload: dict[str, Any]) -> dict[str, Any]:
    email = _validate_email(str(payload.get("email") or ""))
    password = str(payload.get("password") or "")
    officer = get_by_email(email)
    if officer is None or not verify_password(password, str(officer.get("password_hash") or "")):
        raise ValueError("Invalid email or password.")
    return {"token": create_token(officer), "officer": public_officer(officer)}


async def get_current_officer(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict[str, Any]:
    if creds is None or (creds.scheme or "").lower() != "bearer" or not creds.credentials:
        raise HTTPException(status_code=401, detail="Officer login required.")
    try:
        data = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Sign in again.") from None
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Officer login required.") from None
    email = str(data.get("sub") or "")
    officer = get_by_email(email)
    if officer is None:
        raise HTTPException(status_code=401, detail="Officer login required.")
    return public_officer(officer)

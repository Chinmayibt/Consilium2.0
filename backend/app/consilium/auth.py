from datetime import datetime, timedelta
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Use bcrypt_sha256 to safely handle long passwords without 72-byte limit issues
pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(
    subject: str,
    expires_delta: timedelta,
    secret: str,
    algorithm: str,
) -> str:
    now = datetime.utcnow()
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def create_access_token(user_id: str) -> str:
    expire_minutes = int(
        getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 0)
        or getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    )
    expire = timedelta(minutes=expire_minutes)
    jwt_secret = (
        getattr(settings, "JWT_SECRET", "")
        or getattr(settings, "JWT_SECRET_KEY", "")
    )
    return _create_token(
        subject=user_id,
        expires_delta=expire,
        secret=jwt_secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(user_id: str) -> str:
    refresh_days = int(getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7) or 7)
    expire = timedelta(days=refresh_days)
    refresh_secret = (
        getattr(settings, "JWT_REFRESH_SECRET", "")
        or getattr(settings, "JWT_SECRET_KEY", "")
    )
    return _create_token(
        subject=user_id,
        expires_delta=expire,
        secret=refresh_secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, refresh: bool = False) -> Optional[str]:
    refresh_secret = (
        getattr(settings, "JWT_REFRESH_SECRET", "")
        or getattr(settings, "JWT_SECRET_KEY", "")
    )
    access_secret = (
        getattr(settings, "JWT_SECRET", "")
        or getattr(settings, "JWT_SECRET_KEY", "")
    )
    secret = refresh_secret if refresh else access_secret
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        # Prefer explicit user_id when available (meeting-monitor tokens),
        # otherwise fall back to PMZero-style subject claim.
        user_id = payload.get("user_id")
        if user_id:
            return str(user_id)
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None


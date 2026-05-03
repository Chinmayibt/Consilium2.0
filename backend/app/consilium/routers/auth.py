from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel

from app.consilium.auth import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.consilium.database import get_db
from app.consilium.models.user import UserCreate, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None




async def get_users_collection() -> Collection:
    db = await get_db()
    users: Collection = db["users"]
    users.create_index("email", unique=True)
    return users


@router.post("/signup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate) -> UserPublic:
    users = await get_users_collection()
    if user_in.role not in {"manager", "member"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    avatar_initials = "".join([p[0].upper() for p in user_in.name.split() if p][:2])
    doc: Dict[str, Any] = {
        "name": user_in.name,
        "email": user_in.email,
        "password_hash": hash_password(user_in.password),
        "role": user_in.role,
        "github_link": user_in.github_link,
        "skills": user_in.skills,
        "github_token": None,
        "workspaces": [],
        "avatar_initials": avatar_initials,
        "created_at": datetime.utcnow(),
        "notifications": [],
    }
    try:
        result = await users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    return UserPublic(
        id=str(result.inserted_id),
        name=user_in.name,
        email=user_in.email,
        role=user_in.role,
        github_link=user_in.github_link,
        skills=user_in.skills,
        avatar_initials=avatar_initials,
    )


@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Dict[str, Any]:
    users = await get_users_collection()
    doc = await users.find_one({"email": form_data.username})
    if not doc or not verify_password(form_data.password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    user_id = str(doc["_id"])
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
    )

    user = UserPublic(
        id=user_id,
        name=doc["name"],
        email=doc["email"],
        role=doc["role"],
        github_link=doc.get("github_link"),
        skills=doc.get("skills", []),
        avatar_initials=doc.get("avatar_initials"),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh")
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    payload: Optional[RefreshRequest] = None,
) -> Dict[str, Any]:
    token = refresh_token or (payload.refresh_token if payload else None)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    user_id = decode_token(token, refresh=True)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_access = create_access_token(user_id)
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"access_token": new_access, "token_type": "bearer"}



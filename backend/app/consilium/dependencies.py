from typing import Annotated, Literal, Optional

from bson import ObjectId
from fastapi import Cookie, Header, HTTPException, status
from pymongo.collection import Collection

from app.consilium.auth import decode_token
from app.consilium.database import get_db
from app.consilium.services.workspace_access import (
    is_workspace_member,
    meets_min_role,
    resolve_effective_role,
)

WorkspaceMinRole = Literal["viewer", "member", "admin"]


async def get_users_collection() -> Collection:
    db = await get_db()
    users: Collection = db["users"]
    return users


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    access_token_cookie: Annotated[Optional[str], Cookie(alias="access_token")] = None,
):
    token: Optional[str] = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    elif access_token_cookie:
        token = access_token_cookie

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    users = await get_users_collection()
    doc = None
    try:
        oid = ObjectId(user_id)
        doc = await users.find_one({"_id": oid})
    except Exception:
        # Backward compatibility: some tokens encode email in `sub`.
        doc = await users.find_one({"email": user_id})

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return doc


async def ensure_workspace_access(
    workspace_id: str,
    current_user: dict,
    *,
    min_role: WorkspaceMinRole = "viewer",
) -> dict:
    """
    Load workspace, require membership, and enforce minimum role
    (viewer < member < admin). Owner is always admin.
    """
    db = await get_db()
    workspaces = db["workspaces"]
    try:
        oid = ObjectId(workspace_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid workspace id")

    ws = await workspaces.find_one({"_id": oid})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    uid = str(current_user["_id"])
    if not is_workspace_member(ws, uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )

    role = resolve_effective_role(ws, uid)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )

    if not meets_min_role(role, min_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires '{min_role}' workspace access or higher",
        )

    return ws


async def ensure_workspace_member(workspace_id: str, current_user: dict) -> dict:
    """Member check with viewer-level access (read-only capable roles)."""
    return await ensure_workspace_access(workspace_id, current_user, min_role="viewer")

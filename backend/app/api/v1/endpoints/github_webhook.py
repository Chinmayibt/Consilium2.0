from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

from app.core.database import get_database
from app.services.github_kanban_sync import handle_github_webhook
from app.consilium.agents.graph import run_graph_for_workspace

router = APIRouter()
logger = logging.getLogger(__name__)


async def _fanout_to_consilium_graph(db, result: dict) -> None:
    project_id = str(result.get("project_id") or "").strip()
    consilium_events = result.get("consilium_events") or []
    if not project_id or not consilium_events:
        return

    cursor = db.workspaces.find({"project_id": project_id}, {"_id": 1})
    workspace_ids = [str(doc["_id"]) async for doc in cursor]
    for workspace_id in workspace_ids:
        await run_graph_for_workspace(workspace_id, github_events=consilium_events)


@router.post("/github")
async def github_webhook(request: Request):
    """GitHub App / webhook: secured with X-Hub-Signature-256 only (no JWT)."""
    body = await request.body()
    hdrs = {k.lower(): v for k, v in request.headers.items()}
    db = await get_database()
    result, err = await handle_github_webhook(db, body, hdrs)
    if err:
        return JSONResponse(content=result, status_code=err)
    try:
        await _fanout_to_consilium_graph(db, result)
    except Exception:
        logger.exception("Consilium webhook fan-out failed")
    return result

import hashlib
from typing import Any, Dict, List

# Shared Kanban statuses (Todo, In Progress, Review, Blocked, Done)
KANBAN_STATUSES: tuple[str, ...] = (
    "todo",
    "in_progress",
    "review",
    "blocked",
    "done",
)


def build_kanban(tasks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group tasks by status into Kanban columns.

    This is the single source of truth used by both the HTTP API
    and the LangGraph orchestrator.
    """
    columns: Dict[str, List[Dict[str, Any]]] = {status: [] for status in KANBAN_STATUSES}
    for task in tasks:
        status = (task.get("status") or "todo").lower()
        if status in columns:
            columns[status].append(task)
        else:
            columns["todo"].append(task)
    return columns


def task_identity(task: Dict[str, Any]) -> str:
    """
    Stable id for a task row (matches ai_task_mapper / monitoring agent logic).
    Used when persisting GitHub-imported or legacy tasks that omit `id`.
    """
    explicit = task.get("id") or task.get("_id") or task.get("task_id")
    if explicit:
        return str(explicit)
    issue_no = task.get("github_issue_number")
    if issue_no is not None and str(issue_no).strip():
        return f"gh-issue:{issue_no}"
    title = str(task.get("title") or "").strip().lower()
    if title:
        return "title:" + hashlib.sha1(title.encode("utf-8")).hexdigest()[:16]
    return ""


def ensure_task_ids(tasks: List[Dict[str, Any]]) -> bool:
    """
    Mutate task dicts in place so each has a non-empty string `id`.
    Returns True if any task was modified.
    """
    changed = False
    seen_ids: set[str] = set()
    for idx, task in enumerate(tasks):
        if not isinstance(task, dict):
            continue
        raw_id = str(task.get("id") or "").strip()
        if raw_id and raw_id not in seen_ids:
            seen_ids.add(raw_id)
            continue

        # Missing ids or duplicates get a deterministic unique synthetic id.
        seed = "|".join(
            [
                str(task.get("title") or "").strip().lower(),
                str(task.get("github_issue_number") or "").strip(),
                str(task.get("created_at") or "").strip(),
                str(idx),
            ]
        )
        tid = "task:" + hashlib.sha1(seed.encode("utf-8")).hexdigest()[:16]
        # Extremely defensive: avoid collisions even after hashing.
        suffix = 2
        base_tid = tid
        while tid in seen_ids:
            tid = f"{base_tid}-{suffix}"
            suffix += 1
        task["id"] = tid
        seen_ids.add(tid)
        changed = True
    return changed


def find_task_index(tasks: List[Dict[str, Any]], task_id: str) -> int | None:
    """Resolve task row index from route param (id, synthetic id, or title)."""
    tid = (task_id or "").strip()
    if not tid:
        return None

    for i, t in enumerate(tasks):
        if not isinstance(t, dict):
            continue
        if str(t.get("id") or "").strip() == tid:
            return i
    for i, t in enumerate(tasks):
        if not isinstance(t, dict):
            continue
        if str(t.get("_id") or "").strip() == tid:
            return i
    for i, t in enumerate(tasks):
        if not isinstance(t, dict):
            continue
        if task_identity(t) == tid:
            return i
    lower = tid.lower()
    for i, t in enumerate(tasks):
        if not isinstance(t, dict):
            continue
        title = (t.get("title") or "").strip()
        if title and (title == tid or title.lower() == lower):
            return i
    return None


from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    project_id: str
    workspace_id: str
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    phase: Optional[str] = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["todo", "in_progress", "blocked", "done"] = "todo"
    due_date: Optional[datetime] = None
    github_issue: Optional[str] = None
    github_pr: Optional[str] = None
    blocker_reason: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskPublic(TaskBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


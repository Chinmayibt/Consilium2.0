from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PRD(BaseModel):
    content: str
    generated_at: Optional[datetime] = None
    exported: bool = False


class Phase(BaseModel):
    phase_number: int
    title: str
    status: Literal["completed", "in-progress", "upcoming"] = "upcoming"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectBase(BaseModel):
    workspace_id: str
    name: str
    description: Optional[str] = None
    tech_stack: Optional[str] = None
    team_size: Optional[int] = None
    deadline: Optional[datetime] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectPublic(ProjectBase):
    id: str
    prd: Optional[PRD] = None
    phases: List[Phase] = []
    status: Literal["planning", "active", "completed"] = "planning"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


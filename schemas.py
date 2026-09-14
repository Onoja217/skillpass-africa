from pydantic import BaseModel
from typing import Optional
import datetime

class CategoryOut(BaseModel):
    id: int
    name: str
    class Config: from_attributes = True

class SkillOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: CategoryOut
    class Config: from_attributes = True

class AssessmentCreate(BaseModel):
    title: str
    skill_id: int
    instructions: str
    difficulty: str
    deadline: Optional[datetime.datetime]
    criteria: str

class SubmissionCreate(BaseModel):
    assessment_id: int
    written_response: Optional[str] = None
    project_link: Optional[str] = None
    video_link: Optional[str] = None
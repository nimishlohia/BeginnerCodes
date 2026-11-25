from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class UserSkillCreateRequest(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    proficiency_level: int = Field(..., ge=1, le=5)


class UserSkillUpdateRequest(BaseModel):
    proficiency_level: int = Field(..., ge=1, le=5)


class UserSkillResponse(BaseModel):
    id: int
    user_id: int
    skill_name: str
    proficiency_level: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

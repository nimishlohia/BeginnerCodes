from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.profile import UserProfileResponse
from app.schemas.skill import UserSkillResponse
from app.schemas.preference import UserPreferenceResponse


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserResponse):
    profile: Optional[UserProfileResponse] = None
    skills: List[UserSkillResponse] = []
    preferences: Optional[UserPreferenceResponse] = None

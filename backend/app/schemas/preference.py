from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_DIFFICULTIES = {"beginner", "intermediate", "advanced"}


class UserPreferenceUpdateRequest(BaseModel):
    preferred_programming_language: Optional[str] = Field(None, max_length=50)
    preferred_difficulty: Optional[str] = Field(None, max_length=20)

    @field_validator("preferred_difficulty")
    @classmethod
    def validate_difficulty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_lower = v.strip().lower()
            if v_lower not in ALLOWED_DIFFICULTIES:
                raise ValueError(
                    f"Invalid difficulty. Allowed values are: {', '.join(sorted(ALLOWED_DIFFICULTIES))}"
                )
            return v_lower
        return v


class UserPreferenceResponse(BaseModel):
    id: int
    user_id: int
    preferred_programming_language: Optional[str] = None
    preferred_difficulty: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

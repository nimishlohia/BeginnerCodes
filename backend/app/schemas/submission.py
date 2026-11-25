from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.submission import SUPPORTED_LANGUAGES, MAX_SOURCE_CODE_BYTES


# ---------------------------------------------------------------------------
# Submission creation request — clients supply only language + source_code
# ---------------------------------------------------------------------------

class SubmissionCreateRequest(BaseModel):
    language: str
    source_code: str

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{v}'. Must be one of: {', '.join(SUPPORTED_LANGUAGES)}"
            )
        return v

    @field_validator("source_code")
    @classmethod
    def validate_source_code(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Source code must not be empty")
        if len(v.encode("utf-8")) > MAX_SOURCE_CODE_BYTES:
            raise ValueError(
                f"Source code exceeds the maximum size of {MAX_SOURCE_CODE_BYTES // 1024} KiB"
            )
        return v


# ---------------------------------------------------------------------------
# Submission status response — returned immediately after POST
# ---------------------------------------------------------------------------

class SubmissionStatusResponse(BaseModel):
    id: int
    challenge_id: int
    language: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Submission detail response — returned for GET /submissions/{id}
# Includes source_code so the owner can review their own code.
# Never includes hidden test case data.
# ---------------------------------------------------------------------------

class SubmissionDetailResponse(BaseModel):
    id: int
    challenge_id: int
    language: str
    source_code: str
    status: str
    result_summary: Optional[str] = None
    execution_time_ms: Optional[int] = None
    created_at: datetime
    evaluated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Submission list item — used in paginated history (omits full source_code)
# ---------------------------------------------------------------------------

class SubmissionListItem(BaseModel):
    id: int
    challenge_id: int
    challenge_title: str  # denormalized from the joined challenge
    language: str
    status: str
    result_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Paginated submission history
# ---------------------------------------------------------------------------

class PaginatedSubmissionList(BaseModel):
    items: List[SubmissionListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

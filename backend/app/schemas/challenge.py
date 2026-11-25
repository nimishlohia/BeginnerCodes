from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.submission import SUPPORTED_LANGUAGES


# ---------------------------------------------------------------------------
# Challenge example (public) — safe to return to clients
# ---------------------------------------------------------------------------

class ChallengeExampleResponse(BaseModel):
    id: int
    input_data: str
    expected_output: str
    explanation: Optional[str] = None
    display_order: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Challenge list item — compact summary for catalogue
# ---------------------------------------------------------------------------

class ChallengeListItem(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: str
    topic: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Challenge detail — full public view (NO hidden test data)
# ---------------------------------------------------------------------------

class ChallengeDetailResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    difficulty: str
    topic: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    examples: List[ChallengeExampleResponse] = []
    supported_languages: List[str] = SUPPORTED_LANGUAGES

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Paginated challenge list
# ---------------------------------------------------------------------------

class PaginatedChallengeList(BaseModel):
    items: List[ChallengeListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

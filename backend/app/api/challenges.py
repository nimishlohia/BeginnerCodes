"""
Challenge catalogue API.

Access policy
-------------
- GET /challenges       — public (no authentication required)
- GET /challenges/{id}  — public (no authentication required)

Hidden test cases are never returned. Only published challenges are visible.
"""

import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.challenge import CodingChallenge, ChallengeExample
from app.schemas.challenge import (
    ChallengeDetailResponse,
    ChallengeListItem,
    PaginatedChallengeList,
)

router = APIRouter(prefix="/challenges", tags=["Challenges"])

# Pagination hard cap
MAX_PAGE_SIZE = 50
DEFAULT_PAGE_SIZE = 20


@router.get(
    "",
    response_model=PaginatedChallengeList,
    summary="List published coding challenges",
)
def list_challenges(
    search: Optional[str] = Query(None, max_length=100, description="Search challenge titles"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: Easy, Medium, Hard"),
    topic: Optional[str] = Query(None, max_length=100, description="Filter by topic"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Results per page"),
    db: Session = Depends(get_db),
) -> PaginatedChallengeList:
    """
    Return a paginated list of published coding challenges.

    Filters:
    - search: case-insensitive title substring match
    - difficulty: exact match (Easy / Medium / Hard)
    - topic: case-insensitive substring match

    Hidden test cases and unpublished challenges are never returned.
    """
    if difficulty and difficulty not in ("Easy", "Medium", "Hard"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="difficulty must be one of: Easy, Medium, Hard",
        )

    stmt = select(CodingChallenge).where(CodingChallenge.is_published.is_(True))

    if search:
        stmt = stmt.where(CodingChallenge.title.ilike(f"%{search.strip()}%"))
    if difficulty:
        stmt = stmt.where(CodingChallenge.difficulty == difficulty)
    if topic:
        stmt = stmt.where(CodingChallenge.topic.ilike(f"%{topic.strip()}%"))

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Apply ordering and pagination
    offset = (page - 1) * page_size
    stmt = stmt.order_by(CodingChallenge.id.asc()).offset(offset).limit(page_size)
    challenges = db.execute(stmt).scalars().all()

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedChallengeList(
        items=[ChallengeListItem.model_validate(c) for c in challenges],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{challenge_id}",
    response_model=ChallengeDetailResponse,
    summary="Get challenge details with public examples",
)
def get_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
) -> ChallengeDetailResponse:
    """
    Return full details for a published challenge, including public examples.

    Hidden test cases are never included in this response.
    Unpublished challenges return 404.
    """
    challenge = db.execute(
        select(CodingChallenge)
        .where(
            CodingChallenge.id == challenge_id,
            CodingChallenge.is_published.is_(True),
        )
        .options(selectinload(CodingChallenge.examples))
    ).scalar_one_or_none()

    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    return ChallengeDetailResponse.model_validate(challenge)

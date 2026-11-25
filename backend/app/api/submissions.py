"""
Code submission API.

Access policy
-------------
All submission endpoints require authentication.

Security invariants
-------------------
- user_id is always taken from the authenticated JWT, never the request body.
- status, result_summary, execution_time_ms, evaluated_at are set server-side only.
- Hidden test case data is never returned in any response.
- Users can only access their own submission records.
"""

import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.challenge import CodingChallenge
from app.models.submission import CodeSubmission
from app.models.user import User
from app.schemas.submission import (
    PaginatedSubmissionList,
    SubmissionCreateRequest,
    SubmissionDetailResponse,
    SubmissionListItem,
    SubmissionStatusResponse,
)
from app.api.deps import get_current_user
from app.core.evaluator import EvaluationRequest, apply_evaluation_result, evaluator

router = APIRouter(tags=["Submissions"])

MAX_PAGE_SIZE = 50
DEFAULT_PAGE_SIZE = 20


@router.post(
    "/challenges/{challenge_id}/submissions",
    response_model=SubmissionStatusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit source code for a challenge",
)
def create_submission(
    challenge_id: int,
    data: SubmissionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubmissionStatusResponse:
    """
    Submit source code for a published challenge.

    - Requires authentication.
    - user_id is set from the authenticated JWT — never from the request body.
    - status is initialized to PENDING by the server.
    - The mock evaluator immediately processes the submission synchronously
      for development purposes. A real evaluator would be called asynchronously.
    - Submitted code is never executed in this process.
    """
    # Verify the challenge exists and is published
    challenge = db.execute(
        select(CodingChallenge).where(
            CodingChallenge.id == challenge_id,
            CodingChallenge.is_published.is_(True),
        )
    ).scalar_one_or_none()

    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Create submission with server-controlled initial status
    submission = CodeSubmission(
        user_id=current_user.id,       # Always from JWT, never from request body
        challenge_id=challenge_id,
        language=data.language,
        source_code=data.source_code,
        status="PENDING",              # Always server-assigned
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Invoke the mock evaluator synchronously.
    # IMPORTANT: The evaluator DOES NOT execute the submitted source code.
    # Replace with an async task queue when integrating a real sandbox.
    try:
        eval_request = EvaluationRequest(
            submission_id=submission.id,
            challenge_id=challenge_id,
            language=data.language,
        )
        result = evaluator.evaluate(eval_request, data.source_code)
        apply_evaluation_result(submission.id, result, db)
        db.refresh(submission)
    except Exception:
        # If the evaluator fails, leave the submission in PENDING rather than crashing the request.
        # The status will remain PENDING until a retry mechanism handles it.
        pass

    return SubmissionStatusResponse.model_validate(submission)


@router.get(
    "/submissions/{submission_id}",
    response_model=SubmissionDetailResponse,
    summary="Get submission details",
)
def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubmissionDetailResponse:
    """
    Return details for a specific submission.

    Returns 404 if the submission does not exist or does not belong
    to the authenticated user. Hidden test data is never returned.
    """
    submission = db.get(CodeSubmission, submission_id)

    # Return 404 for both non-existent and other-user's submissions
    # to avoid leaking submission IDs belonging to other users.
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    return SubmissionDetailResponse.model_validate(submission)


@router.get(
    "/users/me/submissions",
    response_model=PaginatedSubmissionList,
    summary="Get current user's submission history",
)
def list_my_submissions(
    challenge_id: Optional[int] = Query(None, description="Filter by challenge ID"),
    sub_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedSubmissionList:
    """
    Return the authenticated user's submission history, newest first.

    Source code is omitted from list items; use GET /submissions/{id} to retrieve it.
    Only the current user's submissions are returned.
    """
    # Build a clean base filter (no eager-load options) for the COUNT query
    base_filter = [CodeSubmission.user_id == current_user.id]
    if challenge_id is not None:
        base_filter.append(CodeSubmission.challenge_id == challenge_id)
    if sub_status:
        base_filter.append(CodeSubmission.status == sub_status.upper())

    count_stmt = select(func.count()).select_from(CodeSubmission).where(*base_filter)
    total = db.execute(count_stmt).scalar_one()

    # Data query with eager-load for challenge title
    stmt = (
        select(CodeSubmission)
        .where(*base_filter)
        .options(joinedload(CodeSubmission.challenge))
    )

    offset = (page - 1) * page_size
    stmt = stmt.order_by(CodeSubmission.created_at.desc()).offset(offset).limit(page_size)
    submissions = db.execute(stmt).scalars().all()

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    items = [
        SubmissionListItem(
            id=s.id,
            challenge_id=s.challenge_id,
            challenge_title=s.challenge.title,
            language=s.language,
            status=s.status,
            result_summary=s.result_summary,
            created_at=s.created_at,
        )
        for s in submissions
    ]

    return PaginatedSubmissionList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

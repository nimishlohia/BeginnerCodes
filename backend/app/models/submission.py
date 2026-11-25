from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.challenge import CodingChallenge

# ---------------------------------------------------------------------------
# Supported submission languages
# ---------------------------------------------------------------------------
SUPPORTED_LANGUAGES = ["python", "javascript", "typescript", "java", "cpp", "c", "go", "rust"]

# ---------------------------------------------------------------------------
# Submission lifecycle statuses
# ---------------------------------------------------------------------------
SUBMISSION_STATUSES = [
    "PENDING",
    "RUNNING",
    "ACCEPTED",
    "WRONG_ANSWER",
    "COMPILATION_ERROR",
    "RUNTIME_ERROR",
    "TIME_LIMIT_EXCEEDED",
    "EVALUATION_ERROR",
]

# Maximum allowed source-code size (64 KiB)
MAX_SOURCE_CODE_BYTES = 65_536


class CodeSubmission(Base):
    """
    Records one user's code submission attempt for a specific challenge.

    Security invariants:
    - user_id is set by the server from the authenticated JWT; never from the request body.
    - status and result_summary are set by the server/evaluator; never accepted from clients.
    - execution_time_ms and evaluated_at are set by the trusted evaluator only.
    """

    __tablename__ = "code_submissions"
    __table_args__ = (
        CheckConstraint(
            "language IN ('python','javascript','typescript','java','cpp','c','go','rust')",
            name="ck_submission_language",
        ),
        CheckConstraint(
            "status IN ('PENDING','RUNNING','ACCEPTED','WRONG_ANSWER',"
            "'COMPILATION_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED','EVALUATION_ERROR')",
            name="ck_submission_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    challenge_id: Mapped[int] = mapped_column(
        ForeignKey("coding_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    # Status is always set server-side; initial value is PENDING.
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    # Sanitized result summary — must never contain hidden test data.
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    evaluated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="submissions")
    challenge: Mapped["CodingChallenge"] = relationship(
        "CodingChallenge", back_populates="submissions"
    )

    def __repr__(self) -> str:
        return (
            f"<CodeSubmission id={self.id} user_id={self.user_id} "
            f"challenge_id={self.challenge_id} status='{self.status}'>"
        )

from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey,
    Index, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.submission import CodeSubmission


class CodingChallenge(Base):
    """A programming problem available on the LevelUp platform."""

    __tablename__ = "coding_challenges"
    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('Easy', 'Medium', 'Hard')",
            name="ck_challenge_difficulty",
        ),
        Index("ix_challenge_difficulty", "difficulty"),
        Index("ix_challenge_topic", "topic"),
        Index("ix_challenge_is_published", "is_published"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    input_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    examples: Mapped[List["ChallengeExample"]] = relationship(
        "ChallengeExample",
        back_populates="challenge",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ChallengeExample.display_order",
    )
    test_cases: Mapped[List["ChallengeTestCase"]] = relationship(
        "ChallengeTestCase",
        back_populates="challenge",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    submissions: Mapped[List["CodeSubmission"]] = relationship(
        "CodeSubmission",
        back_populates="challenge",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<CodingChallenge id={self.id} slug='{self.slug}' difficulty='{self.difficulty}'>"


class ChallengeExample(Base):
    """A public input/output example shown on the challenge detail page."""

    __tablename__ = "challenge_examples"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    challenge_id: Mapped[int] = mapped_column(
        ForeignKey("coding_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    challenge: Mapped["CodingChallenge"] = relationship(
        "CodingChallenge", back_populates="examples"
    )

    def __repr__(self) -> str:
        return f"<ChallengeExample id={self.id} challenge_id={self.challenge_id} order={self.display_order}>"


class ChallengeTestCase(Base):
    """
    Hidden or sample test data used exclusively by the trusted evaluation component.

    SECURITY: This model must NEVER be serialised into public API responses.
    Hidden test inputs and expected outputs must never be exposed to clients.
    The evaluator accesses this table only through trusted server-side code.
    """

    __tablename__ = "challenge_test_cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    challenge_id: Mapped[int] = mapped_column(
        ForeignKey("coding_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    # is_sample=True means it is also shown to users (mirrors an example).
    # is_sample=False means it is hidden and never returned in public responses.
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    challenge: Mapped["CodingChallenge"] = relationship(
        "CodingChallenge", back_populates="test_cases"
    )

    def __repr__(self) -> str:
        return f"<ChallengeTestCase id={self.id} challenge_id={self.challenge_id} is_sample={self.is_sample}>"

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserPreference(Base):
    """Represents matchmaking and gameplay preferences associated with a user."""

    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint(
            "preferred_difficulty IN ('beginner', 'intermediate', 'advanced') OR preferred_difficulty IS NULL",
            name="ck_user_preference_difficulty",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    preferred_programming_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preferred_difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
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
    user: Mapped["User"] = relationship("User", back_populates="preferences")

    def __repr__(self) -> str:
        return f"<UserPreference id={self.id} user_id={self.user_id} language='{self.preferred_programming_language}'>"

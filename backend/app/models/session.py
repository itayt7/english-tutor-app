from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.vocabulary import VocabularyItem
    from app.models.mistake import MistakePattern


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="sessions")  # noqa: F821
    vocabulary_items: Mapped[list["VocabularyItem"]] = relationship(  # noqa: F821
        "VocabularyItem", back_populates="session", cascade="all, delete-orphan"
    )
    mistake_patterns: Mapped[list["MistakePattern"]] = relationship(  # noqa: F821
        "MistakePattern", back_populates="session", cascade="all, delete-orphan"
    )

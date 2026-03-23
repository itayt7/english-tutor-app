from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.session import Session


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id"), nullable=False, index=True
    )
    word_or_phrase: Mapped[str] = mapped_column(String(200), nullable=False)
    hebrew_translation: Mapped[str] = mapped_column(String(200), nullable=False)
    source_context: Mapped[str] = mapped_column(Text, nullable=False)
    mastery_level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )  # 1 (new) to 5 (mastered)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="vocabulary_items")
    session: Mapped["Session"] = relationship("Session", back_populates="vocabulary_items")

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.session import Session


class MistakePattern(Base):
    __tablename__ = "mistake_patterns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g. "Prepositions", "Verb Tense", etc.
    example_from_transcript: Mapped[str] = mapped_column(Text, nullable=False)
    correction: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="mistake_patterns")
    session: Mapped["Session"] = relationship("Session", back_populates="mistake_patterns")

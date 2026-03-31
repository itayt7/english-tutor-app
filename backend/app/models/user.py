from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.vocabulary import VocabularyItem
    from app.models.mistake import MistakePattern
    from app.models.chat_message import ChatMessage


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    native_language: Mapped[str] = mapped_column(String(50), nullable=False)
    proficiency_level: Mapped[str] = mapped_column(String(20), nullable=False)

    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    vocabulary_items: Mapped[list["VocabularyItem"]] = relationship(  # noqa: F821
        "VocabularyItem", back_populates="user", cascade="all, delete-orphan"
    )
    mistake_patterns: Mapped[list["MistakePattern"]] = relationship(  # noqa: F821
        "MistakePattern", back_populates="user", cascade="all, delete-orphan"
    )
    chat_messages: Mapped[list["ChatMessage"]] = relationship(  # noqa: F821
        "ChatMessage", back_populates="user", cascade="all, delete-orphan"
    )

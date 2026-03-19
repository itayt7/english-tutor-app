"""Pydantic models for the Translation-Practice news pipeline."""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────

class DifficultyLevel(str, Enum):
    """Maps to CEFR bands and controls source complexity."""
    EASY = "easy"          # A2-B1  – simplified / children's news
    MEDIUM = "medium"      # B1-B2  – standard news
    HARD = "hard"          # C1-C2  – advanced / opinion / academic


class ArticleLanguage(str, Enum):
    """Language of the fetched articles."""
    EN = "en"   # English articles → user translates to Hebrew
    HE = "he"   # Hebrew articles  → user translates to English


class NewsQuery(BaseModel):
    """Query parameters accepted by GET /api/v1/news."""
    topic: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Topic to search for (e.g. 'climate change', 'technology').",
    )
    difficulty: DifficultyLevel = Field(
        default=DifficultyLevel.MEDIUM,
        description="Controls the complexity of the fetched content.",
    )
    max_articles: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum number of articles to return (1-5).",
    )


# ── Response ──────────────────────────────────────────────────────────────────

class SentenceTask(BaseModel):
    """A single translatable sentence extracted from an article."""
    id: int = Field(..., description="1-based index within the article.")
    original_text: str = Field(
        ...,
        min_length=1,
        description="The original sentence to be translated.",
    )


class NewsArticleResponse(BaseModel):
    """One cleaned article returned to the frontend."""
    title: str
    source: Optional[str] = None
    url: Optional[str] = None
    sentences: List[SentenceTask] = Field(
        default_factory=list,
        description="Ordered list of translatable sentences.",
    )


class NewsResponse(BaseModel):
    """Top-level response for GET /api/v1/news."""
    topic: str
    difficulty: DifficultyLevel
    language: ArticleLanguage = ArticleLanguage.EN
    articles: List[NewsArticleResponse] = Field(default_factory=list)
    total_sentences: int = Field(
        default=0,
        description="Sum of sentences across all returned articles.",
    )

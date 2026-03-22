from pydantic import BaseModel, Field
from typing import List


class VocabularyItemRead(BaseModel):
    """A single vocabulary item extracted from a session."""

    id: int
    word_or_phrase: str
    hebrew_translation: str
    source_context: str
    mastery_level: int = Field(ge=1, le=5, description="1 = new, 5 = mastered")

    model_config = {"from_attributes": True}


class MistakePatternRead(BaseModel):
    """A single categorised mistake occurrence."""

    id: int
    category: str
    example_from_transcript: str
    correction: str

    model_config = {"from_attributes": True}


class MistakePatternAggregate(BaseModel):
    """Aggregated mistake stats for the radar chart."""

    category: str
    frequency_count: int
    recent_examples: List[str] = Field(default_factory=list)


class ActionableInsight(BaseModel):
    """An AI-generated improvement tip."""

    title: str
    description: str
    category: str  # links to the mistake category this relates to


class DashboardStats(BaseModel):
    """Full dashboard payload returned to the frontend."""

    total_sessions: int
    total_minutes: int
    words_mastered: int
    vocabulary: List[VocabularyItemRead]
    mistake_patterns: List[MistakePatternAggregate]
    insights: List[ActionableInsight]


# ── Schemas used by the Insights Generator AI Agent ──────────────────────────

class InsightsMistakeItem(BaseModel):
    """Shape the AI must return for each detected mistake."""

    category: str
    example_from_transcript: str
    correction: str


class InsightsVocabularyItem(BaseModel):
    """Shape the AI must return for each vocabulary word."""

    word_or_phrase: str
    hebrew_translation: str
    source_context: str


class InsightsGeneratorResult(BaseModel):
    """Full JSON response the AI Insights Generator must produce."""

    mistake_patterns: List[InsightsMistakeItem] = Field(default_factory=list)
    vocabulary: List[InsightsVocabularyItem] = Field(default_factory=list)

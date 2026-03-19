from pydantic import BaseModel, Field
from typing import List


class TranslationEvaluation(BaseModel):
    """Structured feedback returned by the Translation Coach agent."""

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall quality score from 0 (completely wrong) to 100 (perfect).",
    )
    is_passing: bool = Field(
        ...,
        description="True if the translation is acceptable (score >= 60).",
    )
    corrected_text: str = Field(
        ...,
        description="The ideal English translation of the source sentence.",
    )
    grammar_issues: List[str] = Field(
        default_factory=list,
        description="List of specific grammar or vocabulary issues found.",
    )
    hebrew_speaker_tip: str = Field(
        default="",
        description=(
            "A targeted tip for Hebrew-speaking learners explaining why "
            "the mistake is common and how to avoid it."
        ),
    )

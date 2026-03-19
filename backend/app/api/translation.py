"""
POST /api/v1/translation/evaluate — evaluate a user's sentence translation.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai.agents.translation_coach import evaluate_translation
from app.schemas.translation import TranslationEvaluation

router = APIRouter()
logger = logging.getLogger(__name__)


class TranslationEvaluateRequest(BaseModel):
    """Request body for the translation evaluation endpoint."""
    source_sentence: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The original sentence to be translated.",
    )
    user_translation: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The student's English translation attempt.",
    )


@router.post(
    "/translation/evaluate",
    response_model=TranslationEvaluation,
    tags=["Translation Practice"],
)
async def evaluate_user_translation(
    body: TranslationEvaluateRequest,
) -> TranslationEvaluation:
    """
    Evaluate the user's translation of a source sentence using the
    Translation Coach AI agent.
    """
    try:
        result = await evaluate_translation(
            source_sentence=body.source_sentence,
            user_translation=body.user_translation,
        )
        return result

    except Exception as exc:
        logger.exception(
            "Translation evaluation failed for source=%s",
            body.source_sentence[:80],
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during translation evaluation.",
        )

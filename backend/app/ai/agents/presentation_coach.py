"""
Presentation Coach agent.

Evaluates a user's spoken pitch against the actual content of their
presentation deck (retrieved via RAG) and returns structured JSON feedback.
"""

import logging

from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.presentation_coach import get_presentation_coach_system_prompt
from app.schemas.presentation import PitchEvaluation

logger = logging.getLogger(__name__)

# ── Safe fallbacks ────────────────────────────────────────────────────────────

_SAFE_FALLBACK = PitchEvaluation(
    accuracy_score=1,
    grammar_corrections=[],
    coach_feedback="Something went wrong — please try again.",
    suggested_phrasing="",
)

_BLANK_INPUT_FALLBACK = PitchEvaluation(
    accuracy_score=1,
    grammar_corrections=[],
    coach_feedback=(
        "It looks like you didn't say anything yet. "
        "Take a deep breath and try pitching the slide — you've got this!"
    ),
    suggested_phrasing="",
)


async def evaluate_pitch(
    rag_context: str,
    user_transcript: str,
) -> PitchEvaluation:
    """
    Send the RAG context and the user's spoken pitch to the LLM
    and return structured coaching feedback.

    Args:
        rag_context:     Concatenated text from the most relevant slide chunks.
        user_transcript: The user's spoken pitch (from STT).

    Returns:
        A PitchEvaluation Pydantic model with score, corrections, feedback,
        and a suggested native-speaker phrasing.
    """
    # ── Fast-return for blank input ───────────────────────────────────────
    if not user_transcript or not user_transcript.strip():
        return _BLANK_INPUT_FALLBACK

    if not rag_context or not rag_context.strip():
        # No slide context available — still evaluate grammar but note mismatch
        rag_context = "(No slide context available.)"

    system_prompt = get_presentation_coach_system_prompt(
        rag_context=rag_context,
        user_transcript=user_transcript,
    )

    try:
        response = await ai_client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Please evaluate my pitch and return JSON feedback."
                    ),
                },
            ],
            temperature=0.2,  # Low temperature for consistent evaluations
            response_format={"type": "json_object"},
        )

        raw_json = response.choices[0].message.content
        result = PitchEvaluation.model_validate_json(raw_json)
        return result

    except Exception as exc:
        logger.error(f"Presentation Coach Error: {exc}")
        return _SAFE_FALLBACK

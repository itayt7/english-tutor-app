from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.translation_coach import get_translation_coach_system_prompt
from app.schemas.translation import TranslationEvaluation


# Pre-built safe fallback for when things go wrong
_SAFE_FALLBACK = TranslationEvaluation(
    score=0,
    is_passing=False,
    corrected_text="",
    grammar_issues=[],
    hebrew_speaker_tip="Something went wrong – please try again.",
)

# Pre-built fallback for blank user input
_BLANK_INPUT_FALLBACK = TranslationEvaluation(
    score=0,
    is_passing=False,
    corrected_text="",
    grammar_issues=[],
    hebrew_speaker_tip="Try translating the sentence – you can do it!",
)


async def evaluate_translation(
    source_sentence: str,
    user_translation: str,
) -> TranslationEvaluation:
    """
    Sends the source sentence and the user's translation to the LLM
    and returns structured feedback as a TranslationEvaluation object.

    Args:
        source_sentence: The original sentence to be translated.
        user_translation: The student's English translation attempt.

    Returns:
        A TranslationEvaluation Pydantic model with score, corrections, and tips.
    """
    # ── Fast-return for blank inputs ──────────────────────────────────────
    if not user_translation or not user_translation.strip():
        return _BLANK_INPUT_FALLBACK

    if not source_sentence or not source_sentence.strip():
        return _SAFE_FALLBACK

    system_prompt = get_translation_coach_system_prompt()

    user_content = (
        f"SOURCE SENTENCE:\n{source_sentence}\n\n"
        f"USER TRANSLATION:\n{user_translation}"
    )

    try:
        response = await ai_client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,  # Low temperature for deterministic evaluation
            response_format={"type": "json_object"},  # Enforce JSON output
        )

        raw_json = response.choices[0].message.content
        result = TranslationEvaluation.model_validate_json(raw_json)
        return result

    except Exception as e:
        print(f"Translation Coach Error: {e}")
        return _SAFE_FALLBACK

import logging

from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.insights_generator import (
    get_insights_generator_prompt,
    VALID_MISTAKE_CATEGORIES,
)
from app.schemas.dashboard import InsightsGeneratorResult

logger = logging.getLogger(__name__)


async def generate_session_insights(
    transcript: list[dict[str, str]],
) -> InsightsGeneratorResult:
    """
    Analyses a full conversation transcript and extracts:
      - Categorised mistake patterns
      - Vocabulary items with Hebrew translations

    Parameters
    ----------
    transcript : list[dict]
        List of {"role": "user"|"assistant", "content": "..."} messages.

    Returns
    -------
    InsightsGeneratorResult  –  validated Pydantic model
    """
    if not transcript:
        return InsightsGeneratorResult(mistake_patterns=[], vocabulary=[])

    # Build a readable transcript string for the LLM
    formatted = "\n".join(
        f"[{msg['role'].upper()}]: {msg['content']}" for msg in transcript
    )

    system_prompt = get_insights_generator_prompt()

    try:
        response = await ai_client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": formatted},
            ],
            temperature=0.15,  # deterministic analysis
            response_format={"type": "json_object"},
        )

        raw_json = response.choices[0].message.content
        result = InsightsGeneratorResult.model_validate_json(raw_json)

        # Normalise any unknown categories → "Other"
        for mp in result.mistake_patterns:
            if mp.category not in VALID_MISTAKE_CATEGORIES:
                mp.category = "Other"

        return result

    except Exception as e:
        logger.error(f"Insights Generator Error: {e}")
        return InsightsGeneratorResult(mistake_patterns=[], vocabulary=[])

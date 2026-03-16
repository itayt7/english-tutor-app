from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.evaluator import get_evaluator_system_prompt
from app.schemas.evaluation import EvaluationResult


async def evaluate_user_message(
    user_message: str, proficiency_level: str
) -> EvaluationResult:
    """
    Analyzes a user's message asynchronously to find grammar, vocabulary,
    or syntax errors without interrupting the conversation flow.
    """
    if not user_message.strip():
        # Fast return for empty messages
        return EvaluationResult(has_errors=False, corrections=[])

    system_prompt = get_evaluator_system_prompt(proficiency_level)

    try:
        response = await ai_client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,  # Low temperature for highly deterministic analysis
            response_format={"type": "json_object"},  # Force JSON output
        )

        raw_json = response.choices[0].message.content
        # Validate and parse the raw JSON string into our Pydantic model
        result = EvaluationResult.model_validate_json(raw_json)
        return result

    except Exception as e:
        # In case of API failure or JSON parsing error, fail gracefully.
        # We don't want the app to crash just because the shadow evaluator failed.
        print(f"Shadow Evaluator Error: {e}")
        return EvaluationResult(has_errors=False, corrections=[])

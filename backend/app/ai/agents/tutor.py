from typing import List, Dict
from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.tutor import get_tutor_system_prompt


async def generate_tutor_response(
    message_history: List[Dict[str, str]],
    proficiency_level: str,
    native_language: str,
) -> str:
    """
    Generates the next conversational turn from the AI Tutor.
    message_history format: [{"role": "user"|"assistant", "content": "..."}]
    """
    system_prompt = get_tutor_system_prompt(proficiency_level, native_language)

    messages = [{"role": "system", "content": system_prompt}] + message_history

    response = await ai_client.chat.completions.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=messages,
        temperature=0.7,
        max_tokens=150,  # Keep conversational turns relatively short
    )

    return response.choices[0].message.content

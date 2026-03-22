"""
Article Translator agent — translates English news articles to Hebrew
using Azure OpenAI, with noise removal and paragraph limits.
"""

from app.ai.client import ai_client
from app.core.config import settings
from app.ai.prompts.article_translator import get_article_translator_system_prompt


async def translate_article_to_hebrew(
    title: str,
    body: str,
) -> str:
    """
    Translate an English news article into fluent Hebrew (3-4 paragraphs).

    Args:
        title: The English article title.
        body:  The English article body text.

    Returns:
        The translated Hebrew text (plain text, 3-4 paragraphs).
        On failure, returns an empty string.
    """
    if not body or not body.strip():
        return ""

    system_prompt = get_article_translator_system_prompt()

    user_content = f"TITLE:\n{title}\n\nARTICLE:\n{body}"

    try:
        response = await ai_client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,  # Balanced: faithful but natural
            max_tokens=1500,  # ~3-4 Hebrew paragraphs
        )

        translated = response.choices[0].message.content
        return (translated or "").strip()

    except Exception as e:
        print(f"Article Translator Error: {e}")
        return ""

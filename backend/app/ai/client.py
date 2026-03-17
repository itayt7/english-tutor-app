from openai import AsyncAzureOpenAI
from app.core.config import settings

# Create a singleton async client
import httpx

# ── Chat / LLM client ────────────────────────────────────────────────────────
ai_client = AsyncAzureOpenAI(
    http_client=httpx.AsyncClient(verify=False),
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)

# ── Speech (STT / TTS) client ────────────────────────────────────────────────
# May point to a different Azure resource, key, and API version.
speech_client = AsyncAzureOpenAI(
    http_client=httpx.AsyncClient(verify=False),
    api_key=settings.speech_api_key,
    azure_endpoint=settings.speech_endpoint,
    api_version=settings.AZURE_OPENAI_SPEECH_API_VERSION,
)

from openai import AsyncAzureOpenAI
from app.core.config import settings

# Create a singleton async client
import httpx

ai_client = AsyncAzureOpenAI(
    http_client=httpx.AsyncClient(verify=False),
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)

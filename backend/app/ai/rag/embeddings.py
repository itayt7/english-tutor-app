"""
Azure OpenAI embedding helper.

Wraps the async Azure OpenAI client to generate text embeddings
using a configurable deployment (e.g. text-embedding-3-small).
"""

import logging
from typing import List

from openai import AsyncAzureOpenAI
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Dedicated embeddings client ───────────────────────────────────────────────
# Re-uses the same Azure resource as the chat client but targets the
# embedding deployment.
_embedding_client = AsyncAzureOpenAI(
    http_client=httpx.AsyncClient(verify=False),
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)


async def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings using Azure OpenAI.

    Args:
        texts: List of strings to embed.

    Returns:
        List of embedding vectors (each a list of floats).

    Raises:
        RuntimeError: If the API call fails.
    """
    if not texts:
        return []

    # Filter out completely empty strings — the API rejects them
    cleaned = [t if t.strip() else " " for t in texts]

    try:
        response = await _embedding_client.embeddings.create(
            model=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
            input=cleaned,
        )
        return [item.embedding for item in response.data]
    except Exception as exc:
        logger.error(f"Embedding API call failed: {exc}")
        raise RuntimeError(f"Failed to generate embeddings: {exc}") from exc

import httpx
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

class SpeechTokenResponse(BaseModel):
    token: str
    region: str

@router.get("/token", response_model=SpeechTokenResponse)
async def get_speech_token():
    """
    Vends a short-lived authorization token for the Azure Speech SDK.
    This prevents exposing our primary Azure Speech Key to the frontend client.
    """
    fetch_token_url = f"https://{settings.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    headers = {
        "Ocp-Apim-Subscription-Key": settings.AZURE_SPEECH_KEY
    }

    try:
        # Use an async HTTP client to avoid blocking the server
        async with httpx.AsyncClient() as client:
            response = await client.post(fetch_token_url, headers=headers)
            
        if response.status_code != 200:
            logger.error(f"Failed to fetch Azure Speech token. Status: {response.status_code}, Body: {response.text}")
            raise HTTPException(status_code=502, detail="Failed to fetch speech token from Azure.")
            
        # The token is returned as plain text in the response body
        return SpeechTokenResponse(
            token=response.text,
            region=settings.AZURE_SPEECH_REGION
        )

    except httpx.RequestError as e:
        logger.error(f"HTTP request failed during speech token fetch: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable when contacting Azure Speech.")

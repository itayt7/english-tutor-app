import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from app.core.config import settings
from app.ai.client import speech_client

router = APIRouter()
logger = logging.getLogger(__name__)


class SynthesizeRequest(BaseModel):
    text: str


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts an uploaded audio file and returns the transcription
    using the Azure OpenAI gpt-4o-transcribe deployment.
    """
    try:
        audio_bytes = await file.read()

        transcription = await speech_client.audio.transcriptions.create(
            model=settings.AZURE_OPENAI_STT_DEPLOYMENT_NAME,
            file=(file.filename or "audio.webm", audio_bytes),
        )

        return {"text": transcription.text}

    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


@router.post("/synthesize")
async def synthesize_speech(body: SynthesizeRequest):
    """
    Accepts a JSON payload with text and returns audio/mpeg bytes
    using the Azure OpenAI TTS deployment.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    try:
        response = await speech_client.audio.speech.create(
            model=settings.AZURE_OPENAI_TTS_DEPLOYMENT_NAME,
            voice="alloy",
            input=body.text,
        )

        # response is HttpxBinaryResponseContent – read the full audio payload
        audio_bytes = response.content

        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:
        logger.error(f"Speech synthesis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {e}")

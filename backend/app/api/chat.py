from fastapi import APIRouter, HTTPException
import asyncio
import logging

from app.schemas.chat import ChatRequest, ChatResponse
from app.ai.agents.tutor import generate_tutor_response
from app.ai.agents.evaluator import evaluate_user_message

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Receives a user message, updates the conversation, and simultaneously
    evaluates the message for grammar/vocabulary errors.
    """
    try:
        # 1. Format history for the Tutor Agent
        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.message_history
        ]

        # 2. Fire off both AI tasks concurrently
        tutor_task = generate_tutor_response(
            message_history=history_dicts,
            proficiency_level=request.proficiency_level,
            native_language=request.native_language,
        )

        evaluator_task = evaluate_user_message(
            user_message=request.user_message,
            proficiency_level=request.proficiency_level,
        )

        # 3. Await both tasks in parallel — total latency ≈ max(tutor, evaluator)
        tutor_reply, evaluation_result = await asyncio.gather(
            tutor_task, evaluator_task
        )

        # 4. Construct and return the unified response
        return ChatResponse(
            tutor_response=tutor_reply,
            evaluation=evaluation_result,
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        # Return 503 if the AI layers fail entirely
        raise HTTPException(
            status_code=503,
            detail="The AI Tutor is currently unavailable. Please try again.",
        )

import asyncio
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSessionSummary,
    StoredMessage,
)
from app.services.chat_service import (
    get_or_create_session,
    save_message_exchange,
    list_sessions,
    get_session_messages,
)
from app.ai.agents.tutor import generate_tutor_response
from app.ai.agents.evaluator import evaluate_user_message

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: DBSession = Depends(get_db)):
    """
    Receives a user message, persists it, runs the tutor and evaluator in
    parallel, persists the response, and returns both along with the session ID.
    """
    try:
        session = get_or_create_session(
            db, request.user_id, request.session_id, request.user_message
        )

        # Build full history for the AI agents; append current turn only if not
        # already the last entry (check both content AND role to be safe)
        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.message_history
        ]
        last = history_dicts[-1] if history_dicts else {}
        if last.get("role") != "user" or last.get("content") != request.user_message:
            history_dicts.append({"role": "user", "content": request.user_message})

        tutor_reply, evaluation_result = await asyncio.gather(
            generate_tutor_response(
                message_history=history_dicts,
                proficiency_level=request.proficiency_level,
                native_language=request.native_language,
            ),
            evaluate_user_message(
                user_message=request.user_message,
                proficiency_level=request.proficiency_level,
            ),
        )

        save_message_exchange(
            db, session.id, request.user_id,
            request.user_message, evaluation_result, tutor_reply,
        )
        db.commit()

        return ChatResponse(
            tutor_response=tutor_reply,
            evaluation=evaluation_result,
            session_id=session.id,
        )

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.error("Error in chat endpoint", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="The AI Tutor is currently unavailable. Please try again.",
        )


@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_chat_sessions(user_id: int = 1, db: DBSession = Depends(get_db)):
    """Return all conversation sessions for a user, newest first."""
    return list_sessions(db, user_id)


@router.get("/sessions/{session_id}/messages", response_model=List[StoredMessage])
def get_messages(
    session_id: int, user_id: int = 1, db: DBSession = Depends(get_db)
):
    """Return all messages for a given session, in chronological order."""
    return get_session_messages(db, session_id, user_id)

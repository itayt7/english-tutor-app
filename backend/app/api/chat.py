import asyncio
import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.session import Session
from app.models.chat_message import ChatMessage as ChatMessageDB
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSessionSummary,
    StoredMessage,
)
from app.ai.agents.tutor import generate_tutor_response
from app.ai.agents.evaluator import evaluate_user_message

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_or_create_session(
    db: DBSession, user_id: int, session_id: int | None, first_message: str
) -> Session:
    """Return an existing session or create a new conversation session."""
    if session_id is not None:
        session = db.query(Session).filter(
            Session.id == session_id, Session.user_id == user_id
        ).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found.")
        return session

    # Derive a short topic from the opening message (first 80 chars)
    topic = first_message[:80] if first_message else "Conversation"
    new_session = Session(user_id=user_id, type="conversation", topic=topic)
    db.add(new_session)
    db.flush()  # populate new_session.id without committing yet
    return new_session


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: DBSession = Depends(get_db)):
    """
    Receives a user message, persists it, runs the tutor and evaluator in
    parallel, persists the response, and returns both along with the session ID.
    """
    try:
        session = _get_or_create_session(
            db, request.user_id, request.session_id, request.user_message
        )

        # 1. Build full history for the AI agents
        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.message_history
        ]
        if not history_dicts or history_dicts[-1].get("content") != request.user_message:
            history_dicts.append({"role": "user", "content": request.user_message})

        # 2. Persist the user turn immediately
        user_msg_row = ChatMessageDB(
            session_id=session.id,
            user_id=request.user_id,
            role="user",
            content=request.user_message,
        )
        db.add(user_msg_row)

        # 3. Fire both AI tasks concurrently
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

        # 4. Update user turn with evaluation and persist assistant turn
        user_msg_row.evaluation_json = json.dumps(evaluation_result.model_dump())
        assistant_msg_row = ChatMessageDB(
            session_id=session.id,
            user_id=request.user_id,
            role="assistant",
            content=tutor_reply,
        )
        db.add(assistant_msg_row)
        db.commit()

        return ChatResponse(
            tutor_response=tutor_reply,
            evaluation=evaluation_result,
            session_id=session.id,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=503,
            detail="The AI Tutor is currently unavailable. Please try again.",
        )


@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_chat_sessions(user_id: int = 1, db: DBSession = Depends(get_db)):
    """Return all conversation sessions for a user, newest first."""
    rows = (
        db.query(
            Session.id,
            Session.topic,
            Session.created_at,
            func.count(ChatMessageDB.id).label("message_count"),
        )
        .outerjoin(ChatMessageDB, ChatMessageDB.session_id == Session.id)
        .filter(Session.user_id == user_id, Session.type == "conversation")
        .group_by(Session.id)
        .order_by(Session.created_at.desc())
        .all()
    )
    return [
        ChatSessionSummary(
            id=row.id,
            topic=row.topic,
            created_at=row.created_at,
            message_count=row.message_count,
        )
        for row in rows
    ]


@router.get("/sessions/{session_id}/messages", response_model=List[StoredMessage])
def get_session_messages(
    session_id: int, user_id: int = 1, db: DBSession = Depends(get_db)
):
    """Return all messages for a given session, in chronological order."""
    session = db.query(Session).filter(
        Session.id == session_id, Session.user_id == user_id
    ).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    messages = (
        db.query(ChatMessageDB)
        .filter(ChatMessageDB.session_id == session_id)
        .order_by(ChatMessageDB.created_at.asc())
        .all()
    )
    return messages

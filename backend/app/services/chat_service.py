import json

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.models.session import Session
from app.models.chat_message import ChatMessage as ChatMessageDB
from app.schemas.chat import ChatSessionSummary, StoredMessage
from app.schemas.evaluation import EvaluationResult


def get_or_create_session(
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


def save_message_exchange(
    db: DBSession,
    session_id: int,
    user_id: int,
    user_message: str,
    evaluation: EvaluationResult,
    tutor_reply: str,
) -> None:
    """Persist the user turn (with evaluation) and the assistant turn."""
    db.add(ChatMessageDB(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=user_message,
        evaluation_json=json.dumps(evaluation.model_dump()),
    ))
    db.add(ChatMessageDB(
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=tutor_reply,
    ))


def list_sessions(db: DBSession, user_id: int) -> list[ChatSessionSummary]:
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


def get_session_messages(
    db: DBSession, session_id: int, user_id: int
) -> list[StoredMessage]:
    """Return all messages for a session in chronological order."""
    session = db.query(Session).filter(
        Session.id == session_id, Session.user_id == user_id
    ).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    return (
        db.query(ChatMessageDB)
        .filter(ChatMessageDB.session_id == session_id)
        .order_by(ChatMessageDB.created_at.asc())
        .all()
    )

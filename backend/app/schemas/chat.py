from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.evaluation import EvaluationResult


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    user_message: str = Field(
        ..., description="The latest message from the user."
    )
    message_history: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous conversation turns.",
    )
    proficiency_level: str = Field(
        default="B2", description="The user's CEFR level."
    )
    native_language: str = Field(
        default="Hebrew", description="The user's native language."
    )
    user_id: int = Field(default=1, description="The learner's user ID.")
    session_id: Optional[int] = Field(
        default=None,
        description="Existing session ID to continue. Omit to start a new conversation.",
    )


class ChatResponse(BaseModel):
    tutor_response: str = Field(
        ..., description="The conversational reply from the AI."
    )
    evaluation: EvaluationResult = Field(
        ..., description="The asynchronous grammar evaluation."
    )
    session_id: int = Field(..., description="The session this message belongs to.")


class StoredMessage(BaseModel):
    id: int
    role: str
    content: str
    evaluation_json: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionSummary(BaseModel):
    id: int
    topic: str
    created_at: datetime
    message_count: int

    model_config = {"from_attributes": True}

from pydantic import BaseModel, Field
from typing import List
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


class ChatResponse(BaseModel):
    tutor_response: str = Field(
        ..., description="The conversational reply from the AI."
    )
    evaluation: EvaluationResult = Field(
        ..., description="The asynchronous grammar evaluation."
    )

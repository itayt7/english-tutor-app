from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    user_id: int
    type: str = Field(..., max_length=50, examples=["conversation"])
    topic: str = Field(..., max_length=200, examples=["ordering food at a restaurant"])


class SessionRead(SessionCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

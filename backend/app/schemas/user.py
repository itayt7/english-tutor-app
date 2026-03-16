from pydantic import BaseModel, Field


class UserBase(BaseModel):
    native_language: str = Field(..., max_length=50, examples=["Spanish"])
    proficiency_level: str = Field(
        ...,
        max_length=20,
        examples=["beginner"],
        description="One of: beginner, intermediate, advanced",
    )


class UserCreate(UserBase):
    """Payload accepted when creating a new user."""
    pass


class UserUpdate(BaseModel):
    """All fields are optional for partial updates (PATCH)."""
    native_language: str | None = Field(default=None, max_length=50)
    proficiency_level: str | None = Field(default=None, max_length=20)


class UserRead(UserBase):
    """Response model – includes the generated id."""
    id: int

    model_config = {"from_attributes": True}

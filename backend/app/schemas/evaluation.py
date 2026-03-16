from pydantic import BaseModel, Field
from typing import List, Literal


class CorrectionItem(BaseModel):
    original_text: str = Field(
        ..., description="The exact snippet of text that was incorrect."
    )
    corrected_text: str = Field(
        ..., description="The corrected version of the snippet."
    )
    explanation: str = Field(
        ..., description="A short, encouraging explanation of the rule broken."
    )
    error_type: Literal["grammar", "vocabulary", "syntax", "literal_translation"] = (
        Field(..., description="The category of the error.")
    )


class EvaluationResult(BaseModel):
    has_errors: bool = Field(
        ...,
        description="True if there are grammatical or vocabulary errors, False otherwise.",
    )
    corrections: List[CorrectionItem] = Field(
        default_factory=list,
        description="List of corrections if errors exist.",
    )

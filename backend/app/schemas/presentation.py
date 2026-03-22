from pydantic import BaseModel, Field
from typing import List


class ExtractedSlide(BaseModel):
    """A single slide/page extracted from a document."""

    page_number: int = Field(
        ...,
        ge=1,
        description="1-based page or slide number.",
    )
    text: str = Field(
        ...,
        description="The extracted text content of this slide/page.",
    )


class DocumentExtractionResult(BaseModel):
    """Result of extracting text from a PDF or PPTX document."""

    filename: str = Field(
        ...,
        description="Original filename of the uploaded document.",
    )
    slides: List[ExtractedSlide] = Field(
        default_factory=list,
        description="Ordered list of extracted slides/pages with their text.",
    )

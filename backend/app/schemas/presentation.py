from pydantic import BaseModel, Field
from typing import List, Optional


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


# ── RAG / Vector search schemas ──────────────────────────────────────────────


class IngestResponse(BaseModel):
    """Response returned after ingesting a document into the vector DB."""

    filename: str = Field(..., description="Name of the ingested file.")
    chunks_stored: int = Field(
        ...,
        ge=0,
        description="Number of text chunks stored in the vector DB.",
    )


class SimilaritySearchRequest(BaseModel):
    """Request body for semantic search over ingested presentations."""

    query: str = Field(
        ...,
        min_length=1,
        description="Natural-language search query.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of results to return.",
    )
    filename: Optional[str] = Field(
        default=None,
        description="Optional — restrict search to a specific document.",
    )


class SearchHit(BaseModel):
    """A single search result from the vector DB."""

    text: str = Field(..., description="The matched chunk text.")
    page_number: int = Field(..., description="Source slide/page number.")
    chunk_index: int = Field(..., description="Sub-chunk index within the page.")
    filename: str = Field(..., description="Source document filename.")
    distance: float = Field(..., description="Similarity distance (lower = more similar).")


class SimilaritySearchResponse(BaseModel):
    """Response for a semantic search query."""

    query: str = Field(..., description="The original query.")
    results: List[SearchHit] = Field(
        default_factory=list,
        description="Ranked list of matching chunks.",
    )

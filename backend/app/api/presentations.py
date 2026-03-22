"""
Presentations API router — handles document uploads, text extraction,
RAG ingestion, and semantic search.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.schemas.presentation import (
    DocumentExtractionResult,
    IngestResponse,
    SimilaritySearchRequest,
    SimilaritySearchResponse,
    SearchHit,
)
from app.services.document_parser import (
    parse_document,
    SUPPORTED_EXTENSIONS,
)
from app.ai.rag.chroma_client import PresentationRAG

router = APIRouter()
logger = logging.getLogger(__name__)

# Maximum upload size: 20 MB
MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024

# ── Singleton RAG instance ────────────────────────────────────────────────────
_rag: PresentationRAG | None = None


def get_rag() -> PresentationRAG:
    """Lazy-initialise the PresentationRAG singleton."""
    global _rag
    if _rag is None:
        _rag = PresentationRAG()
    return _rag


@router.post(
    "/upload",
    response_model=DocumentExtractionResult,
    summary="Upload a PDF or PPTX and extract slide text",
    responses={
        415: {"description": "Unsupported file type"},
        422: {"description": "File could not be parsed"},
    },
)
async def upload_presentation(
    file: UploadFile = File(..., description="A .pdf or .pptx file to extract text from"),
):
    """
    Accepts a PDF or PPTX file upload, extracts text from each page/slide,
    and returns the structured result with page numbers and text content.
    """
    # ── 1. Validate file extension ────────────────────────────────────────
    filename = file.filename or "unknown"
    extension = ""
    if "." in filename:
        extension = "." + filename.rsplit(".", 1)[-1].lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{extension}'. "
                f"Accepted formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            ),
        )

    # ── 2. Read and validate size ─────────────────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error(f"Error reading uploaded file: {exc}")
        raise HTTPException(status_code=422, detail="Could not read the uploaded file.")

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    # ── 3. Parse document in a thread pool (non-blocking) ─────────────────
    try:
        result = await asyncio.to_thread(parse_document, filename, file_bytes)
    except ValueError as exc:
        logger.warning(f"Parsing failed for '{filename}': {exc}")
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error(f"Unexpected error parsing '{filename}': {exc}")
        raise HTTPException(status_code=422, detail="Failed to parse the document.")

    logger.info(
        f"Successfully extracted {len(result.slides)} slides from '{filename}'"
    )
    return result


# ── Ingest endpoint ───────────────────────────────────────────────────────────


@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Upload a PDF or PPTX, extract text, and ingest into the vector DB",
    responses={
        415: {"description": "Unsupported file type"},
        422: {"description": "File could not be parsed"},
    },
)
async def ingest_presentation(
    file: UploadFile = File(
        ..., description="A .pdf or .pptx file to extract and ingest"
    ),
):
    """
    Upload a document, extract text from each slide/page, generate embeddings,
    and store the chunks in ChromaDB for later semantic search.
    """
    # ── 1. Validate extension ─────────────────────────────────────────────
    filename = file.filename or "unknown"
    extension = ""
    if "." in filename:
        extension = "." + filename.rsplit(".", 1)[-1].lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{extension}'. "
                f"Accepted formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            ),
        )

    # ── 2. Read bytes ─────────────────────────────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error(f"Error reading uploaded file: {exc}")
        raise HTTPException(status_code=422, detail="Could not read the uploaded file.")

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    # ── 3. Parse ──────────────────────────────────────────────────────────
    try:
        extraction = await asyncio.to_thread(parse_document, filename, file_bytes)
    except ValueError as exc:
        logger.warning(f"Parsing failed for '{filename}': {exc}")
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error(f"Unexpected error parsing '{filename}': {exc}")
        raise HTTPException(status_code=422, detail="Failed to parse the document.")

    # ── 4. Ingest into vector DB ──────────────────────────────────────────
    try:
        rag = get_rag()
        chunks_stored = await rag.ingest_slides(filename, extraction.slides)
    except RuntimeError as exc:
        logger.error(f"Embedding/ingestion failed for '{filename}': {exc}")
        raise HTTPException(
            status_code=502,
            detail="Embedding generation failed. Please try again later.",
        )
    except Exception as exc:
        logger.error(f"Unexpected ingestion error for '{filename}': {exc}")
        raise HTTPException(status_code=500, detail="Ingestion failed.")

    return IngestResponse(filename=filename, chunks_stored=chunks_stored)


# ── Search endpoint ───────────────────────────────────────────────────────────


@router.post(
    "/search",
    response_model=SimilaritySearchResponse,
    summary="Semantic search over ingested presentation slides",
)
async def search_presentations(body: SimilaritySearchRequest):
    """
    Perform a semantic similarity search across all ingested slides
    (or restricted to a specific document).
    """
    try:
        rag = get_rag()
        hits = await rag.similarity_search(
            query=body.query,
            top_k=body.top_k,
            filename_filter=body.filename,
        )
    except RuntimeError as exc:
        logger.error(f"Search embedding failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Embedding generation failed. Please try again later.",
        )
    except Exception as exc:
        logger.error(f"Unexpected search error: {exc}")
        raise HTTPException(status_code=500, detail="Search failed.")

    return SimilaritySearchResponse(
        query=body.query,
        results=[SearchHit(**hit) for hit in hits],
    )

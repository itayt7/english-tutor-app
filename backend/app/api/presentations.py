"""
Presentations API router — handles document uploads and text extraction.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.schemas.presentation import DocumentExtractionResult
from app.services.document_parser import (
    parse_document,
    SUPPORTED_EXTENSIONS,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Maximum upload size: 20 MB
MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024


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

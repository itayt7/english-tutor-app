"""
ChromaDB-backed RAG pipeline for presentation slides.

Provides the PresentationRAG class which:
  • Chunks extracted slide text (by slide first, then recursive split if needed)
  • Generates embeddings via Azure OpenAI
  • Stores and retrieves chunks from a local persistent ChromaDB collection
"""

import logging
import uuid
from typing import List, Optional

import chromadb

from app.core.config import settings
from app.schemas.presentation import ExtractedSlide

logger = logging.getLogger(__name__)

# ── Chunking constants ────────────────────────────────────────────────────────
MAX_CHUNK_CHARS = 1000   # Split a slide's text if longer than this
CHUNK_OVERLAP = 100      # Overlap between sub-chunks for context continuity


def _recursive_char_split(text: str, max_len: int, overlap: int) -> List[str]:
    """
    Split *text* into chunks of at most *max_len* characters with *overlap*.
    Tries to break on paragraph → sentence → word boundaries before falling
    back to a hard character cut.
    """
    if len(text) <= max_len:
        return [text]

    separators = ["\n\n", "\n", ". ", " "]
    for sep in separators:
        parts = text.split(sep)
        if len(parts) > 1:
            chunks: List[str] = []
            current = parts[0]
            for part in parts[1:]:
                candidate = current + sep + part
                if len(candidate) <= max_len:
                    current = candidate
                else:
                    chunks.append(current)
                    # Start next chunk with overlap from previous
                    overlap_text = current[-overlap:] if overlap else ""
                    current = overlap_text + part
            chunks.append(current)
            return chunks

    # Hard character split as last resort
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_len, len(text))
        chunks.append(text[start:end])
        start += max_len - overlap
    return chunks


def chunk_slides(
    slides: List[ExtractedSlide],
    max_chunk_chars: int = MAX_CHUNK_CHARS,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> tuple[List[str], List[dict]]:
    """
    Convert extracted slides into chunks suitable for embedding.

    Strategy:
      1. Each slide is a natural chunk boundary.
      2. If a slide's text exceeds *max_chunk_chars*, it is split further
         using a recursive character text splitter.
      3. Empty slides are skipped.

    Returns:
        (documents, metadatas) — parallel lists of chunk texts and their
        metadata dicts (containing page_number and chunk_index).
    """
    documents: List[str] = []
    metadatas: List[dict] = []

    for slide in slides:
        text = slide.text.strip()
        if not text:
            continue

        if len(text) <= max_chunk_chars:
            sub_chunks = [text]
        else:
            sub_chunks = _recursive_char_split(text, max_chunk_chars, chunk_overlap)

        for chunk_idx, chunk_text in enumerate(sub_chunks):
            documents.append(chunk_text)
            metadatas.append(
                {
                    "page_number": slide.page_number,
                    "chunk_index": chunk_idx,
                }
            )

    return documents, metadatas


class PresentationRAG:
    """
    High-level interface for ingesting presentation slides into ChromaDB
    and performing semantic similarity search.

    Uses a local persistent ChromaDB instance and delegates embedding
    generation to Azure OpenAI via the embeddings module.
    """

    def __init__(
        self,
        chroma_path: Optional[str] = None,
        collection_name: str = "presentations",
    ):
        path = chroma_path or settings.CHROMA_DB_PATH
        self._client = chromadb.PersistentClient(path=path)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
        )
        logger.info(
            f"ChromaDB collection '{collection_name}' ready "
            f"({self._collection.count()} existing documents)"
        )

    # ── Ingest ────────────────────────────────────────────────────────────

    async def ingest_slides(
        self,
        filename: str,
        slides: List[ExtractedSlide],
    ) -> int:
        """
        Chunk the slides, generate embeddings, and upsert into ChromaDB.

        Args:
            filename: Source document filename (stored as metadata).
            slides:   Extracted slides to ingest.

        Returns:
            Number of chunks stored.
        """
        from app.ai.rag.embeddings import generate_embeddings

        documents, metadatas = chunk_slides(slides)
        if not documents:
            logger.warning(f"No text to ingest from '{filename}'")
            return 0

        # Tag every chunk with the source filename
        for meta in metadatas:
            meta["filename"] = filename

        # Generate embeddings via Azure OpenAI
        embeddings = await generate_embeddings(documents)

        # Stable, deterministic IDs so re-uploading the same file overwrites
        ids = [
            f"{filename}::p{m['page_number']}::c{m['chunk_index']}"
            for m in metadatas
        ]

        # Upsert into ChromaDB (sync call — but ChromaDB is local/fast)
        self._collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        logger.info(f"Ingested {len(documents)} chunks from '{filename}'")
        return len(documents)

    # ── Search ────────────────────────────────────────────────────────────

    async def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        filename_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Find the most relevant slide chunks for a query.

        Args:
            query:           Natural-language search query.
            top_k:           Maximum number of results to return.
            filename_filter: Optional — restrict search to a specific document.

        Returns:
            List of dicts with keys: text, page_number, chunk_index,
            filename, distance.
        """
        from app.ai.rag.embeddings import generate_embeddings

        if self._collection.count() == 0:
            return []

        query_embedding = (await generate_embeddings([query]))[0]

        where_filter = {"filename": filename_filter} if filename_filter else None

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self._collection.count()),
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        # Flatten the nested lists that ChromaDB returns
        hits: List[dict] = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append(
                {
                    "text": doc,
                    "page_number": meta["page_number"],
                    "chunk_index": meta["chunk_index"],
                    "filename": meta["filename"],
                    "distance": dist,
                }
            )

        return hits

    # ── Helpers ───────────────────────────────────────────────────────────

    def count(self) -> int:
        """Return the total number of chunks in the collection."""
        return self._collection.count()

    def delete_by_filename(self, filename: str) -> None:
        """Remove all chunks belonging to a specific document."""
        self._collection.delete(where={"filename": filename})
        logger.info(f"Deleted all chunks for '{filename}'")

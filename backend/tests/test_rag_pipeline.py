"""
Tests for the RAG Pipeline & Vector DB (Task 2 — Phase 4).

Covers:
  • Text chunking logic (by slide + recursive character split)
  • PresentationRAG class (ingest + similarity search)
  • /api/v1/presentations/ingest API endpoint
  • /api/v1/presentations/search API endpoint
  • Edge cases: empty DB search, empty slides, API rate-limit handling
"""

import io
import os
import shutil
import tempfile
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from httpx import AsyncClient, ASGITransport

# ── Schemas ───────────────────────────────────────────────────────────────────
from app.schemas.presentation import (
    ExtractedSlide,
    IngestResponse,
    SimilaritySearchRequest,
    SimilaritySearchResponse,
    SearchHit,
)

# ── Chunking logic ────────────────────────────────────────────────────────────
from app.ai.rag.chroma_client import (
    chunk_slides,
    _recursive_char_split,
    PresentationRAG,
)

# ── FastAPI app ───────────────────────────────────────────────────────────────
from main import app


# ===========================================================================
# 1. Schema unit tests (new RAG schemas)
# ===========================================================================


class TestRAGSchemas:
    """Validate the new Pydantic schemas for RAG operations."""

    def test_ingest_response_valid(self):
        resp = IngestResponse(filename="deck.pdf", chunks_stored=10)
        assert resp.filename == "deck.pdf"
        assert resp.chunks_stored == 10

    def test_ingest_response_rejects_negative_chunks(self):
        with pytest.raises(Exception):
            IngestResponse(filename="x.pdf", chunks_stored=-1)

    def test_similarity_search_request_defaults(self):
        req = SimilaritySearchRequest(query="hello")
        assert req.top_k == 5
        assert req.filename is None

    def test_similarity_search_request_rejects_empty_query(self):
        with pytest.raises(Exception):
            SimilaritySearchRequest(query="")

    def test_search_hit_valid(self):
        hit = SearchHit(
            text="some text",
            page_number=3,
            chunk_index=0,
            filename="deck.pdf",
            distance=0.12,
        )
        assert hit.page_number == 3

    def test_similarity_search_response_valid(self):
        resp = SimilaritySearchResponse(query="test", results=[])
        assert resp.results == []


# ===========================================================================
# 2. Chunking logic unit tests
# ===========================================================================


class TestChunking:
    """Tests for the slide chunking strategy."""

    def test_short_slides_stay_as_single_chunks(self):
        slides = [
            ExtractedSlide(page_number=1, text="Short text"),
            ExtractedSlide(page_number=2, text="Also short"),
        ]
        docs, metas = chunk_slides(slides)
        assert len(docs) == 2
        assert metas[0]["page_number"] == 1
        assert metas[1]["page_number"] == 2
        assert all(m["chunk_index"] == 0 for m in metas)

    def test_empty_slides_are_skipped(self):
        slides = [
            ExtractedSlide(page_number=1, text="Has text"),
            ExtractedSlide(page_number=2, text=""),
            ExtractedSlide(page_number=3, text="   "),
        ]
        docs, metas = chunk_slides(slides)
        assert len(docs) == 1
        assert metas[0]["page_number"] == 1

    def test_long_slide_is_split(self):
        long_text = "Word " * 300  # ~1500 chars
        slides = [ExtractedSlide(page_number=5, text=long_text)]
        docs, metas = chunk_slides(slides, max_chunk_chars=500, chunk_overlap=50)
        assert len(docs) > 1
        # All chunks should reference the same page
        assert all(m["page_number"] == 5 for m in metas)
        # chunk_index should increment
        for i, m in enumerate(metas):
            assert m["chunk_index"] == i

    def test_chunk_preserves_metadata_mapping(self):
        slides = [
            ExtractedSlide(page_number=i, text=f"Content of slide {i}")
            for i in range(1, 6)
        ]
        docs, metas = chunk_slides(slides)
        assert len(docs) == 5
        for i, m in enumerate(metas):
            assert m["page_number"] == i + 1
            assert f"Content of slide {i + 1}" in docs[i]


class TestRecursiveCharSplit:
    """Tests for the recursive character text splitter."""

    def test_text_under_limit_returns_single_chunk(self):
        result = _recursive_char_split("short text", max_len=100, overlap=10)
        assert result == ["short text"]

    def test_splits_on_paragraph_boundary(self):
        text = "Paragraph one.\n\nParagraph two."
        result = _recursive_char_split(text, max_len=20, overlap=5)
        assert len(result) >= 2

    def test_hard_split_as_fallback(self):
        text = "A" * 200  # no word/sentence boundaries
        result = _recursive_char_split(text, max_len=50, overlap=10)
        assert len(result) >= 4
        assert all(len(chunk) <= 60 for chunk in result)  # allow overlap


# ===========================================================================
# 3. PresentationRAG unit tests (with mocked embeddings)
# ===========================================================================

# Deterministic fake embeddings: a simple hash-based vector
def _fake_embedding(text: str, dim: int = 64) -> list[float]:
    """Generate a deterministic pseudo-embedding for testing."""
    import hashlib
    h = hashlib.sha256(text.encode()).hexdigest()
    vec = [int(h[i : i + 2], 16) / 255.0 for i in range(0, min(dim * 2, len(h)), 2)]
    # Pad to dim if needed
    while len(vec) < dim:
        vec.append(0.0)
    return vec[:dim]


async def _mock_generate_embeddings(texts):
    return [_fake_embedding(t) for t in texts]


class TestPresentationRAG:
    """Integration tests for PresentationRAG with mocked embeddings."""

    @pytest.fixture(autouse=True)
    def setup_temp_db(self, tmp_path):
        """Create a fresh ChromaDB in a temp dir for each test."""
        self.db_path = str(tmp_path / "test_chroma")
        with patch(
            "app.ai.rag.chroma_client.settings"
        ) as mock_settings:
            mock_settings.CHROMA_DB_PATH = self.db_path
            self.rag = PresentationRAG(chroma_path=self.db_path)

    @pytest.mark.asyncio
    async def test_ingest_and_count(self):
        """Insert 5 slides and verify all chunks are stored."""
        slides = [
            ExtractedSlide(page_number=i, text=f"Content of slide {i}")
            for i in range(1, 6)
        ]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            count = await self.rag.ingest_slides("test.pdf", slides)

        assert count == 5
        assert self.rag.count() == 5

    @pytest.mark.asyncio
    async def test_search_returns_correct_slide(self):
        """Insert 5 slides, query for keyword in slide 3, expect slide 3 on top."""
        slides = [
            ExtractedSlide(page_number=1, text="Introduction to machine learning"),
            ExtractedSlide(page_number=2, text="Data preprocessing techniques"),
            ExtractedSlide(page_number=3, text="Quantum computing and qubits explained"),
            ExtractedSlide(page_number=4, text="Software engineering best practices"),
            ExtractedSlide(page_number=5, text="Project management methodologies"),
        ]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            await self.rag.ingest_slides("deck.pdf", slides)
            results = await self.rag.similarity_search(
                "Quantum computing and qubits explained", top_k=3
            )

        assert len(results) > 0
        # The exact-match text should be the top result
        assert results[0]["page_number"] == 3
        assert "Quantum" in results[0]["text"]

    @pytest.mark.asyncio
    async def test_search_empty_db_returns_empty(self):
        """Querying an empty collection should return an empty list."""
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            results = await self.rag.similarity_search("anything", top_k=5)
        assert results == []

    @pytest.mark.asyncio
    async def test_ingest_empty_slides_returns_zero(self):
        """Slides with no text should result in 0 chunks stored."""
        slides = [
            ExtractedSlide(page_number=1, text=""),
            ExtractedSlide(page_number=2, text="   "),
        ]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            count = await self.rag.ingest_slides("empty.pdf", slides)
        assert count == 0

    @pytest.mark.asyncio
    async def test_search_with_filename_filter(self):
        """Results should be limited to the specified filename."""
        slides_a = [ExtractedSlide(page_number=1, text="Alpha content about dogs")]
        slides_b = [ExtractedSlide(page_number=1, text="Beta content about dogs")]

        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            await self.rag.ingest_slides("alpha.pdf", slides_a)
            await self.rag.ingest_slides("beta.pdf", slides_b)

            results = await self.rag.similarity_search(
                "dogs", top_k=5, filename_filter="alpha.pdf"
            )

        assert len(results) >= 1
        assert all(r["filename"] == "alpha.pdf" for r in results)

    @pytest.mark.asyncio
    async def test_delete_by_filename(self):
        """Deleting by filename should remove only that document's chunks."""
        slides = [ExtractedSlide(page_number=1, text="Hello world")]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            await self.rag.ingest_slides("deleteme.pdf", slides)
        assert self.rag.count() == 1

        self.rag.delete_by_filename("deleteme.pdf")
        assert self.rag.count() == 0

    @pytest.mark.asyncio
    async def test_re_ingest_same_file_overwrites(self):
        """Re-uploading the same file should upsert, not duplicate."""
        slides = [ExtractedSlide(page_number=1, text="Version 1")]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            await self.rag.ingest_slides("doc.pdf", slides)
            assert self.rag.count() == 1

            slides[0] = ExtractedSlide(page_number=1, text="Version 2")
            await self.rag.ingest_slides("doc.pdf", slides)
            # Should still be 1 — upserted, not added
            assert self.rag.count() == 1

    @pytest.mark.asyncio
    async def test_embedding_api_failure_raises_runtime_error(self):
        """If the embedding API fails, a RuntimeError should propagate."""
        slides = [ExtractedSlide(page_number=1, text="Some text")]
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=RuntimeError("API rate limit exceeded"),
        ):
            with pytest.raises(RuntimeError, match="API rate limit"):
                await self.rag.ingest_slides("fail.pdf", slides)


# ===========================================================================
# 4. API endpoint integration tests (with mocked embeddings)
# ===========================================================================


@pytest.fixture
def _patch_rag(tmp_path):
    """
    Patch the module-level RAG singleton to use a temp DB and mock embeddings.
    """
    import app.api.presentations as pres_module

    db_path = str(tmp_path / "api_chroma")
    rag = PresentationRAG(chroma_path=db_path, collection_name="test_api")

    pres_module._rag = rag

    with patch(
        "app.ai.rag.embeddings.generate_embeddings",
        side_effect=_mock_generate_embeddings,
    ):
        yield rag

    # Cleanup
    pres_module._rag = None


class TestPresentationsIngestAPI:
    """Integration tests for POST /api/v1/presentations/ingest."""

    async def _ingest(self, file_bytes: bytes, filename: str, content_type: str = "application/octet-stream"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/presentations/ingest",
                files={"file": (filename, file_bytes, content_type)},
            )

    @pytest.mark.asyncio
    async def test_ingest_valid_pdf(self, _patch_rag):
        import fitz

        doc = fitz.open()
        for i in range(1, 4):
            page = doc.new_page()
            page.insert_text((72, 72), f"Slide {i} about topic {i}")
        pdf_bytes = doc.tobytes()
        doc.close()

        resp = await self._ingest(pdf_bytes, "deck.pdf", "application/pdf")
        assert resp.status_code == 200
        body = resp.json()
        assert body["filename"] == "deck.pdf"
        assert body["chunks_stored"] == 3

    @pytest.mark.asyncio
    async def test_ingest_unsupported_format_returns_415(self, _patch_rag):
        resp = await self._ingest(b"data", "notes.docx")
        assert resp.status_code == 415

    @pytest.mark.asyncio
    async def test_ingest_corrupted_file_returns_422(self, _patch_rag):
        resp = await self._ingest(b"corrupt data", "bad.pdf", "application/pdf")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_ingest_empty_file_returns_422(self, _patch_rag):
        resp = await self._ingest(b"", "empty.pdf", "application/pdf")
        assert resp.status_code == 422


class TestPresentationsSearchAPI:
    """Integration tests for POST /api/v1/presentations/search."""

    async def _ingest(self, file_bytes: bytes, filename: str, content_type: str = "application/octet-stream"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/presentations/ingest",
                files={"file": (filename, file_bytes, content_type)},
            )

    async def _search(self, query: str, top_k: int = 5, filename: str | None = None):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {"query": query, "top_k": top_k}
            if filename:
                payload["filename"] = filename
            return await client.post(
                "/api/v1/presentations/search",
                json=payload,
            )

    @pytest.mark.asyncio
    async def test_search_after_ingest(self, _patch_rag):
        import fitz

        doc = fitz.open()
        texts = [
            "Machine learning fundamentals",
            "Database normalisation forms",
            "Quantum entanglement principles",
        ]
        for t in texts:
            page = doc.new_page()
            page.insert_text((72, 72), t)
        pdf_bytes = doc.tobytes()
        doc.close()

        await self._ingest(pdf_bytes, "sci.pdf", "application/pdf")

        resp = await self._search("Quantum entanglement principles", top_k=3)
        assert resp.status_code == 200
        body = resp.json()
        assert body["query"] == "Quantum entanglement principles"
        assert len(body["results"]) > 0
        assert body["results"][0]["page_number"] == 3

    @pytest.mark.asyncio
    async def test_search_empty_db_returns_empty_results(self, _patch_rag):
        resp = await self._search("anything")
        assert resp.status_code == 200
        body = resp.json()
        assert body["results"] == []

    @pytest.mark.asyncio
    async def test_search_rejects_empty_query(self, _patch_rag):
        resp = await self._search("")
        assert resp.status_code == 422

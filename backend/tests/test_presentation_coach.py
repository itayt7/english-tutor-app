"""
Tests for the Presentation Coach Agent (Task 3 — Phase 4).

Covers:
  • PitchEvaluation & EvaluatePitchRequest schema validation
  • System prompt construction
  • evaluate_pitch agent function (mocked LLM)
  • POST /api/v1/presentations/evaluate-pitch API endpoint
  • Edge cases: blank input, no RAG context, irrelevant pitch, LLM failures
"""

import json
import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from httpx import AsyncClient, ASGITransport

# ── Schemas ───────────────────────────────────────────────────────────────────
from app.schemas.presentation import (
    PitchEvaluation,
    EvaluatePitchRequest,
    ExtractedSlide,
)

# ── Prompt ────────────────────────────────────────────────────────────────────
from app.ai.prompts.presentation_coach import get_presentation_coach_system_prompt

# ── Agent ─────────────────────────────────────────────────────────────────────
from app.ai.agents.presentation_coach import (
    evaluate_pitch,
    _SAFE_FALLBACK,
    _BLANK_INPUT_FALLBACK,
)

# ── RAG (for API tests) ──────────────────────────────────────────────────────
from app.ai.rag.chroma_client import PresentationRAG

# ── FastAPI app ───────────────────────────────────────────────────────────────
from main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_chat_response(content: str) -> MagicMock:
    """Build an OpenAI-style ChatCompletion mock."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


def _valid_pitch_json(**overrides) -> str:
    """Return a valid PitchEvaluation JSON string with optional overrides."""
    data = {
        "accuracy_score": 8,
        "grammar_corrections": [],
        "coach_feedback": "Great job covering the key points!",
        "suggested_phrasing": "Our product leverages AI to improve outcomes.",
    }
    data.update(overrides)
    return json.dumps(data)


# Deterministic fake embeddings for RAG tests
def _fake_embedding(text: str, dim: int = 64) -> list[float]:
    import hashlib

    h = hashlib.sha256(text.encode()).hexdigest()
    vec = [int(h[i : i + 2], 16) / 255.0 for i in range(0, min(dim * 2, len(h)), 2)]
    while len(vec) < dim:
        vec.append(0.0)
    return vec[:dim]


async def _mock_generate_embeddings(texts):
    return [_fake_embedding(t) for t in texts]


# ===========================================================================
# 1. Schema unit tests
# ===========================================================================


class TestPitchEvaluationSchema:
    """Validate the PitchEvaluation Pydantic model."""

    def test_valid_high_score(self):
        result = PitchEvaluation(
            accuracy_score=9,
            grammar_corrections=[],
            coach_feedback="Excellent pitch!",
            suggested_phrasing="Our solution delivers measurable results.",
        )
        assert result.accuracy_score == 9
        assert result.grammar_corrections == []

    def test_valid_low_score_with_corrections(self):
        result = PitchEvaluation(
            accuracy_score=3,
            grammar_corrections=[
                '"I live here for 5 years" → "I have lived here for 5 years"',
                "Missing article before 'interesting movie'",
            ],
            coach_feedback="Good effort! Let's work on tense usage.",
            suggested_phrasing="I have been living here for five years.",
        )
        assert result.accuracy_score == 3
        assert len(result.grammar_corrections) == 2

    def test_score_below_minimum_rejected(self):
        with pytest.raises(Exception):
            PitchEvaluation(
                accuracy_score=0,
                grammar_corrections=[],
                coach_feedback="test",
            )

    def test_score_above_maximum_rejected(self):
        with pytest.raises(Exception):
            PitchEvaluation(
                accuracy_score=11,
                grammar_corrections=[],
                coach_feedback="test",
            )

    def test_defaults_for_optional_fields(self):
        result = PitchEvaluation(
            accuracy_score=5,
            grammar_corrections=[],
            coach_feedback="Keep practicing!",
        )
        assert result.suggested_phrasing == ""

    def test_round_trip_json(self):
        raw = json.dumps(
            {
                "accuracy_score": 7,
                "grammar_corrections": ["Missing article"],
                "coach_feedback": "Nice work!",
                "suggested_phrasing": "Our platform offers great value.",
            }
        )
        result = PitchEvaluation.model_validate_json(raw)
        assert result.accuracy_score == 7
        assert len(result.grammar_corrections) == 1


class TestEvaluatePitchRequestSchema:
    """Validate the EvaluatePitchRequest Pydantic model."""

    def test_valid_request(self):
        req = EvaluatePitchRequest(user_transcript="Hello, this is my pitch.")
        assert req.top_k == 5
        assert req.filename is None

    def test_rejects_empty_transcript(self):
        with pytest.raises(Exception):
            EvaluatePitchRequest(user_transcript="")

    def test_custom_top_k_and_filename(self):
        req = EvaluatePitchRequest(
            user_transcript="My pitch",
            top_k=3,
            filename="deck.pdf",
        )
        assert req.top_k == 3
        assert req.filename == "deck.pdf"

    def test_top_k_too_high_rejected(self):
        with pytest.raises(Exception):
            EvaluatePitchRequest(user_transcript="pitch", top_k=25)


# ===========================================================================
# 2. Prompt construction tests
# ===========================================================================


class TestPresentationCoachPrompt:
    """Tests for the system prompt template."""

    def test_prompt_contains_rag_context(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="Slide about quantum computing",
            user_transcript="We use quantum bits",
        )
        assert "Slide about quantum computing" in prompt

    def test_prompt_contains_user_transcript(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="Our product helps teams",
            user_transcript="We help teams collaborate",
        )
        assert "We help teams collaborate" in prompt

    def test_prompt_contains_hebrew_context(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="context", user_transcript="transcript"
        )
        assert "Hebrew" in prompt

    def test_prompt_requests_json_output(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="context", user_transcript="transcript"
        )
        assert "accuracy_score" in prompt
        assert "grammar_corrections" in prompt
        assert "coach_feedback" in prompt
        assert "suggested_phrasing" in prompt

    def test_prompt_contains_safety_guardrails(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="context", user_transcript="transcript"
        )
        assert "hallucinate" in prompt.lower() or "NOT invent" in prompt

    def test_prompt_handles_unrelated_pitch(self):
        prompt = get_presentation_coach_system_prompt(
            rag_context="context", user_transcript="transcript"
        )
        assert "unrelated" in prompt.lower() or "off-topic" in prompt.lower()


# ===========================================================================
# 3. Agent unit tests (mocked LLM)
# ===========================================================================


class TestEvaluatePitchAgent:
    """Tests for the evaluate_pitch function with mocked LLM."""

    # ── Blank input edge cases ────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_blank_transcript_returns_blank_fallback(self):
        result = await evaluate_pitch(
            rag_context="Some slide content", user_transcript=""
        )
        assert result.accuracy_score == 1
        assert result == _BLANK_INPUT_FALLBACK

    @pytest.mark.asyncio
    async def test_whitespace_transcript_returns_blank_fallback(self):
        result = await evaluate_pitch(
            rag_context="Some slide content", user_transcript="   "
        )
        assert result == _BLANK_INPUT_FALLBACK

    @pytest.mark.asyncio
    async def test_none_transcript_returns_blank_fallback(self):
        result = await evaluate_pitch(
            rag_context="Some slide content", user_transcript=None
        )
        assert result == _BLANK_INPUT_FALLBACK

    # ── Perfect pitch (high score, no corrections) ────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_perfect_pitch(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=10,
                    grammar_corrections=[],
                    coach_feedback="Outstanding! Your pitch perfectly reflects the slide content.",
                    suggested_phrasing="Our AI-powered platform delivers measurable results.",
                )
            )
        )

        result = await evaluate_pitch(
            rag_context="Our AI platform delivers measurable results",
            user_transcript="Our AI platform delivers measurable results",
        )

        assert result.accuracy_score == 10
        assert result.grammar_corrections == []
        assert "Outstanding" in result.coach_feedback

    # ── Pitch with grammar errors but accurate content ────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_pitch_with_grammar_errors(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=7,
                    grammar_corrections=[
                        '"We do a mistake" → "We make a mistake"',
                        '"depend in" → "depend on"',
                    ],
                    coach_feedback="Good content coverage! Let's polish the grammar.",
                    suggested_phrasing="We make mistakes when we depend on outdated data.",
                )
            )
        )

        result = await evaluate_pitch(
            rag_context="Our system catches mistakes by analyzing dependencies",
            user_transcript="We do a mistake when we depend in old data",
        )

        assert result.accuracy_score == 7
        assert len(result.grammar_corrections) == 2
        assert any("mistake" in c for c in result.grammar_corrections)

    # ── Pitch entirely unrelated to slides ────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_unrelated_pitch(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=1,
                    grammar_corrections=[],
                    coach_feedback="Your pitch doesn't seem to match the slide content. Try focusing on the key points from your deck.",
                    suggested_phrasing="",
                )
            )
        )

        result = await evaluate_pitch(
            rag_context="Slide about machine learning algorithms",
            user_transcript="I love pizza and basketball",
        )

        assert result.accuracy_score == 1
        assert "doesn't" in result.coach_feedback or "match" in result.coach_feedback

    # ── No RAG context available ──────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_empty_rag_context_still_works(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=1,
                    coach_feedback="No slide context was found. Please upload your deck first.",
                )
            )
        )

        result = await evaluate_pitch(
            rag_context="",
            user_transcript="Here is my pitch about the product",
        )

        assert result.accuracy_score >= 1

    # ── LLM failure → safe fallback ───────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_llm_failure_returns_safe_fallback(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API timeout")
        )

        result = await evaluate_pitch(
            rag_context="Some context",
            user_transcript="My pitch attempt",
        )

        assert result == _SAFE_FALLBACK

    # ── LLM returns malformed JSON → safe fallback ────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_malformed_json_returns_safe_fallback(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response("this is not json at all")
        )

        result = await evaluate_pitch(
            rag_context="Some context",
            user_transcript="My pitch attempt",
        )

        assert result == _SAFE_FALLBACK

    # ── Verify LLM call parameters ───────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_low_temperature_is_used(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(_valid_pitch_json())
        )

        await evaluate_pitch(
            rag_context="context", user_transcript="transcript"
        )

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["temperature"] <= 0.3

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_json_mode_is_requested(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(_valid_pitch_json())
        )

        await evaluate_pitch(
            rag_context="context", user_transcript="transcript"
        )

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["response_format"] == {"type": "json_object"}

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_system_prompt_contains_rag_context_and_transcript(self, mock_client):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(_valid_pitch_json())
        )

        await evaluate_pitch(
            rag_context="Quantum computing overview",
            user_transcript="We use qubits for processing",
        )

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        system_msg = call_kwargs["messages"][0]["content"]
        assert "Quantum computing overview" in system_msg
        assert "We use qubits for processing" in system_msg


# ===========================================================================
# 4. API endpoint integration tests
# ===========================================================================


@pytest.fixture
def _patch_rag_and_llm(tmp_path):
    """
    Patch the module-level RAG singleton to use a temp DB + mock embeddings,
    and patch the LLM client used by the presentation coach agent.
    """
    import app.api.presentations as pres_module

    db_path = str(tmp_path / "coach_chroma")
    rag = PresentationRAG(chroma_path=db_path, collection_name="test_coach")
    pres_module._rag = rag

    with patch(
        "app.ai.rag.embeddings.generate_embeddings",
        side_effect=_mock_generate_embeddings,
    ):
        yield rag

    pres_module._rag = None


class TestEvaluatePitchAPI:
    """Integration tests for POST /api/v1/presentations/evaluate-pitch."""

    async def _ingest_slides(self, rag: PresentationRAG, slides: list[ExtractedSlide], filename: str = "deck.pdf"):
        """Helper: ingest slides directly into the RAG instance."""
        with patch(
            "app.ai.rag.embeddings.generate_embeddings",
            side_effect=_mock_generate_embeddings,
        ):
            await rag.ingest_slides(filename, slides)

    async def _evaluate(self, transcript: str, filename: str | None = None, top_k: int = 5):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {"user_transcript": transcript, "top_k": top_k}
            if filename:
                payload["filename"] = filename
            return await client.post(
                "/api/v1/presentations/evaluate-pitch",
                json=payload,
            )

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_evaluate_pitch_full_flow(self, mock_client, _patch_rag_and_llm):
        """Full integration: ingest slides → evaluate pitch → get feedback."""
        rag = _patch_rag_and_llm

        # Ingest slides
        slides = [
            ExtractedSlide(page_number=1, text="Our company builds AI tools for healthcare."),
            ExtractedSlide(page_number=2, text="We reduce diagnosis time by 40 percent."),
            ExtractedSlide(page_number=3, text="Our team has 15 years of combined experience."),
        ]
        await self._ingest_slides(rag, slides)

        # Mock LLM
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=8,
                    grammar_corrections=[],
                    coach_feedback="You covered the key points effectively!",
                    suggested_phrasing="Our AI tools for healthcare reduce diagnosis time by 40%.",
                )
            )
        )

        resp = await self._evaluate("We build AI tools for healthcare and reduce diagnosis time")
        assert resp.status_code == 200
        body = resp.json()
        assert body["accuracy_score"] == 8
        assert "coach_feedback" in body

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_evaluate_pitch_empty_db(self, mock_client, _patch_rag_and_llm):
        """Pitch evaluation with no ingested slides should still work."""
        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(
                _valid_pitch_json(
                    accuracy_score=1,
                    coach_feedback="No slides were found. Please upload your deck first.",
                )
            )
        )

        resp = await self._evaluate("My pitch about something")
        assert resp.status_code == 200
        body = resp.json()
        assert body["accuracy_score"] >= 1

    @pytest.mark.asyncio
    async def test_evaluate_pitch_rejects_empty_transcript(self, _patch_rag_and_llm):
        """Empty transcript should be rejected by Pydantic validation (422)."""
        resp = await self._evaluate("")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_evaluate_pitch_with_filename_filter(self, mock_client, _patch_rag_and_llm):
        """Pitch evaluation should respect the filename filter for RAG context."""
        rag = _patch_rag_and_llm

        slides_a = [ExtractedSlide(page_number=1, text="Product A does analytics.")]
        slides_b = [ExtractedSlide(page_number=1, text="Product B does security.")]
        await self._ingest_slides(rag, slides_a, "product_a.pdf")
        await self._ingest_slides(rag, slides_b, "product_b.pdf")

        mock_client.chat.completions.create = AsyncMock(
            return_value=_mock_chat_response(_valid_pitch_json(accuracy_score=9))
        )

        resp = await self._evaluate(
            "Product A does analytics", filename="product_a.pdf"
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @patch("app.ai.agents.presentation_coach.ai_client")
    async def test_evaluate_pitch_llm_failure_returns_fallback(self, mock_client, _patch_rag_and_llm):
        """If the LLM fails, the endpoint should still return a valid response (fallback)."""
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("LLM down")
        )

        resp = await self._evaluate("My pitch attempt")
        assert resp.status_code == 200
        body = resp.json()
        assert body["accuracy_score"] == 1
        assert "went wrong" in body["coach_feedback"]

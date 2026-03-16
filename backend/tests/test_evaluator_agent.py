import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.schemas.evaluation import CorrectionItem, EvaluationResult
from app.ai.agents.evaluator import evaluate_user_message


# ---------------------------------------------------------------------------
# Schema / model unit tests
# ---------------------------------------------------------------------------


class TestEvaluationSchemas:
    """Tests for the Pydantic evaluation schemas."""

    def test_evaluation_result_no_errors(self):
        """A clean result should parse with an empty corrections list."""
        result = EvaluationResult(has_errors=False, corrections=[])
        assert result.has_errors is False
        assert result.corrections == []

    def test_evaluation_result_with_errors(self):
        """A result with corrections should parse all fields correctly."""
        correction = CorrectionItem(
            original_text="did a big mistake",
            corrected_text="made a big mistake",
            explanation="In English we say 'make a mistake', not 'do a mistake'.",
            error_type="literal_translation",
        )
        result = EvaluationResult(has_errors=True, corrections=[correction])
        assert result.has_errors is True
        assert len(result.corrections) == 1
        assert result.corrections[0].error_type == "literal_translation"

    def test_correction_item_invalid_error_type_rejected(self):
        """An unknown error_type should be rejected by Pydantic."""
        with pytest.raises(Exception):
            CorrectionItem(
                original_text="foo",
                corrected_text="bar",
                explanation="test",
                error_type="unknown_category",  # type: ignore[arg-type]
            )

    def test_evaluation_result_from_json(self):
        """model_validate_json should round-trip correctly."""
        raw = json.dumps(
            {
                "has_errors": True,
                "corrections": [
                    {
                        "original_text": "angry on me",
                        "corrected_text": "angry with me",
                        "explanation": "Use 'angry with' not 'angry on'.",
                        "error_type": "vocabulary",
                    }
                ],
            }
        )
        result = EvaluationResult.model_validate_json(raw)
        assert result.has_errors is True
        assert result.corrections[0].corrected_text == "angry with me"

    def test_evaluation_result_defaults_to_empty_corrections(self):
        """If corrections key is omitted, it defaults to an empty list."""
        result = EvaluationResult(has_errors=False)
        assert result.corrections == []


# ---------------------------------------------------------------------------
# Agent integration tests (mocked LLM)
# ---------------------------------------------------------------------------


def _mock_chat_response(content: str) -> MagicMock:
    """Helper: build an OpenAI-style ChatCompletion mock."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


class TestEvaluateUserMessage:
    """Tests for the evaluate_user_message agent function (LLM mocked)."""

    @pytest.mark.asyncio
    async def test_empty_message_returns_no_errors(self):
        """Whitespace-only input should short-circuit without calling the LLM."""
        result = await evaluate_user_message("   ", "intermediate")
        assert result.has_errors is False
        assert result.corrections == []

    @pytest.mark.asyncio
    async def test_flawless_sentence(self):
        """A perfect sentence should come back with has_errors=False."""
        mock_json = json.dumps({"has_errors": False, "corrections": []})

        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(mock_json)
            )

            result = await evaluate_user_message(
                "I have been working here for five years.", "intermediate"
            )

        assert result.has_errors is False
        assert result.corrections == []

    @pytest.mark.asyncio
    async def test_classic_hebrew_error(self):
        """'did a big mistake' should be flagged as a literal_translation error."""
        mock_json = json.dumps(
            {
                "has_errors": True,
                "corrections": [
                    {
                        "original_text": "did a big mistake",
                        "corrected_text": "made a big mistake",
                        "explanation": "In English the correct collocation is 'make a mistake', not 'do a mistake'.",
                        "error_type": "literal_translation",
                    }
                ],
            }
        )

        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(mock_json)
            )

            result = await evaluate_user_message(
                "We did a big mistake yesterday.", "intermediate"
            )

        assert result.has_errors is True
        assert len(result.corrections) == 1
        assert result.corrections[0].error_type == "literal_translation"
        assert result.corrections[0].original_text == "did a big mistake"

    @pytest.mark.asyncio
    async def test_missing_copula_and_preposition(self):
        """Multiple errors (missing copula + wrong preposition) should both be captured."""
        mock_json = json.dumps(
            {
                "has_errors": True,
                "corrections": [
                    {
                        "original_text": "boss very angry",
                        "corrected_text": "boss is very angry",
                        "explanation": "A linking verb ('is') is required before the adjective.",
                        "error_type": "grammar",
                    },
                    {
                        "original_text": "angry on me",
                        "corrected_text": "angry with me",
                        "explanation": "The correct preposition is 'with' (or 'at'), not 'on'.",
                        "error_type": "literal_translation",
                    },
                ],
            }
        )

        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(mock_json)
            )

            result = await evaluate_user_message(
                "My boss very angry on me.", "beginner"
            )

        assert result.has_errors is True
        assert len(result.corrections) == 2
        error_types = {c.error_type for c in result.corrections}
        assert "grammar" in error_types
        assert "literal_translation" in error_types

    @pytest.mark.asyncio
    async def test_api_failure_returns_safe_default(self):
        """If the LLM call throws, we should get a safe no-errors fallback."""
        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                side_effect=Exception("API timeout")
            )

            result = await evaluate_user_message(
                "This should not crash.", "intermediate"
            )

        assert result.has_errors is False
        assert result.corrections == []

    @pytest.mark.asyncio
    async def test_malformed_json_returns_safe_default(self):
        """If the LLM returns invalid JSON, we should get a safe fallback."""
        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response("not valid json {{{")
            )

            result = await evaluate_user_message(
                "Some input.", "advanced"
            )

        assert result.has_errors is False
        assert result.corrections == []

    @pytest.mark.asyncio
    async def test_low_temperature_is_used(self):
        """The evaluator should use a low temperature for deterministic output."""
        mock_json = json.dumps({"has_errors": False, "corrections": []})

        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(mock_json)
            )

            await evaluate_user_message("Hello world", "intermediate")

            call_kwargs = mock_client.chat.completions.create.call_args.kwargs
            assert call_kwargs["temperature"] == 0.1

    @pytest.mark.asyncio
    async def test_json_mode_is_requested(self):
        """The evaluator should request JSON output format from the API."""
        mock_json = json.dumps({"has_errors": False, "corrections": []})

        with patch(
            "app.ai.agents.evaluator.ai_client"
        ) as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(mock_json)
            )

            await evaluate_user_message("Hello world", "intermediate")

            call_kwargs = mock_client.chat.completions.create.call_args.kwargs
            assert call_kwargs["response_format"] == {"type": "json_object"}

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.schemas.chat import ChatMessage, ChatRequest, ChatResponse
from app.schemas.evaluation import EvaluationResult


# ---------------------------------------------------------------------------
# Schema unit tests
# ---------------------------------------------------------------------------


class TestChatSchemas:
    """Tests for the Chat Pydantic schemas."""

    def test_chat_message_valid_roles(self):
        """user, assistant, and system should all be accepted."""
        for role in ("user", "assistant", "system"):
            msg = ChatMessage(role=role, content="hello")
            assert msg.role == role

    def test_chat_message_invalid_role_rejected(self):
        """An unrecognised role should be rejected by the regex pattern."""
        with pytest.raises(Exception):
            ChatMessage(role="hacker", content="hello")

    def test_chat_request_defaults(self):
        """Defaults should fill in when only user_message is provided."""
        req = ChatRequest(user_message="Hi there")
        assert req.proficiency_level == "B2"
        assert req.native_language == "Hebrew"
        assert req.message_history == []

    def test_chat_request_with_history(self):
        """History should round-trip correctly."""
        req = ChatRequest(
            user_message="How are you?",
            message_history=[
                ChatMessage(role="user", content="Hi"),
                ChatMessage(role="assistant", content="Hello!"),
            ],
        )
        assert len(req.message_history) == 2
        assert req.message_history[0].role == "user"

    def test_chat_request_missing_user_message_rejected(self):
        """user_message is required — omitting it should raise."""
        with pytest.raises(Exception):
            ChatRequest()  # type: ignore[call-arg]

    def test_chat_response_structure(self):
        """ChatResponse should accept a tutor string + EvaluationResult."""
        resp = ChatResponse(
            tutor_response="That's great!",
            evaluation=EvaluationResult(has_errors=False, corrections=[]),
        )
        assert resp.tutor_response == "That's great!"
        assert resp.evaluation.has_errors is False


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


# ---------------------------------------------------------------------------
# Endpoint integration tests (LLM mocked, real FastAPI test client)
# ---------------------------------------------------------------------------


class TestChatEndpoint:
    """Tests for POST /api/chat/message using the real FastAPI app."""

    @pytest.mark.asyncio
    async def test_happy_path(self):
        """A valid request should return 200 with tutor_response and evaluation."""
        tutor_text = "That sounds wonderful! Tell me more."
        eval_json = json.dumps({"has_errors": False, "corrections": []})

        with (
            patch("app.ai.agents.tutor.ai_client") as mock_tutor_client,
            patch("app.ai.agents.evaluator.ai_client") as mock_eval_client,
        ):
            mock_tutor_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(tutor_text)
            )
            mock_eval_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(eval_json)
            )

            from main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/chat/message",
                    json={
                        "user_message": "I have been working here for five years.",
                        "message_history": [
                            {"role": "user", "content": "Hi"},
                            {"role": "assistant", "content": "Hello!"},
                        ],
                        "proficiency_level": "B2",
                        "native_language": "Hebrew",
                    },
                )

            assert resp.status_code == 200
            body = resp.json()
            assert body["tutor_response"] == tutor_text
            assert body["evaluation"]["has_errors"] is False
            assert body["evaluation"]["corrections"] == []

    @pytest.mark.asyncio
    async def test_empty_history(self):
        """The very first message of a session (empty history) should work."""
        tutor_text = "Hi! What would you like to talk about today?"
        eval_json = json.dumps({"has_errors": False, "corrections": []})

        with (
            patch("app.ai.agents.tutor.ai_client") as mock_tutor_client,
            patch("app.ai.agents.evaluator.ai_client") as mock_eval_client,
        ):
            mock_tutor_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(tutor_text)
            )
            mock_eval_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(eval_json)
            )

            from main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/chat/message",
                    json={"user_message": "Hello"},
                )

            assert resp.status_code == 200
            body = resp.json()
            assert body["tutor_response"] == tutor_text

    @pytest.mark.asyncio
    async def test_with_errors_detected(self):
        """When the evaluator finds errors, they should appear in the response."""
        tutor_text = "I understand. Mistakes happen!"
        eval_json = json.dumps(
            {
                "has_errors": True,
                "corrections": [
                    {
                        "original_text": "did a big mistake",
                        "corrected_text": "made a big mistake",
                        "explanation": "Use 'make a mistake', not 'do a mistake'.",
                        "error_type": "literal_translation",
                    }
                ],
            }
        )

        with (
            patch("app.ai.agents.tutor.ai_client") as mock_tutor_client,
            patch("app.ai.agents.evaluator.ai_client") as mock_eval_client,
        ):
            mock_tutor_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(tutor_text)
            )
            mock_eval_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(eval_json)
            )

            from main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/chat/message",
                    json={"user_message": "We did a big mistake yesterday."},
                )

            assert resp.status_code == 200
            body = resp.json()
            assert body["evaluation"]["has_errors"] is True
            assert len(body["evaluation"]["corrections"]) == 1
            assert body["evaluation"]["corrections"][0]["error_type"] == "literal_translation"

    @pytest.mark.asyncio
    async def test_missing_user_message_returns_422(self):
        """Omitting the required user_message field should trigger a 422."""
        from main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/chat/message", json={})

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_role_returns_422(self):
        """A message_history entry with an invalid role should trigger a 422."""
        from main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/chat/message",
                json={
                    "user_message": "Hi",
                    "message_history": [
                        {"role": "hacker", "content": "pwned"}
                    ],
                },
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_evaluator_failure_does_not_break_response(self):
        """If the evaluator LLM fails, we should still get a tutor reply + safe fallback."""
        tutor_text = "Tell me about your weekend!"

        with (
            patch("app.ai.agents.tutor.ai_client") as mock_tutor_client,
            patch("app.ai.agents.evaluator.ai_client") as mock_eval_client,
        ):
            mock_tutor_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(tutor_text)
            )
            # Evaluator explodes
            mock_eval_client.chat.completions.create = AsyncMock(
                side_effect=Exception("LLM timeout")
            )

            from main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post(
                    "/api/chat/message",
                    json={"user_message": "I go to park yesterday."},
                )

            assert resp.status_code == 200
            body = resp.json()
            assert body["tutor_response"] == tutor_text
            # Evaluator failed gracefully — safe default
            assert body["evaluation"]["has_errors"] is False
            assert body["evaluation"]["corrections"] == []

    @pytest.mark.asyncio
    async def test_both_agents_called_concurrently(self):
        """Both the tutor and evaluator agents should be dispatched together."""
        tutor_text = "Nice!"
        eval_json = json.dumps({"has_errors": False, "corrections": []})

        with (
            patch("app.ai.agents.tutor.ai_client") as mock_tutor_client,
            patch("app.ai.agents.evaluator.ai_client") as mock_eval_client,
        ):
            mock_tutor_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(tutor_text)
            )
            mock_eval_client.chat.completions.create = AsyncMock(
                return_value=_mock_chat_response(eval_json)
            )

            from main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                await ac.post(
                    "/api/chat/message",
                    json={"user_message": "Hello there!"},
                )

            # Both LLM clients should have been called exactly once
            mock_tutor_client.chat.completions.create.assert_awaited_once()
            mock_eval_client.chat.completions.create.assert_awaited_once()

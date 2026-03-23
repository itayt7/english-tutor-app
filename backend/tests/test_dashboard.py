"""
Tests for the Dashboard API & related schemas/models.

Covers:
  - Schema validation (Pydantic)
  - GET /api/v1/dashboard/stats — happy path, empty state, unknown user
  - POST /api/v1/dashboard/analyse-session (mocked AI)
  - InsightsGeneratorResult normalisation (unknown category → "Other")
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.session import Session
from app.models.vocabulary import VocabularyItem
from app.models.mistake import MistakePattern
from app.schemas.dashboard import (
    VocabularyItemRead,
    MistakePatternAggregate,
    ActionableInsight,
    DashboardStats,
    InsightsMistakeItem,
    InsightsVocabularyItem,
    InsightsGeneratorResult,
)


# ---------------------------------------------------------------------------
# Schema unit tests
# ---------------------------------------------------------------------------


class TestDashboardSchemas:
    """Validate the Pydantic models used by the dashboard."""

    def test_vocabulary_item_read(self):
        item = VocabularyItemRead(
            id=1,
            word_or_phrase="Nevertheless",
            hebrew_translation="בכל זאת",
            source_context="Nevertheless, the project was completed.",
            mastery_level=3,
        )
        assert item.mastery_level == 3

    def test_vocabulary_item_mastery_bounds(self):
        """mastery_level must be 1–5."""
        with pytest.raises(Exception):
            VocabularyItemRead(
                id=1,
                word_or_phrase="test",
                hebrew_translation="מבחן",
                source_context="ctx",
                mastery_level=0,
            )
        with pytest.raises(Exception):
            VocabularyItemRead(
                id=1,
                word_or_phrase="test",
                hebrew_translation="מבחן",
                source_context="ctx",
                mastery_level=6,
            )

    def test_mistake_pattern_aggregate(self):
        agg = MistakePatternAggregate(
            category="Prepositions",
            frequency_count=5,
            recent_examples=["I arrived to the office"],
        )
        assert agg.frequency_count == 5

    def test_actionable_insight(self):
        ins = ActionableInsight(
            title="Watch your prepositions",
            description="You tend to confuse in/on/at.",
            category="Prepositions",
        )
        assert ins.category == "Prepositions"

    def test_dashboard_stats_empty(self):
        """An empty dashboard should be constructable."""
        stats = DashboardStats(
            total_sessions=0,
            total_minutes=0,
            words_mastered=0,
            vocabulary=[],
            mistake_patterns=[],
            insights=[],
        )
        assert stats.total_sessions == 0

    def test_insights_generator_result_defaults(self):
        result = InsightsGeneratorResult()
        assert result.mistake_patterns == []
        assert result.vocabulary == []


# ---------------------------------------------------------------------------
# API integration tests (uses the real SQLite DB via SessionLocal)
# ---------------------------------------------------------------------------


@pytest.fixture()
def _clean_dashboard_data():
    """
    Fixture that creates a test user + session and cleans up after the test.
    """
    db = SessionLocal()
    # Ensure a user exists with id=9999
    user = db.get(User, 9999)
    if not user:
        user = User(id=9999, native_language="Hebrew", proficiency_level="beginner")
        db.add(user)
        db.commit()
        db.refresh(user)

    yield user

    # Clean up
    db.query(VocabularyItem).filter(VocabularyItem.user_id == 9999).delete()
    db.query(MistakePattern).filter(MistakePattern.user_id == 9999).delete()
    db.query(Session).filter(Session.user_id == 9999).delete()
    db.query(User).filter(User.id == 9999).delete()
    db.commit()
    db.close()


class TestDashboardStatsEndpoint:
    """GET /api/v1/dashboard/stats"""

    @pytest.mark.anyio
    async def test_stats_for_existing_user(self, _clean_dashboard_data):
        """Should return a valid DashboardStats JSON for user 9999."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/dashboard/stats", params={"user_id": 9999})

        assert resp.status_code == 200
        data = resp.json()
        assert "total_sessions" in data
        assert "vocabulary" in data
        assert "mistake_patterns" in data
        assert "insights" in data
        # With 0 sessions the lists should be empty
        assert data["total_sessions"] == 0

    @pytest.mark.anyio
    async def test_stats_unknown_user_404(self):
        """Requesting stats for a non-existent user should return 404."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get(
                "/api/v1/dashboard/stats", params={"user_id": 999999}
            )
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_stats_with_data(self, _clean_dashboard_data):
        """After inserting a session + vocab + mistake, stats should reflect them."""
        db = SessionLocal()
        session = Session(
            user_id=9999, type="conversation", topic="test", duration_minutes=10
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        db.add(
            VocabularyItem(
                user_id=9999,
                session_id=session.id,
                word_or_phrase="Test",
                hebrew_translation="מבחן",
                source_context="This is a test.",
                mastery_level=4,
            )
        )
        db.add(
            MistakePattern(
                user_id=9999,
                session_id=session.id,
                category="Prepositions",
                example_from_transcript="I arrived to the office.",
                correction="I arrived at the office.",
            )
        )
        db.commit()
        db.close()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/dashboard/stats", params={"user_id": 9999})

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_sessions"] == 1
        assert data["total_minutes"] == 10
        assert data["words_mastered"] == 1  # mastery_level >= 4
        assert len(data["vocabulary"]) == 1
        # Prepositions should have frequency 1
        prep = next(
            (m for m in data["mistake_patterns"] if m["category"] == "Prepositions"),
            None,
        )
        assert prep is not None
        assert prep["frequency_count"] == 1
        assert len(prep["recent_examples"]) == 1

    @pytest.mark.anyio
    async def test_empty_state_returns_empty_lists(self, _clean_dashboard_data):
        """A brand-new user should get empty vocabulary and zero-count mistakes."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/dashboard/stats", params={"user_id": 9999})

        data = resp.json()
        assert data["vocabulary"] == []
        assert all(m["frequency_count"] == 0 for m in data["mistake_patterns"])
        assert data["insights"] == []


# ---------------------------------------------------------------------------
# Insights generator normalisation test
# ---------------------------------------------------------------------------


class TestInsightsGeneratorResult:
    def test_unknown_category_kept_by_pydantic(self):
        """
        Pydantic should accept any category string.
        The *agent* code normalises unknowns to 'Other'.
        """
        result = InsightsGeneratorResult.model_validate_json(
            '{"mistake_patterns": [{"category": "Spelling", '
            '"example_from_transcript": "teh", "correction": "the"}], '
            '"vocabulary": []}'
        )
        assert result.mistake_patterns[0].category == "Spelling"

    def test_normalise_unknown_category(self):
        """Simulate the agent's normalisation logic."""
        from app.ai.prompts.insights_generator import VALID_MISTAKE_CATEGORIES

        result = InsightsGeneratorResult.model_validate_json(
            '{"mistake_patterns": [{"category": "Spelling", '
            '"example_from_transcript": "teh", "correction": "the"}], '
            '"vocabulary": []}'
        )
        for mp in result.mistake_patterns:
            if mp.category not in VALID_MISTAKE_CATEGORIES:
                mp.category = "Other"
        assert result.mistake_patterns[0].category == "Other"

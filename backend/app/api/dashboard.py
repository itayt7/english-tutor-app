from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from app.database import get_db
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.vocabulary import VocabularyItem
from app.models.mistake import MistakePattern
from app.schemas.dashboard import (
    DashboardStats,
    VocabularyItemRead,
    MistakePatternAggregate,
    ActionableInsight,
    InsightsGeneratorResult,
)
from app.ai.agents.insights_generator import generate_session_insights

router = APIRouter(tags=["Dashboard"])
logger = logging.getLogger(__name__)

# ── Canonical mistake categories for the radar chart ─────────────────────────
DEFAULT_CATEGORIES = [
    "Prepositions",
    "Verb Tense",
    "Subject-Verb Agreement",
    "Hebrew Interference",
    "Vocabulary Misuse",
    "Articles",
    "Word Order",
    "Other",
]


# ── GET /stats ────────────────────────────────────────────────────────────────
@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(user_id: int = 1, db: Session = Depends(get_db)):
    """
    Returns aggregated learning stats for the given user:
      • total sessions + total practice minutes
      • recent vocabulary items
      • mistake‐pattern frequencies (for the radar chart)
      • actionable AI‐generated tips
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found.",
        )

    # ── Session counts ───────────────────────────────────────────────────
    total_sessions: int = (
        db.query(func.count(SessionModel.id))
        .filter(SessionModel.user_id == user_id)
        .scalar()
        or 0
    )
    total_minutes: int = (
        db.query(func.coalesce(func.sum(SessionModel.duration_minutes), 0))
        .filter(SessionModel.user_id == user_id)
        .scalar()
        or 0
    )

    # ── Vocabulary ───────────────────────────────────────────────────────
    vocab_rows = (
        db.query(VocabularyItem)
        .filter(VocabularyItem.user_id == user_id)
        .order_by(VocabularyItem.created_at.desc())
        .limit(50)
        .all()
    )
    words_mastered = (
        db.query(func.count(VocabularyItem.id))
        .filter(VocabularyItem.user_id == user_id, VocabularyItem.mastery_level >= 4)
        .scalar()
        or 0
    )

    # ── Mistake aggregation ──────────────────────────────────────────────
    mistake_agg_rows = (
        db.query(
            MistakePattern.category,
            func.count(MistakePattern.id).label("cnt"),
        )
        .filter(MistakePattern.user_id == user_id)
        .group_by(MistakePattern.category)
        .all()
    )
    # Build a dict for easy lookup
    agg_dict: dict[str, int] = {row.category: row.cnt for row in mistake_agg_rows}

    # For each category, fetch the 3 most recent examples
    mistake_patterns: list[MistakePatternAggregate] = []
    for cat in DEFAULT_CATEGORIES:
        freq = agg_dict.get(cat, 0)
        recent = (
            db.query(MistakePattern.example_from_transcript)
            .filter(
                MistakePattern.user_id == user_id,
                MistakePattern.category == cat,
            )
            .order_by(MistakePattern.created_at.desc())
            .limit(3)
            .all()
        )
        mistake_patterns.append(
            MistakePatternAggregate(
                category=cat,
                frequency_count=freq,
                recent_examples=[r[0] for r in recent],
            )
        )

    # ── Actionable insights (rule-based, no LLM call) ───────────────────
    insights: list[ActionableInsight] = []
    # Sort by frequency descending and surface tips for the top weaknesses
    sorted_mistakes = sorted(mistake_patterns, key=lambda m: m.frequency_count, reverse=True)
    _TIP_MAP = {
        "Prepositions": (
            "Preposition practice needed",
            "You frequently confuse prepositions like 'in/on/at'. "
            "Try to memorise fixed collocations: 'on Monday', 'at night', 'in the morning'.",
        ),
        "Verb Tense": (
            "Tense consistency",
            "Watch your verb tenses — Hebrew doesn't distinguish Present Perfect "
            "from Past Simple the way English does. Ask yourself: is the action finished or ongoing?",
        ),
        "Subject-Verb Agreement": (
            "Subject–verb agreement",
            "Make sure singular subjects pair with singular verbs: "
            "'He goes' not 'He go'. In Hebrew the verb often comes first, which can cause confusion.",
        ),
        "Hebrew Interference": (
            "Avoid literal translations",
            "Some of your phrases sound like direct Hebrew-to-English translations. "
            "Try thinking in English patterns instead of translating word by word.",
        ),
        "Vocabulary Misuse": (
            "Expand your word choice",
            "You're sometimes using a close-but-wrong word. "
            "Reading English articles daily can help build natural collocations.",
        ),
        "Articles": (
            "Article usage (a / an / the)",
            "Hebrew doesn't have indefinite articles. Remember: use 'a/an' for first mentions "
            "and 'the' when both speaker and listener know which item is meant.",
        ),
        "Word Order": (
            "English word order",
            "Unlike Hebrew, English follows a strict Subject-Verb-Object order. "
            "Keep adjectives before the noun: 'a big house', not 'a house big'.",
        ),
    }

    for mp in sorted_mistakes:
        if mp.frequency_count > 0 and mp.category in _TIP_MAP:
            title, desc = _TIP_MAP[mp.category]
            insights.append(
                ActionableInsight(
                    title=title,
                    description=desc,
                    category=mp.category,
                )
            )
        if len(insights) >= 3:
            break

    return DashboardStats(
        total_sessions=total_sessions,
        total_minutes=total_minutes,
        words_mastered=words_mastered,
        vocabulary=[VocabularyItemRead.model_validate(v) for v in vocab_rows],
        mistake_patterns=mistake_patterns,
        insights=insights,
    )


# ── POST /analyse-session ────────────────────────────────────────────────────
@router.post("/analyse-session", status_code=status.HTTP_201_CREATED)
async def analyse_session(
    user_id: int,
    session_id: int,
    transcript: list[dict],
    db: Session = Depends(get_db),
):
    """
    Called after a session ends. Sends the full transcript to the AI
    Insights Generator, then persists vocabulary + mistake data.
    """
    # Validate user & session exist
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Call the AI agent
    result: InsightsGeneratorResult = await generate_session_insights(transcript)

    # Persist vocabulary
    for v in result.vocabulary:
        item = VocabularyItem(
            user_id=user_id,
            session_id=session_id,
            word_or_phrase=v.word_or_phrase,
            hebrew_translation=v.hebrew_translation,
            source_context=v.source_context[:500],  # guard against overly long strings
        )
        db.add(item)

    # Persist mistakes
    for m in result.mistake_patterns:
        pattern = MistakePattern(
            user_id=user_id,
            session_id=session_id,
            category=m.category,
            example_from_transcript=m.example_from_transcript[:500],
            correction=m.correction[:500],
        )
        db.add(pattern)

    db.commit()

    return {
        "status": "ok",
        "vocabulary_added": len(result.vocabulary),
        "mistakes_logged": len(result.mistake_patterns),
    }

"""
GET /api/v1/news — fetch topical news articles split into translatable sentences.

Query params:
  • topic       (str, required)  – e.g. "technology", "climate change"
  • difficulty  (str, optional)  – easy | medium | hard  (default: medium)
  • max_articles(int, optional)  – 1-5 (default: 3)
  • language    (str, optional)  – en | he  (default: en)
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.news import ArticleLanguage, DifficultyLevel, NewsResponse
from app.services.news_gatherer import fetch_news_for_translation

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/news", response_model=NewsResponse, tags=["Translation Practice"])
async def get_news_for_translation(
    topic: str = Query(
        ...,
        min_length=1,
        max_length=120,
        description="Topic to search for.",
        examples=["technology", "climate change", "sports"],
    ),
    difficulty: DifficultyLevel = Query(
        default=DifficultyLevel.MEDIUM,
        description="Controls the complexity of fetched content.",
    ),
    max_articles: int = Query(
        default=3,
        ge=1,
        le=5,
        description="Number of articles to return (1-5).",
    ),
    language: ArticleLanguage = Query(
        default=ArticleLanguage.EN,
        description="Article language: 'en' (translate to Hebrew) or 'he' (translate to English).",
    ),
) -> NewsResponse:
    """
    Fetch recent news articles on *topic*, clean the text, and return
    an array of sentence-level translation tasks.
    """
    try:
        return await fetch_news_for_translation(
            topic=topic,
            difficulty=difficulty,
            max_articles=max_articles,
            language=language,
        )

    except httpx.TimeoutException:
        logger.error("News search timed out for topic=%s", topic)
        raise HTTPException(
            status_code=504,
            detail="The news search service timed out. Please try again.",
        )

    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.error(
            "News search returned HTTP %s for topic=%s: %s",
            status, topic, exc.response.text[:200],
        )
        if status == 429:
            raise HTTPException(
                status_code=429,
                detail="News search rate limit reached. Please wait a moment and retry.",
            )
        raise HTTPException(
            status_code=502,
            detail="The news search service returned an error. Please try again later.",
        )

    except Exception as exc:
        logger.exception("Unexpected error fetching news for topic=%s", topic)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching news.",
        )

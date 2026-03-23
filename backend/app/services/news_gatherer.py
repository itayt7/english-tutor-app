"""
News-fetching service for the Translation-Practice pipeline.

Uses NewsAPI.org (https://newsapi.org/) to retrieve recent tech news
articles for a given topic.  Falls back gracefully when:
  • the API key is missing  → returns curated fallback articles
  • the API returns empty   → returns an empty list
  • the API times out       → raises a clear HTTPException

When the user selects Hebrew→English mode, articles are always fetched
in English and then translated to Hebrew by the LLM article-translator
agent.  This avoids low-quality Hebrew news sources.

The fetched results are cleaned and split into translatable sentences
by the ``text_processing`` module.
"""

from __future__ import annotations

import logging
import re
from typing import List

import httpx

from app.core.config import settings
from app.schemas.news import (
    ArticleLanguage,
    DifficultyLevel,
    NewsArticleResponse,
    NewsResponse,
    SentenceTask,
)
from app.services.text_processing import text_to_sentence_tasks
from app.ai.agents.article_translator import translate_article_to_hebrew

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

_NEWSAPI_EVERYTHING_URL = "https://newsapi.org/v2/everything"
_REQUEST_TIMEOUT = 10.0  # seconds

# Difficulty → sort strategy
#   EASY   : popular / recent articles with simpler language
#   MEDIUM : recent articles from any source
#   HARD   : relevancy-sorted articles (longer, more complex language)
#
# NOTE: We intentionally do NOT restrict by domain so that topic-based
#       searches (e.g. "sports", "health") return relevant results
#       rather than being limited to tech-only sites.
_DIFFICULTY_CONFIG: dict[DifficultyLevel, dict] = {
    DifficultyLevel.EASY: {
        "sortBy": "publishedAt",
    },
    DifficultyLevel.MEDIUM: {
        "sortBy": "publishedAt",
    },
    DifficultyLevel.HARD: {
        "sortBy": "relevancy",
    },
}

# ── Fallback content (used when no API key is configured) ─────────────────────

_FALLBACK_ARTICLES_EN: list[dict] = [
    {
        "title": "Global Climate Summit Reaches New Agreement",
        "source": "Fallback / Demo Content",
        "url": None,
        "body": (
            "World leaders gathered in Geneva this week for the annual climate summit. "
            "After five days of intense negotiations, delegates from over 190 countries "
            "reached a historic agreement to reduce carbon emissions by 45 percent before "
            "2035. The agreement includes new funding mechanisms for developing nations. "
            "Environmental groups praised the deal but warned that implementation will be "
            "the true test of commitment. U.S.A. representatives emphasized the importance "
            "of technology transfer between nations. Dr. Maria Santos, the lead negotiator, "
            "called the agreement a turning point for global cooperation."
        ),
    },
    {
        "title": "Advances in Artificial Intelligence Transform Healthcare",
        "source": "Fallback / Demo Content",
        "url": None,
        "body": (
            "Hospitals around the world are adopting artificial intelligence tools to "
            "improve patient outcomes. A new study published in the Journal of Medical "
            "Research shows that AI-assisted diagnostics reduced misdiagnosis rates by "
            "30 percent in emergency departments. The technology analyzes medical images "
            "and patient records faster than human physicians alone. Critics argue that "
            "over-reliance on AI could erode essential clinical skills. Prof. James Lee "
            "of Stanford University believes the key is a balanced approach."
        ),
    },
    {
        "title": "The Future of Remote Work",
        "source": "Fallback / Demo Content",
        "url": None,
        "body": (
            "Three years after the pandemic reshaped office culture, remote work remains "
            "a divisive topic among employers. A survey by McKinsey & Co. found that 58 "
            "percent of American workers have the option to work from home at least one "
            "day a week. Productivity data suggests that hybrid models outperform both "
            "fully remote and fully in-office setups. However, junior employees report "
            "feeling isolated and missing mentorship opportunities. Companies like Google "
            "Inc. and Microsoft Corp. are experimenting with new office designs to "
            "encourage collaboration during in-person days."
        ),
    },
]

_FALLBACK_ARTICLES: dict[str, list[dict]] = {
    "en": _FALLBACK_ARTICLES_EN,
}


# ── NewsAPI.org integration ───────────────────────────────────────────────────

async def _fetch_from_newsapi(
    topic: str,
    difficulty: DifficultyLevel,
    max_results: int,
    language: ArticleLanguage = ArticleLanguage.EN,
) -> List[dict]:
    """
    Query NewsAPI.org ``/v2/everything`` and return a list of raw article dicts:
      [{"title": ..., "source": ..., "url": ..., "body": ...}, ...]

    ALWAYS fetches English articles regardless of the *language* parameter.
    When *language* is ``he``, the caller is responsible for sending the body
    through the LLM article-translator.

    Uses ``description`` + ``content`` fields to build the translatable body.
    Raises ``httpx.HTTPStatusError`` on non-2xx responses so the caller
    can surface an appropriate error.
    """
    fallback = _FALLBACK_ARTICLES.get("en", _FALLBACK_ARTICLES_EN)

    api_key = settings.NEWS_API_KEY
    if not api_key:
        logger.warning("NEWS_API_KEY not set – returning fallback articles")
        return fallback[:max_results]

    config = _DIFFICULTY_CONFIG.get(difficulty, _DIFFICULTY_CONFIG[DifficultyLevel.MEDIUM])

    # Always fetch English articles — Hebrew sources return garbage content.
    params: dict = {
        "q": topic.strip(),
        "language": "en",
        "sortBy": config["sortBy"],
        "pageSize": max_results,
        "apiKey": api_key,
    }

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT, verify=False) as client:
        resp = await client.get(_NEWSAPI_EVERYTHING_URL, params=params)
        resp.raise_for_status()

    data = resp.json()

    if data.get("status") != "ok":
        logger.error("NewsAPI returned status=%s: %s", data.get("status"), data.get("message"))
        return fallback[:max_results]

    raw_articles = data.get("articles", [])

    articles: list[dict] = []
    for item in raw_articles:
        # Combine description + content for a richer body.
        # NewsAPI often duplicates the description inside content,
        # so we deduplicate to avoid repeated sentences.
        description = (item.get("description") or "").strip()
        content = (item.get("content") or "").strip()

        # NewsAPI truncates `content` with "… [+NNN chars]" — strip that marker
        content = _strip_truncation_marker(content)

        # NewsAPI provides both `description` (summary) and `content` (body,
        # truncated to ~200 chars).  They often overlap heavily.  Strategy:
        #   • Prefer `content` when available (it's the article body).
        #   • Fall back to `description` only when `content` is missing.
        #   • If `content` does NOT overlap with `description`, concatenate.
        if content and description:
            desc_core = description.rstrip("…\u2026 ").strip()
            # If any substantial part of description appears in content → skip desc
            if len(desc_core) > 20 and desc_core[:40] in content:
                body = content
            elif description in content or content in description:
                body = content if len(content) >= len(description) else description
            else:
                body = f"{description} {content}"
        else:
            body = content or description

        if not body:
            continue

        source_name = (item.get("source") or {}).get("name")

        articles.append({
            "title": item.get("title") or "Untitled",
            "source": source_name,
            "url": item.get("url"),
            "published_at": item.get("publishedAt"),
            "body": body,
        })

    return articles


def _strip_truncation_marker(text: str) -> str:
    """Remove NewsAPI's '… [+1234 chars]' truncation suffix."""
    return re.sub(r"\s*…?\s*\[\+\d+ chars\]\s*$", "", text)


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_news_for_translation(
    topic: str,
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
    max_articles: int = 3,
    language: ArticleLanguage = ArticleLanguage.EN,
) -> NewsResponse:
    """
    End-to-end pipeline:
      1. Fetch raw articles in English (always — even for Hebrew mode).
      2. If language is Hebrew, translate each article body via LLM.
      3. Clean + sentence-split each article.
      4. Return a ``NewsResponse`` ready for the frontend, including the
         full readable article text.

    Raises ``httpx.TimeoutException`` and ``httpx.HTTPStatusError``
    which the router layer converts into user-friendly HTTP errors.
    """
    raw_articles = await _fetch_from_newsapi(topic, difficulty, max_articles, language)

    articles: list[NewsArticleResponse] = []
    total_sentences = 0

    for raw in raw_articles:
        body = raw["body"]
        title = raw["title"]

        # ── Hebrew mode: translate the English article to Hebrew via LLM ──
        if language == ArticleLanguage.HE:
            translated = await translate_article_to_hebrew(title, body)
            if translated:
                body = translated
            else:
                # Translation failed — skip this article rather than
                # showing English text in a Hebrew exercise.
                logger.warning("LLM translation failed for '%s' — skipping", title)
                continue

        # ── Sentence splitting ────────────────────────────────────────────
        sentence_tasks: list[SentenceTask] = text_to_sentence_tasks(body)
        if not sentence_tasks:
            continue  # skip articles that produced no usable sentences

        articles.append(
            NewsArticleResponse(
                title=title,
                source=raw.get("source"),
                url=raw.get("url"),
                published_at=raw.get("published_at"),
                full_article_text=body,
                sentences=sentence_tasks,
            )
        )
        total_sentences += len(sentence_tasks)

    return NewsResponse(
        topic=topic,
        difficulty=difficulty,
        language=language,
        articles=articles,
        total_sentences=total_sentences,
    )

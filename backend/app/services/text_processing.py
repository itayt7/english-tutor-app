"""
Text-processing utilities for the translation-practice pipeline.

Responsibilities:
  • Strip HTML tags, ad markers, and boilerplate from raw article text.
  • Split cleaned text into an ordered list of well-formed sentences,
    respecting abbreviations (e.g. "U.S.A.", "Dr.", "Inc.") so they
    are not treated as sentence boundaries.
  • Optionally truncate articles that exceed a maximum sentence count.
"""

from __future__ import annotations

import html
import re
from typing import List

from app.schemas.news import SentenceTask

# ── Constants ─────────────────────────────────────────────────────────────────

# Maximum number of sentences to keep per article (avoids overwhelming the user)
MAX_SENTENCES_PER_ARTICLE: int = 12

# Minimum meaningful sentence length (characters) – filters out headings / junk
MIN_SENTENCE_LENGTH: int = 15

# Maximum sentence length – anything longer is likely a malformed paragraph
MAX_SENTENCE_LENGTH: int = 500

# ── Common abbreviations that must NOT trigger a sentence split ───────────────
_ABBREVIATIONS: set[str] = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "ave",
    "inc", "ltd", "corp", "co", "vs", "etc", "approx", "dept",
    "est", "govt", "assn", "bros", "gen", "gov", "sgt", "cpl",
    "pvt", "ret", "jan", "feb", "mar", "apr", "jun", "jul",
    "aug", "sep", "oct", "nov", "dec", "mon", "tue", "wed",
    "thu", "fri", "sat", "sun",
}

# Pattern to detect acronyms like "U.S.A." or "U.N."
_ACRONYM_RE = re.compile(r"^(?:[A-Z]\.){2,}$")

# ── HTML / boilerplate stripping ─────────────────────────────────────────────

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_MULTI_SPACE_RE = re.compile(r"[ \t]+")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")

# Common ad / boilerplate markers (case-insensitive substrings)
_BOILERPLATE_MARKERS: list[str] = [
    "subscribe now",
    "sign up for our newsletter",
    "click here",
    "advertisement",
    "read more at",
    "follow us on",
    "download our app",
    "cookie policy",
    "terms of service",
    "all rights reserved",
]


def clean_raw_text(raw: str) -> str:
    """Remove HTML tags, decode entities, and collapse whitespace."""
    # 1. Decode HTML entities (&amp; → &, etc.)
    text = html.unescape(raw)

    # 2. Remove HTML tags
    text = _HTML_TAG_RE.sub(" ", text)

    # 3. Collapse whitespace
    text = _MULTI_SPACE_RE.sub(" ", text)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)

    return text.strip()


# ── Sentence splitting ───────────────────────────────────────────────────────

# Regex: split on `.` `!` `?` followed by whitespace and either:
#   • an uppercase Latin letter (English)
#   • a Hebrew character (\u0590-\u05FF)
#   • an opening quote
_NAIVE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+(?=[A-Z\u0590-\u05FF"\u201C\u05F4])')


def _is_abbreviation(token: str) -> bool:
    """Return True if *token* is a known abbreviation or acronym."""
    # "U.S.A." → True
    stripped = token.rstrip(".")
    if _ACRONYM_RE.match(token):
        return True
    # "Dr." → True
    return stripped.lower() in _ABBREVIATIONS


def split_into_sentences(text: str) -> List[str]:
    """
    Split *text* into sentences with abbreviation-awareness.

    Strategy:
      1. Naive regex split on sentence-ending punctuation.
      2. Re-join fragments that were incorrectly split on abbreviations.
    """
    raw_parts = _NAIVE_SPLIT_RE.split(text)

    merged: list[str] = []
    buffer = ""

    for part in raw_parts:
        candidate = (buffer + " " + part).strip() if buffer else part.strip()

        # Check if the candidate ends with an abbreviation followed by a period
        # e.g. "reported by Dr." should NOT be a complete sentence yet.
        last_word = candidate.rsplit(None, 1)[-1] if candidate else ""
        if _is_abbreviation(last_word):
            buffer = candidate
            continue

        buffer = ""
        if candidate:
            merged.append(candidate)

    # Flush remaining buffer
    if buffer:
        merged.append(buffer)

    return merged


def _is_complete_sentence(sentence: str) -> bool:
    """Return True if the sentence ends with proper punctuation (not truncated)."""
    stripped = sentence.rstrip()
    if not stripped:
        return False
    # Accept sentences ending with . ! ? ) " ' »
    return stripped[-1] in '.!?)\u201D\u2019\u00BB"\''


def _is_boilerplate(sentence: str) -> bool:
    """Return True if the sentence is likely ad / boilerplate text."""
    lower = sentence.lower()
    return any(marker in lower for marker in _BOILERPLATE_MARKERS)


# ── Public API ────────────────────────────────────────────────────────────────

def text_to_sentence_tasks(
    raw_text: str,
    max_sentences: int = MAX_SENTENCES_PER_ARTICLE,
) -> List[SentenceTask]:
    """
    Full pipeline: clean → split → filter → truncate → wrap as SentenceTask.

    Returns an ordered list of ``SentenceTask`` objects ready for the frontend.
    """
    cleaned = clean_raw_text(raw_text)
    sentences = split_into_sentences(cleaned)

    # Filter out too-short, too-long, boilerplate, or truncated sentences
    good: list[str] = [
        s for s in sentences
        if MIN_SENTENCE_LENGTH <= len(s) <= MAX_SENTENCE_LENGTH
        and not _is_boilerplate(s)
        and _is_complete_sentence(s)
    ]

    # Deduplicate: remove sentences whose text already appeared
    # (NewsAPI sometimes causes description/content overlap)
    seen: set[str] = set()
    unique: list[str] = []
    for s in good:
        # Normalize for comparison — strip unicode cruft, collapse whitespace
        key = " ".join(s.split()).lower()
        if key not in seen:
            seen.add(key)
            unique.append(s)
    good = unique

    # Truncate to keep the article manageable
    good = good[:max_sentences]

    return [
        SentenceTask(id=idx + 1, original_text=sent)
        for idx, sent in enumerate(good)
    ]

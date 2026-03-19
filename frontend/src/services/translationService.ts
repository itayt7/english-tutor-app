import type {
  NewsResponse,
  DifficultyLevel,
  TranslationEvaluation,
} from "../types/translation";

const API_BASE = "/api/v1";

/* ── Fetch news articles for translation practice ─────────────────────────── */

export async function fetchNewsArticles(
  topic: string,
  difficulty: DifficultyLevel = "medium",
  maxArticles: number = 3,
): Promise<NewsResponse> {
  const params = new URLSearchParams({
    topic,
    difficulty,
    max_articles: String(maxArticles),
  });

  const res = await fetch(`${API_BASE}/news?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Failed to fetch news (HTTP ${res.status})`);
  }

  return res.json();
}

/* ── Submit a translation for AI evaluation ───────────────────────────────── */

export async function evaluateTranslation(
  sourceSentence: string,
  userTranslation: string,
): Promise<TranslationEvaluation> {
  const res = await fetch(`${API_BASE}/translation/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_sentence: sourceSentence,
      user_translation: userTranslation,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Evaluation failed (HTTP ${res.status})`);
  }

  return res.json();
}

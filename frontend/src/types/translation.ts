/* ── News / Article types (mirrors backend schemas/news.py) ─────────────── */

export type DifficultyLevel = "easy" | "medium" | "hard";
export type ArticleLanguage = "en" | "he";

export interface SentenceTask {
  id: number;
  original_text: string;
}

export interface NewsArticle {
  title: string;
  source: string | null;
  url: string | null;
  published_at: string | null;
  full_article_text: string | null;
  sentences: SentenceTask[];
}

export interface NewsResponse {
  topic: string;
  difficulty: DifficultyLevel;
  language: ArticleLanguage;
  articles: NewsArticle[];
  total_sentences: number;
}

/* ── Translation evaluation types (mirrors backend schemas/translation.py) ─ */

export interface TranslationEvaluation {
  score: number;
  is_passing: boolean;
  corrected_text: string;
  grammar_issues: string[];
  hebrew_speaker_tip: string;
}

/* ── Local UI state for completed sentences ────────────────────────────────── */

export interface CompletedSentence {
  sentenceId: number;
  original_text: string;
  user_translation: string;
  evaluation: TranslationEvaluation;
}

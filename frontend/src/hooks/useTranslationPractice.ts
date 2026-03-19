import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  NewsArticle,
  SentenceTask,
  DifficultyLevel,
  CompletedSentence,
  TranslationEvaluation,
} from "../types/translation";
import {
  fetchNewsArticles,
  evaluateTranslation,
} from "../services/translationService";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Public return type
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface UseTranslationPracticeReturn {
  /* ── Topic / search ─────────────────────────────────────────────────── */
  topic: string;
  setTopic: (value: string) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (value: DifficultyLevel) => void;

  /* ── Loading / errors ───────────────────────────────────────────────── */
  isFetchingNews: boolean;
  isEvaluating: boolean;
  fetchError: string | null;
  evaluationError: string | null;
  /** Call to dismiss the evaluation error toast */
  clearEvaluationError: () => void;

  /* ── Article & sentence data ────────────────────────────────────────── */
  article: NewsArticle | null;
  sentences: SentenceTask[];
  currentSentenceIndex: number;
  activeSentence: SentenceTask | null;
  completedSentences: CompletedSentence[];
  completedIds: Set<number>;

  /* ── Derived state ──────────────────────────────────────────────────── */
  isFinished: boolean;
  averageScore: number;
  totalSentences: number;
  progress: number; // 0-100

  /* ── Actions ────────────────────────────────────────────────────────── */
  /** Fetch news articles for the current topic + difficulty */
  startPractice: () => Promise<void>;
  /** Submit a translation for the active sentence */
  submitTranslation: (userTranslation: string) => Promise<void>;
  /** Reset all state to start fresh */
  reset: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Hook implementation
 * ═══════════════════════════════════════════════════════════════════════════ */

export function useTranslationPractice(): UseTranslationPracticeReturn {
  /* ── Topic / search state ───────────────────────────────────────────── */
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");

  /* ── Loading / error state ──────────────────────────────────────────── */
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  /* ── Article & sentence state ───────────────────────────────────────── */
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [completedSentences, setCompletedSentences] = useState<CompletedSentence[]>([]);

  /* ── Abort controller for in-flight requests ────────────────────────── */
  const abortRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /* ── Derived values ─────────────────────────────────────────────────── */
  const sentences = article?.sentences ?? [];
  const activeSentence = sentences[currentSentenceIndex] ?? null;
  const isFinished = article !== null && currentSentenceIndex >= sentences.length;
  const totalSentences = sentences.length;

  const completedIds = useMemo(
    () => new Set(completedSentences.map((c) => c.sentenceId)),
    [completedSentences],
  );

  const averageScore = useMemo(() => {
    if (completedSentences.length === 0) return 0;
    const sum = completedSentences.reduce((acc, c) => acc + c.evaluation.score, 0);
    return Math.round(sum / completedSentences.length);
  }, [completedSentences]);

  const progress = totalSentences > 0
    ? Math.round((completedSentences.length / totalSentences) * 100)
    : 0;

  /* ── Auto-dismiss evaluation error after 5 seconds ──────────────────── */
  useEffect(() => {
    if (!evaluationError) return;
    const timer = setTimeout(() => setEvaluationError(null), 5000);
    return () => clearTimeout(timer);
  }, [evaluationError]);

  const clearEvaluationError = useCallback(() => {
    setEvaluationError(null);
  }, []);

  /* ── startPractice: fetch news articles ─────────────────────────────── */
  const startPractice = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed || isFetchingNews) return;

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetchingNews(true);
    setFetchError(null);
    setArticle(null);
    setCurrentSentenceIndex(0);
    setCompletedSentences([]);
    setEvaluationError(null);

    try {
      const data = await fetchNewsArticles(trimmed, difficulty, 1);

      // Bail if this request was superseded
      if (controller.signal.aborted) return;

      if (data.articles.length === 0 || data.articles[0].sentences.length === 0) {
        setFetchError(
          "No translatable sentences found for this topic. Try a different one!",
        );
        return;
      }

      setArticle(data.articles[0]);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch articles.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsFetchingNews(false);
      }
    }
  }, [topic, difficulty, isFetchingNews]);

  /* ── submitTranslation: evaluate user input ─────────────────────────── */
  const submitTranslation = useCallback(
    async (userTranslation: string) => {
      if (!activeSentence || isEvaluating) return;

      setIsEvaluating(true);
      setEvaluationError(null);

      try {
        const evaluation: TranslationEvaluation = await evaluateTranslation(
          activeSentence.original_text,
          userTranslation,
        );

        const completed: CompletedSentence = {
          sentenceId: activeSentence.id,
          original_text: activeSentence.original_text,
          user_translation: userTranslation,
          evaluation,
        };

        setCompletedSentences((prev) => [...prev, completed]);
        setCurrentSentenceIndex((prev) => prev + 1);
      } catch (err: unknown) {
        console.error("Translation evaluation error:", err);
        setEvaluationError(
          err instanceof Error
            ? err.message
            : "Evaluation failed. Please check your connection and try again.",
        );
      } finally {
        setIsEvaluating(false);
      }
    },
    [activeSentence, isEvaluating],
  );

  /* ── reset: start over ──────────────────────────────────────────────── */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setArticle(null);
    setCurrentSentenceIndex(0);
    setCompletedSentences([]);
    setFetchError(null);
    setEvaluationError(null);
  }, []);

  /* ── Return ─────────────────────────────────────────────────────────── */
  return {
    // Topic / search
    topic,
    setTopic,
    difficulty,
    setDifficulty,

    // Loading / errors
    isFetchingNews,
    isEvaluating,
    fetchError,
    evaluationError,
    clearEvaluationError,

    // Article & sentence data
    article,
    sentences,
    currentSentenceIndex,
    activeSentence,
    completedSentences,
    completedIds,

    // Derived
    isFinished,
    averageScore,
    totalSentences,
    progress,

    // Actions
    startPractice,
    submitTranslation,
    reset,
  };
}

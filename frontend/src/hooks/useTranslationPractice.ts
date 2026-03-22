import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  NewsArticle,
  SentenceTask,
  DifficultyLevel,
  ArticleLanguage,
  CompletedSentence,
  TranslationEvaluation,
} from "../types/translation";
import {
  fetchNewsArticles,
  evaluateTranslation,
} from "../services/translationService";

/* ═══════════════════════════════════════════════════════════════════════════
 *  localStorage persistence helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "translation-practice-progress";

interface SavedProgress {
  article: NewsArticle;
  completedSentences: CompletedSentence[];
  currentSentenceIndex: number;
  language: ArticleLanguage;
  difficulty: DifficultyLevel;
  topic: string;
  savedAt: number; // epoch ms
}

function saveProgress(data: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedProgress = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearSavedProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Public return type
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface UseTranslationPracticeReturn {
  /* ── Topic / search ─────────────────────────────────────────────────── */
  topic: string;
  setTopic: (value: string) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (value: DifficultyLevel) => void;
  language: ArticleLanguage;
  toggleLanguage: () => void;

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

  /* ── Pause / resume ─────────────────────────────────────────────────── */
  hasSavedProgress: boolean;
  /** Pause the session and persist progress to localStorage */
  pauseAndSave: () => void;
  /** Resume a previously saved session from localStorage */
  resumeProgress: () => void;
  /** Discard the saved session without resuming */
  discardSavedProgress: () => void;

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
  const [language, setLanguage] = useState<ArticleLanguage>("he");

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

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "he" ? "en" : "he"));
  }, []);

  /* ── Saved-progress detection ───────────────────────────────────────── */
  const [hasSavedProgress, setHasSavedProgress] = useState(
    () => loadProgress() !== null,
  );

  const pauseAndSave = useCallback(() => {
    if (!article) return;
    saveProgress({
      article,
      completedSentences,
      currentSentenceIndex,
      language,
      difficulty,
      topic,
      savedAt: Date.now(),
    });
    // Reset UI to search screen
    setArticle(null);
    setCurrentSentenceIndex(0);
    setCompletedSentences([]);
    setFetchError(null);
    setEvaluationError(null);
    setHasSavedProgress(true);
  }, [article, completedSentences, currentSentenceIndex, language, difficulty, topic]);

  const resumeProgress = useCallback(() => {
    const saved = loadProgress();
    if (!saved) return;
    setArticle(saved.article);
    setCompletedSentences(saved.completedSentences);
    setCurrentSentenceIndex(saved.currentSentenceIndex);
    setLanguage(saved.language);
    setDifficulty(saved.difficulty);
    setTopic(saved.topic);
    clearSavedProgress();
    setHasSavedProgress(false);
  }, []);

  const discardSavedProgress = useCallback(() => {
    clearSavedProgress();
    setHasSavedProgress(false);
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
      const data = await fetchNewsArticles(trimmed, difficulty, 1, language);

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
  }, [topic, difficulty, language, isFetchingNews]);

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
    clearSavedProgress();
    setHasSavedProgress(false);
  }, []);

  /* ── Return ─────────────────────────────────────────────────────────── */
  return {
    // Topic / search
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    language,
    toggleLanguage,

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

    // Pause / resume
    hasSavedProgress,
    pauseAndSave,
    resumeProgress,
    discardSavedProgress,

    // Actions
    startPractice,
    submitTranslation,
    reset,
  };
}

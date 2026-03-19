import React from "react";
import {
  Search,
  Loader2,
  Languages,
  Trophy,
  RotateCcw,
  X,
} from "lucide-react";
import type { DifficultyLevel } from "../../types/translation";
import { useTranslationPractice } from "../../hooks/useTranslationPractice";
import ArticlePane from "./ArticlePane";
import ActiveTranslationInput from "./ActiveTranslationInput";
import FeedbackAccordion from "./FeedbackAccordion";

/* ── Difficulty selector ──────────────────────────────────────────────────── */

const DIFFICULTIES: { value: DifficultyLevel; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "A2–B1" },
  { value: "medium", label: "Medium", desc: "B1–B2" },
  { value: "hard", label: "Hard", desc: "C1–C2" },
];

/* ── Error toast ──────────────────────────────────────────────────────────── */

const ErrorToast: React.FC<{ message: string; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div
    className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border border-red-200
               bg-red-50 px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4 duration-300"
    role="alert"
  >
    <p className="text-sm text-red-700 max-w-xs">{message}</p>
    <button
      type="button"
      onClick={onDismiss}
      className="shrink-0 rounded-full p-0.5 text-red-400 hover:text-red-600 transition-colors"
      aria-label="Dismiss error"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

/* ── Main component ──────────────────────────────────────────────────────── */

const TranslationView: React.FC = () => {
  const {
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    isFetchingNews,
    isEvaluating,
    fetchError,
    evaluationError,
    clearEvaluationError,
    article,
    sentences,
    currentSentenceIndex,
    activeSentence,
    completedSentences,
    completedIds,
    isFinished,
    averageScore,
    progress,
    startPractice,
    submitTranslation,
    reset,
  } = useTranslationPractice();

  /* ════════════════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════════════════ */

  // ── No article selected yet → topic search form ────────────────────────
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <Languages className="h-8 w-8 text-emerald-500" />
        </span>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Translation Practice
          </h1>
          <p className="text-sm text-gray-500 max-w-md">
            Choose a topic and difficulty. We'll fetch a real news article and you'll
            translate it sentence by sentence with AI feedback.
          </p>
        </div>

        {/* Search form */}
        <div className="w-full max-w-md space-y-3">
          {/* Topic input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
                         focus:border-indigo-400 transition-colors"
              placeholder="Enter a topic (e.g. technology, sports, climate)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startPractice()}
              disabled={isFetchingNews}
              aria-label="Search topic"
            />
          </div>

          {/* Difficulty pills */}
          <div className="flex gap-2 justify-center">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                disabled={isFetchingNews}
                className={[
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  difficulty === d.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                ].join(" ")}
                aria-pressed={difficulty === d.value}
              >
                {d.label}{" "}
                <span className="opacity-60">({d.desc})</span>
              </button>
            ))}
          </div>

          {/* Fetch button */}
          <button
            type="button"
            onClick={startPractice}
            disabled={!topic.trim() || isFetchingNews}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600
                       px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Fetch articles"
          >
            {isFetchingNews ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching articles…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Start Translating
              </>
            )}
          </button>

          {/* Error */}
          {fetchError && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {fetchError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── All sentences completed → summary screen ──────────────────────────
  if (isFinished) {
    return (
      <div className="space-y-6">
        {/* Summary header */}
        <div className="flex flex-col items-center gap-4 text-center py-8">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Trophy className="h-8 w-8 text-emerald-500" />
          </span>
          <h2 className="text-2xl font-bold text-gray-900">Great job!</h2>
          <p className="text-sm text-gray-500">
            You've completed all {sentences.length} sentences.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">
              {averageScore}
            </span>
            <span className="text-sm text-gray-400">avg score</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm
                       font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try another topic
          </button>
        </div>

        {/* Feedback history */}
        <FeedbackAccordion completedSentences={completedSentences} />
      </div>
    );
  }

  // ── Active translation session: split-screen layout ────────────────────
  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Translation Practice</h1>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {currentSentenceIndex + 1} / {sentences.length}
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            aria-label="Start over with a new topic"
          >
            Change topic
          </button>
        </div>
      </div>

      {/* Split pane (stacks vertically on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left pane: article context */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:max-h-[70vh] lg:overflow-y-auto">
          <ArticlePane
            title={article.title}
            source={article.source}
            url={article.url}
            sentences={sentences}
            activeSentenceId={activeSentence?.id ?? 1}
            completedIds={completedIds}
          />
        </div>

        {/* Right pane: translation input + history */}
        <div className="space-y-4">
          {activeSentence && (
            <ActiveTranslationInput
              sourceSentence={activeSentence.original_text}
              isLoading={isEvaluating}
              onSubmit={submitTranslation}
            />
          )}

          {/* Feedback accordion */}
          <FeedbackAccordion completedSentences={completedSentences} />
        </div>
      </div>

      {/* Evaluation error toast */}
      {evaluationError && (
        <ErrorToast message={evaluationError} onDismiss={clearEvaluationError} />
      )}
    </div>
  );
};

export default TranslationView;

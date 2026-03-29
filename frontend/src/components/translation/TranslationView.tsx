import React from "react";
import {
  Search,
  Loader2,
  Languages,
  Trophy,
  RotateCcw,
  X,
  ArrowLeftRight,
  ArrowLeft,
  Pause,
  Play,
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
    className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
    style={{
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'rgba(254,242,242,0.9)',
      border: '1px solid rgba(239,68,68,0.2)',
      boxShadow: '0 8px 24px rgba(239,68,68,0.12)',
    }}
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
    language,
    toggleLanguage,
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
    hasSavedProgress,
    pauseAndSave,
    resumeProgress,
    discardSavedProgress,
    startPractice,
    submitTranslation,
    reset,
  } = useTranslationPractice();

  const isHebrew = language === "he";

  /* ════════════════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════════════════ */

  // ── No article selected yet → topic search form ────────────────────────
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.12))',
            boxShadow: '0 4px 16px rgba(16,185,129,0.15)',
          }}
        >
          <Languages className="h-8 w-8 text-emerald-500" />
        </span>
        <div className="text-center">
          <h1
            className="text-2xl font-extrabold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Translation Practice
          </h1>
          <p className="text-sm max-w-md" style={{ color: 'var(--color-muted)' }}>
            Choose a topic and difficulty. We'll fetch a real news article and you'll
            translate it sentence by sentence with AI feedback.
          </p>
        </div>

        {/* Search form */}
        <div
          className="glass w-full max-w-md rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.8)' }}
        >
          {/* Topic input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
            <input
              type="text"
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all"
              style={{
                border: '1px solid var(--color-border-strong)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
              placeholder="Enter a topic (e.g. technology, sports, climate)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startPractice()}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              disabled={isFetchingNews}
              aria-label="Search topic"
            />
          </div>

          {/* Difficulty segmented control */}
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            role="group"
            aria-label="Select difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                disabled={isFetchingNews}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
                style={
                  difficulty === d.value
                    ? {
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                      }
                    : { color: 'var(--color-muted)' }
                }
                aria-pressed={difficulty === d.value}
              >
                {d.label}{" "}
                <span style={{ opacity: 0.6 }}>({d.desc})</span>
              </button>
            ))}
          </div>

          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            disabled={isFetchingNews}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              border: '1px solid var(--color-border-strong)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
            aria-label="Switch source language"
          >
            <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            {isHebrew ? "Hebrew → English" : "English → Hebrew"}
          </button>

          {/* Fetch button */}
          <button
            type="button"
            onClick={startPractice}
            disabled={!topic.trim() || isFetchingNews}
            className="w-full gradient-primary inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-display)' }}
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

          {/* Resume saved progress */}
          {hasSavedProgress && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                background: 'rgba(254,243,199,0.8)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                You have an unfinished session. Pick up where you left off?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resumeProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={discardSavedProgress}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors hover:bg-amber-100"
                  style={{ color: '#92400e' }}
                >
                  Discard
                </button>
              </div>
            </div>
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
        <div className="glass flex flex-col items-center gap-4 text-center rounded-2xl py-10 px-8">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
              boxShadow: '0 4px 16px rgba(16,185,129,0.15)',
            }}
          >
            <Trophy className="h-8 w-8 text-emerald-500" />
          </span>
          <h2
            className="text-2xl font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Great job!
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            You've completed all {sentences.length} sentences.
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-4xl font-extrabold gradient-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {averageScore}
            </span>
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              avg score
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="gradient-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: 'var(--font-display)' }}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl p-2 transition-all hover:opacity-80"
            style={{
              color: 'var(--color-muted)',
              background: 'var(--color-surface-glass)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Back to topic selection"
            title="Back to topic selection"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1
            className="text-xl font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Translation Practice
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-28 h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
              {currentSentenceIndex + 1} / {sentences.length}
            </span>
          </div>
          <button
            type="button"
            onClick={pauseAndSave}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
            style={{
              color: '#b45309',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
            aria-label="Pause and save progress"
          >
            <Pause className="h-3 w-3" />
            Pause &amp; Save
          </button>
        </div>
      </div>

      {/* Split pane (stacks vertically on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left pane: article context */}
        <div
          className="glass rounded-2xl p-4 lg:max-h-[70vh] lg:overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.75)' }}
        >
          <ArticlePane
            title={article.title}
            source={article.source}
            url={article.url}
            publishedAt={article.published_at}
            fullArticleText={article.full_article_text}
            sentences={sentences}
            activeSentenceId={activeSentence?.id ?? 1}
            completedIds={completedIds}
            isRtl={isHebrew}
          />
        </div>

        {/* Right pane: translation input + history */}
        <div className="space-y-4">
          {activeSentence && (
            <ActiveTranslationInput
              sourceSentence={activeSentence.original_text}
              isLoading={isEvaluating}
              onSubmit={submitTranslation}
              isSourceRtl={isHebrew}
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

import React from "react";
import {
  Target,
  AlertTriangle,
  MessageSquareText,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import type { PitchEvaluation } from "../../types/presentation";

/* ── Score color helpers ──────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 9) return "text-emerald-600";
  if (score >= 7) return "text-sky-600";
  if (score >= 4) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 9) return "bg-emerald-100";
  if (score >= 7) return "bg-sky-100";
  if (score >= 4) return "bg-amber-100";
  return "bg-red-100";
}

function scoreLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 4) return "Needs work";
  return "Off-topic";
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface Props {
  evaluation: PitchEvaluation | null;
  transcript: string | null;
  isEvaluating: boolean;
  error: string | null;
  onDismissError: () => void;
}

/* ── Component ────────────────────────────────────────────────────────────── */

const FeedbackPanel: React.FC<Props> = ({
  evaluation,
  transcript,
  isEvaluating,
  error,
  onDismissError,
}) => {
  /* ── Loading state ──────────────────────────────────────────────────── */
  if (isEvaluating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-gray-500">Analyzing your pitch…</p>
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────────────────── */
  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <MessageSquareText className="h-7 w-7 text-gray-400" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-600">
            Your feedback will appear here
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Upload a deck, then click "Start Pitching" to begin
          </p>
        </div>
      </div>
    );
  }

  /* ── Feedback cards ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Error toast ──────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={onDismissError}
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="px-5 py-5 space-y-4">
        {/* ── Accuracy Score ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Accuracy Score
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-bold ${scoreColor(evaluation.accuracy_score)}`}
            >
              {evaluation.accuracy_score}
            </span>
            <span className="text-lg text-gray-400">/10</span>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${scoreBg(evaluation.accuracy_score)} ${scoreColor(evaluation.accuracy_score)}`}
            >
              {scoreLabel(evaluation.accuracy_score)}
            </span>
          </div>
        </div>

        {/* ── Your Transcript ──────────────────────────────────────────── */}
        {transcript && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              What you said
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              "{transcript}"
            </p>
          </div>
        )}

        {/* ── Grammar Corrections ──────────────────────────────────────── */}
        {evaluation.grammar_corrections.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-800">
                Grammar Corrections
              </h3>
              <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
                {evaluation.grammar_corrections.length}
              </span>
            </div>
            <ul className="space-y-2">
              {evaluation.grammar_corrections.map((correction, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-amber-900"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{correction}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Coach Feedback ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquareText className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-indigo-800">
              Coach Feedback
            </h3>
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed">
            {evaluation.coach_feedback}
          </p>
        </div>

        {/* ── Suggested Phrasing ───────────────────────────────────────── */}
        {evaluation.suggested_phrasing && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-emerald-800">
                Suggested Phrasing
              </h3>
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed italic">
              "{evaluation.suggested_phrasing}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPanel;

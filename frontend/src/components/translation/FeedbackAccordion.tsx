import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import type { CompletedSentence } from "../../types/translation";

interface Props {
  completedSentences: CompletedSentence[];
}

/* ── Score color helper ─────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-sky-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-100";
  if (score >= 70) return "bg-sky-100";
  if (score >= 50) return "bg-amber-100";
  return "bg-red-100";
}

/* ── Single accordion item ──────────────────────────────────────────────────── */

const AccordionItem: React.FC<{
  item: CompletedSentence;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ item, isOpen, onToggle }) => {
  const { evaluation } = item;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      {/* Header / trigger */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-inset"
        aria-expanded={isOpen}
        aria-controls={`feedback-panel-${item.sentenceId}`}
      >
        {/* Pass / fail icon */}
        {evaluation.is_passing ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
        )}

        {/* Sentence preview */}
        <span className="flex-1 text-sm text-gray-700 truncate">
          <span className="font-medium text-gray-500 mr-1">#{item.sentenceId}</span>
          {item.original_text}
        </span>

        {/* Score badge */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreBg(evaluation.score)} ${scoreColor(evaluation.score)}`}
        >
          {evaluation.score}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div
          id={`feedback-panel-${item.sentenceId}`}
          className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50 text-sm animate-in fade-in duration-200"
          role="region"
          aria-label={`Feedback for sentence ${item.sentenceId}`}
        >
          {/* User's translation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              Your translation
            </p>
            <p className="text-gray-700">{item.user_translation}</p>
          </div>

          {/* Corrected translation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              Ideal translation
            </p>
            <p className="text-gray-800 font-medium">{evaluation.corrected_text}</p>
          </div>

          {/* Grammar issues */}
          {evaluation.grammar_issues.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Issues found
                </p>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-sm">
                {evaluation.grammar_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hebrew speaker tip */}
          {evaluation.hebrew_speaker_tip && (
            <div className="flex gap-2 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <Lightbulb className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-800">{evaluation.hebrew_speaker_tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main accordion list ──────────────────────────────────────────────────── */

const FeedbackAccordion: React.FC<Props> = ({ completedSentences }) => {
  const [openId, setOpenId] = useState<number | null>(null);

  if (completedSentences.length === 0) return null;

  return (
    <div className="space-y-2" role="list" aria-label="Translation feedback history">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        Completed sentences ({completedSentences.length})
      </h3>
      {completedSentences.map((item) => (
        <AccordionItem
          key={item.sentenceId}
          item={item}
          isOpen={openId === item.sentenceId}
          onToggle={() =>
            setOpenId((prev) => (prev === item.sentenceId ? null : item.sentenceId))
          }
        />
      ))}
    </div>
  );
};

export default FeedbackAccordion;

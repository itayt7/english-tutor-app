import React from "react";
import type { SentenceTask } from "../../types/translation";
import { BookOpen, ExternalLink, Calendar } from "lucide-react";

interface Props {
  title: string;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  /** Full readable article body text (cleaned/translated) */
  fullArticleText: string | null;
  sentences: SentenceTask[];
  /** 1-based id of the sentence currently being translated */
  activeSentenceId: number;
  /** Set of sentence ids the user has already completed */
  completedIds: Set<number>;
  /** Whether the article text is in a RTL language (Hebrew) */
  isRtl?: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const ArticlePane: React.FC<Props> = ({
  title,
  source,
  url,
  publishedAt,
  fullArticleText,
  sentences,
  activeSentenceId,
  completedIds,
  isRtl = false,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Article header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
          <h2 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          {source && <span>{source}</span>}
          {publishedAt && (
            <>
              {source && <span>·</span>}
              <span className="inline-flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {formatDate(publishedAt)}
              </span>
            </>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-600 transition-colors"
              aria-label="Open original article"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Original</span>
            </a>
          )}
        </div>
      </div>

      {/* Full article text block */}
      {fullArticleText && (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm
                     leading-relaxed text-gray-700 select-text whitespace-pre-line"
        >
          {fullArticleText}
        </div>
      )}

      {/* Sentence list (translation tasks) */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Sentences to translate
        </p>
        {sentences.map((s) => {
          const isActive = s.id === activeSentenceId;
          const isDone = completedIds.has(s.id);

          return (
            <p
              key={s.id}
              dir={isRtl ? "rtl" : "ltr"}
              className={[
                "rounded-lg px-3 py-2 text-sm leading-relaxed transition-all duration-200 select-text",
                isActive
                  ? "bg-indigo-50 border border-indigo-300 text-indigo-900 font-medium shadow-sm"
                  : isDone
                    ? "bg-emerald-50 text-gray-500 border border-emerald-200"
                    : "text-gray-400 border border-transparent",
              ].join(" ")}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0
                             bg-gray-200 text-gray-500
                             data-[active=true]:bg-indigo-500 data-[active=true]:text-white
                             data-[done=true]:bg-emerald-500 data-[done=true]:text-white"
                data-active={isActive}
                data-done={isDone}
              >
                {isDone ? "✓" : s.id}
              </span>
              {s.original_text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default ArticlePane;

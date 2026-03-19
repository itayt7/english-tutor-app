import React from "react";
import type { SentenceTask } from "../../types/translation";
import { BookOpen, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  source: string | null;
  url: string | null;
  sentences: SentenceTask[];
  /** 1-based id of the sentence currently being translated */
  activeSentenceId: number;
  /** Set of sentence ids the user has already completed */
  completedIds: Set<number>;
}

const ArticlePane: React.FC<Props> = ({
  title,
  source,
  url,
  sentences,
  activeSentenceId,
  completedIds,
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
        {(source || url) && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {source && <span>{source}</span>}
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
        )}
      </div>

      {/* Sentence list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {sentences.map((s) => {
          const isActive = s.id === activeSentenceId;
          const isDone = completedIds.has(s.id);

          return (
            <p
              key={s.id}
              className={[
                "rounded-lg px-3 py-2 text-sm leading-relaxed transition-all duration-200",
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

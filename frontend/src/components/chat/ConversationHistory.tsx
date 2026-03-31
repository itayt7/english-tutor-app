import React, { useEffect, useState } from "react";
import { MessageSquare, Plus, Clock } from "lucide-react";
import type { ChatSessionSummary } from "../../types/chat";
import { getChatSessions } from "../../services/chatService";

interface Props {
  activeSessionId: number | null;
  onSelectSession: (sessionId: number) => void;
  onNewConversation: () => void;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const ConversationHistory: React.FC<Props> = ({
  activeSessionId,
  onSelectSession,
  onNewConversation,
}) => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [activeSessionId]); // re-fetch when session changes so new ones appear

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-md)",
        height: "600px",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          History
        </span>
        <button
          onClick={onNewConversation}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          aria-label="Start new conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl p-3"
                style={{ background: "var(--color-bg)", height: 56 }}
              />
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2 text-center px-4"
            style={{ color: "var(--color-muted)" }}
          >
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-xs">No conversations yet. Start one!</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <ul className="p-2 space-y-1">
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.12))"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(79,70,229,0.25)"
                        : "1px solid transparent",
                    }}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <p
                      className="text-xs font-medium truncate"
                      style={{
                        color: isActive ? "var(--color-primary)" : "var(--color-text)",
                      }}
                    >
                      {s.topic}
                    </p>
                    <div
                      className="flex items-center gap-1.5 mt-0.5"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{formatRelativeDate(s.created_at)}</span>
                      <span className="text-xs">·</span>
                      <span className="text-xs">{s.message_count} msgs</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

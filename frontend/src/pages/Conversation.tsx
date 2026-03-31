import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatInterface } from '../components/chat/ChatInterface';
import { ConversationHistory } from '../components/chat/ConversationHistory';

const Conversation: React.FC = () => {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  // historyKey forces ConversationHistory to re-fetch after a new session is created
  const [historyKey, setHistoryKey] = useState(0);

  const handleNewConversation = () => {
    setActiveSessionId(null);
  };

  const handleSessionCreated = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setHistoryKey((k) => k + 1);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
          }}
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1
            className="text-2xl font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Conversation Mode
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Practice speaking and writing naturally with your AI tutor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        {/* History sidebar */}
        <ConversationHistory
          key={historyKey}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewConversation={handleNewConversation}
        />

        {/* Chat panel */}
        <ChatInterface
          key={activeSessionId ?? "new"}
          initialSessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  );
};

export default Conversation;

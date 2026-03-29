import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatInterface } from '../components/chat/ChatInterface';

const Conversation: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
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

      <ChatInterface />
    </div>
  );
};

export default Conversation;

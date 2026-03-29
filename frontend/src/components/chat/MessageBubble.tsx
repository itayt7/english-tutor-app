import React from 'react';
import type { UIMessage } from '../../types/chat';

interface Props {
  message: UIMessage;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col w-full mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Main Chat Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }
            : {
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                background: 'var(--color-surface-glass)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-glass)',
                color: 'var(--color-text)',
              }
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
      </div>

      {/* Shadow Evaluator Corrections (Only for User Messages) */}
      {isUser && message.evaluation?.has_errors && (
        <div className="max-w-[75%] mt-2 space-y-2">
          {message.evaluation.corrections.map((correction, idx) => (
            <div
              key={idx}
              className="rounded-r-xl p-3 text-sm"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: 'rgba(254,243,199,0.8)',
                borderLeft: '3px solid #f59e0b',
                boxShadow: '0 2px 8px rgba(245,158,11,0.12)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#b45309' }}
                >
                  {correction.error_type}
                </span>
              </div>
              <p>
                <del className="mr-2 text-red-500">{correction.original_text}</del>
                <span className="font-semibold text-emerald-700">{correction.corrected_text}</span>
              </p>
              <p className="mt-1 text-xs italic" style={{ color: '#78716c' }}>
                {correction.explanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
          isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Shadow Evaluator Corrections (Only for User Messages) */}
      {isUser && message.evaluation?.has_errors && (
        <div className="max-w-[75%] mt-2 space-y-2">
          {message.evaluation.corrections.map((correction, idx) => (
            <div key={idx} className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-md text-sm text-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-orange-700">Correction ({correction.error_type})</span>
              </div>
              <p>
                <del className="text-red-500 mr-2">{correction.original_text}</del>
                <span className="text-green-600 font-medium">{correction.corrected_text}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1 italic">{correction.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

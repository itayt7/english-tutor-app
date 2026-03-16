import React, { useState, useRef, useEffect } from 'react';
import type { UIMessage, ChatMessage } from '../../types/chat';
import { sendMessageToAPI } from '../../services/chatService';
import { MessageBubble } from './MessageBubble';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    // Update UI immediately with the user's message
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Prepare history (strip frontend-only UI fields before sending to API)
      const apiHistory: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await sendMessageToAPI(newUserMsg.content, apiHistory);

      // 1. Update the user's message with the shadow evaluation results
      setMessages((prev) => 
        prev.map(msg => msg.id === newUserMsg.id ? { ...msg, evaluation: response.evaluation } : msg)
      );

      // 2. Add the tutor's reply to the chat
      const tutorMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.tutor_response,
      };
      setMessages((prev) => [...prev, tutorMsg]);

    } catch (error) {
      console.error(error);
      alert("Failed to send message. Please check the backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4">
        <h2 className="text-xl font-bold">Conversation Practice</h2>
        <p className="text-sm text-slate-300">Talk freely. Grammar corrections will appear below your messages.</p>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            Start the conversation by typing a message below!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="text-sm text-gray-500 italic animate-pulse">The tutor is typing...</div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

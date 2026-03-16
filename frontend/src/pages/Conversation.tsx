import React from 'react';
import { ChatInterface } from '../components/chat/ChatInterface';

const Conversation: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Conversation Mode</h1>
      </div>
      
      {/* Render the chat interface */}
      <ChatInterface />
    </div>
  );
};

export default Conversation;

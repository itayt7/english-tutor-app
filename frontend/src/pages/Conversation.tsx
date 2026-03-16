import { MessageSquare } from 'lucide-react';

export default function Conversation() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
        <MessageSquare className="h-8 w-8 text-indigo-500" />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">Conversation</h1>
      <p className="max-w-sm text-sm text-gray-500">
        AI-powered free-form conversation practice. Coming soon.
      </p>
    </div>
  );
}

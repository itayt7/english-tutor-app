import { Presentation } from 'lucide-react';

export default function PresentationPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <Presentation className="h-8 w-8 text-amber-500" />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">Presentation</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Practice and refine your presentation skills with AI feedback. Coming soon.
      </p>
    </div>
  );
}

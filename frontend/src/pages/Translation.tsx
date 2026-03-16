import { Languages } from 'lucide-react';

export default function Translation() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
        <Languages className="h-8 w-8 text-emerald-500" />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">Translation</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Translate and break down sentences with grammar explanations. Coming soon.
      </p>
    </div>
  );
}

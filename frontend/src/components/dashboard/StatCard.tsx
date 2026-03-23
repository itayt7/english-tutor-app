import type { ReactElement } from "react";

interface StatCardProps {
  icon: ReactElement;
  label: string;
  value: string;
  accentColor: string; // Tailwind bg class, e.g. "bg-blue-500"
}

export default function StatCard({ icon, label, value, accentColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentColor} text-white shadow-sm`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="truncate text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

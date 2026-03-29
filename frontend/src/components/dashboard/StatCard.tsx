import type { ReactElement } from "react";

interface StatCardProps {
  icon: ReactElement;
  label: string;
  value: string;
  accentColor: string; // Tailwind bg class, e.g. "bg-blue-500"
}

export default function StatCard({ icon, label, value, accentColor }: StatCardProps) {
  return (
    <div
      className="glass flex items-center gap-4 rounded-2xl p-5 transition-all"
      style={{
        transitionDuration: 'var(--duration-normal)',
        transitionTimingFunction: 'var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentColor} text-white`}
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-muted)' }}
        >
          {label}
        </p>
        <p
          className="truncate text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

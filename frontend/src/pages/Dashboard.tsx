import {
  Activity,
  BookOpen,
  Star,
  CalendarDays,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { useDashboard } from "../hooks/useDashboard";
import StatCard from "../components/dashboard/StatCard";
import MistakeChart from "../components/dashboard/MistakeChart";
import VocabularyTable from "../components/dashboard/VocabularyTable";
import ActionableInsights from "../components/dashboard/ActionableInsights";

// ── Skeleton loader ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass flex items-center gap-4 rounded-2xl p-5"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart + Insights skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass h-80 rounded-2xl" />
        <div className="glass h-80 rounded-2xl" />
      </div>
      {/* Vocabulary skeleton */}
      <div className="glass h-64 rounded-2xl" />
    </div>
  );
}

// ── Error fallback ───────────────────────────────────────────────────────────
function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="glass flex flex-col items-center justify-center rounded-2xl py-16 text-center"
      style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(254,242,242,0.7)' }}
    >
      <AlertCircle className="mb-3 h-12 w-12 text-red-400" />
      <p className="text-lg font-semibold text-red-700">
        Unable to load progress
      </p>
      <p className="mt-1 text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyDashboard() {
  return (
    <div
      className="glass flex flex-col items-center justify-center rounded-2xl py-20 text-center"
      style={{ borderStyle: 'dashed', borderColor: 'rgba(99,102,241,0.25)' }}
    >
      <span
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.12))',
          boxShadow: '0 4px 16px rgba(99,102,241,0.12)',
        }}
      >
        <BookOpen className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
      </span>
      <h2
        className="text-xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Welcome to your learning dashboard!
      </h2>
      <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--color-muted)' }}>
        Complete your first conversation, translation, or presentation session
        to see insights, vocabulary tracking, and mistake pattern analysis here.
      </p>
    </div>
  );
}

// ── Hero banner ──────────────────────────────────────────────────────────────
function HeroBanner({ totalSessions }: { totalSessions: number }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-7"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      {/* Subtle gradient orbs for depth */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-20 h-32 w-32 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'rgba(165,180,252,0.8)' }}>
            {greeting} ✦ Keep learning
          </p>
          <h1
            className="mt-1 text-3xl font-extrabold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Your Learning Journey
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(199,210,254,0.7)' }}>
            Every session brings you closer to fluency. Keep the momentum going.
          </p>
        </div>

        {/* Streak indicator */}
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-xl px-5 py-3"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Sparkles className="h-5 w-5 text-amber-300 mb-1" />
          <span
            className="text-2xl font-extrabold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {totalSessions}
          </span>
          <span className="text-xs font-medium" style={{ color: 'rgba(165,180,252,0.7)' }}>
            sessions
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  children,
  title,
  icon,
}: {
  children: React.ReactNode;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2
        className="mb-4 flex items-center gap-2 text-base font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { stats, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-8">
        <div
          className="h-32 rounded-2xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
            opacity: 0.7,
          }}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <HeroBanner totalSessions={0} />
        <DashboardError message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!stats || stats.total_sessions === 0) {
    return (
      <div className="space-y-8">
        <HeroBanner totalSessions={0} />
        <EmptyDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <HeroBanner totalSessions={stats.total_sessions} />

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Sessions"
          value={String(stats.total_sessions)}
          accentColor="bg-indigo-500"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Practice Time"
          value={`${stats.total_minutes} mins`}
          accentColor="bg-teal-500"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Words Learned"
          value={String(stats.vocabulary.length)}
          accentColor="bg-blue-500"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Words Mastered"
          value={String(stats.words_mastered)}
          accentColor="bg-amber-400"
        />
      </div>

      {/* ── Mistake Chart + Insights ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Mistake Patterns"
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
        >
          <MistakeChart patterns={stats.mistake_patterns} />
        </SectionCard>

        <SectionCard
          title="Personalised Tips"
          icon={<Star className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />}
        >
          <ActionableInsights insights={stats.insights} />
        </SectionCard>
      </div>

      {/* ── Vocabulary Bank ─────────────────────────────────────────────── */}
      <SectionCard
        title="Vocabulary Bank"
        icon={<BookOpen className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />}
      >
        <VocabularyTable items={stats.vocabulary} />
      </SectionCard>
    </div>
  );
}

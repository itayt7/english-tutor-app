import {
  Activity,
  BookOpen,
  Star,
  CalendarDays,
  AlertCircle,
  RefreshCw,
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
            className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
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
        <div className="h-80 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
        <div className="h-80 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
      </div>
      {/* Vocabulary skeleton */}
      <div className="h-64 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
      <AlertCircle className="mb-3 h-12 w-12 text-red-400" />
      <p className="text-lg font-semibold text-red-700">
        Unable to load progress
      </p>
      <p className="mt-1 text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
      <BookOpen className="mb-4 h-14 w-14 text-indigo-300" />
      <h2 className="text-xl font-bold text-gray-700">
        Welcome to your learning dashboard!
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Complete your first conversation, translation, or presentation session
        to see insights, vocabulary tracking, and mistake pattern analysis here.
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { stats, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Learning Journey
          </h1>
          <p className="mt-1 text-sm text-gray-500">Loading your progress…</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Learning Journey
          </h1>
        </div>
        <DashboardError message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!stats || stats.total_sessions === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Learning Journey
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Let's get started with your first session!
          </p>
        </div>
        <EmptyDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Your Learning Journey
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's a snapshot of your progress and areas for improvement.
        </p>
      </div>

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
        {/* Radar chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Mistake Patterns
          </h2>
          <MistakeChart patterns={stats.mistake_patterns} />
        </div>

        {/* Actionable insights */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Star className="h-5 w-5 text-indigo-500" />
            Personalised Tips
          </h2>
          <ActionableInsights insights={stats.insights} />
        </div>
      </div>

      {/* ── Vocabulary Bank ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Vocabulary Bank
        </h2>
        <VocabularyTable items={stats.vocabulary} />
      </div>
    </div>
  );
}

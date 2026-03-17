import { useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { User, BookOpen, TrendingUp, Star } from 'lucide-react';
import IntegrationTest from '../components/IntegrationTest';

// ── tiny reusable card ────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

// ── skeleton loader ───────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-8 w-1/2 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-2/3 rounded bg-gray-100" />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Fetch the first available user via the list endpoint,
    // using a relative URL so the Vite dev proxy handles it.
    fetch('/api/v1/users/?limit=1', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<UserProfile[]>;
      })
      .then((users) => {
        if (users.length === 0) {
          throw new Error('No user profile found. Please seed the database.');
        }
        setProfile(users[0]);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message ?? 'Could not load profile.');
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's a snapshot of your learning journey.
        </p>
      </div>

      {/* Profile card */}
      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
          ⚠️ Could not load profile — <span className="font-mono">{error}</span>
        </div>
      ) : profile ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
              <User className="h-7 w-7 text-indigo-600" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Learner Profile
              </p>
              <p className="text-xl font-bold capitalize text-gray-900">
                {profile.proficiency_level}
              </p>
              <p className="text-sm text-gray-500">
                Native language:{' '}
                <span className="font-medium text-gray-700">{profile.native_language}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen}   label="Sessions"        value="24"    color="bg-indigo-500" />
        <StatCard icon={TrendingUp} label="Words Learned"   value="1,340" color="bg-emerald-500" />
        <StatCard icon={Star}       label="Streak"          value="7 days" color="bg-amber-400" />
      </div>

      {/* Quick-start cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Jump back in
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { title: 'Practice Conversation', desc: 'Chat with the AI tutor in free-form English.', color: 'bg-indigo-500' },
            { title: 'Translate a Phrase',    desc: 'Instantly translate and break down any sentence.', color: 'bg-emerald-500' },
          ].map(({ title, desc, color }) => (
            <div
              key={title}
              className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
            >
              <div className={`mb-3 inline-flex h-2 w-8 rounded-full ${color}`} />
              <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                {title}
              </p>
              <p className="mt-1 text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Backend integration test */}
      <IntegrationTest />
    </div>
  );
}

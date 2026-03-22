import { useState, useEffect } from "react";
import type { DashboardStats } from "../types/dashboard";
import { fetchDashboardStats } from "../services/dashboardService";

interface UseDashboardResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook that fetches and manages dashboard stats state.
 */
export function useDashboard(userId: number = 1): UseDashboardResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);

    fetchDashboardStats(userId)
      .then((data) => setStats(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unknown error")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { stats, loading, error, refetch: load };
}

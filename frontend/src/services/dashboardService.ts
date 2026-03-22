import type { DashboardStats } from "../types/dashboard";

/**
 * Fetch aggregated dashboard statistics for the given user.
 */
export async function fetchDashboardStats(
  userId: number = 1
): Promise<DashboardStats> {
  const res = await fetch(`/api/v1/dashboard/stats?user_id=${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to load dashboard data (HTTP ${res.status})`);
  }
  return res.json();
}

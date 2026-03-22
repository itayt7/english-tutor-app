import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { MistakePatternAggregate } from "../../types/dashboard";

interface MistakeChartProps {
  patterns: MistakePatternAggregate[];
}

export default function MistakeChart({ patterns }: MistakeChartProps) {
  // Only show categories that have at least 1 occurrence (keeps the chart clean)
  const hasData = patterns.some((p) => p.frequency_count > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
        <AlertTriangle className="mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium">No mistake data yet</p>
        <p className="mt-1 text-sm">Complete a session to see your patterns here.</p>
      </div>
    );
  }

  // Shorten labels for small screens
  const chartData = patterns.map((p) => ({
    category: p.category.length > 14 ? p.category.slice(0, 12) + "…" : p.category,
    fullCategory: p.category,
    frequency_count: p.frequency_count,
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, "dataMax + 1"]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "0.5rem",
              color: "#f9fafb",
              fontSize: "0.8rem",
            }}
          />
          <Radar
            name="Mistakes"
            dataKey="frequency_count"
            stroke="#f59e0b"
            fill="#fbbf24"
            fillOpacity={0.5}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

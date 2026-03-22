import { Lightbulb } from "lucide-react";
import type { ActionableInsight } from "../../types/dashboard";

interface ActionableInsightsProps {
  insights: ActionableInsight[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Prepositions: "border-amber-300 bg-amber-50",
  "Verb Tense": "border-rose-300 bg-rose-50",
  "Subject-Verb Agreement": "border-purple-300 bg-purple-50",
  "Hebrew Interference": "border-sky-300 bg-sky-50",
  "Vocabulary Misuse": "border-teal-300 bg-teal-50",
  Articles: "border-orange-300 bg-orange-50",
  "Word Order": "border-indigo-300 bg-indigo-50",
  Other: "border-gray-300 bg-gray-50",
};

export default function ActionableInsights({ insights }: ActionableInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
        <Lightbulb className="mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium">No insights yet</p>
        <p className="mt-1 text-sm">
          Complete your first session to see personalised tips!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, idx) => {
        const colors =
          CATEGORY_COLORS[insight.category] ?? CATEGORY_COLORS["Other"];
        return (
          <div
            key={idx}
            className={`rounded-xl border-l-4 p-4 ${colors} transition hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold text-gray-800">{insight.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  {insight.description}
                </p>
                <span className="mt-2 inline-block rounded-md bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {insight.category}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

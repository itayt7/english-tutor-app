import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { VocabularyItem } from "../../types/dashboard";

interface VocabularyTableProps {
  items: VocabularyItem[];
}

const PAGE_SIZE = 6;

/** Small pill showing mastery level with colour coding. */
function MasteryBadge({ level }: { level: number }) {
  const config: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: "bg-red-50", text: "text-red-700", label: "New" },
    2: { bg: "bg-orange-50", text: "text-orange-700", label: "Learning" },
    3: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Familiar" },
    4: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Good" },
    5: { bg: "bg-green-50", text: "text-green-700", label: "Mastered" },
  };
  const c = config[level] ?? config[1];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} border-current/15`}
    >
      {c.label}
    </span>
  );
}

export default function VocabularyTable({ items }: VocabularyTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = items.filter(
    (v) =>
      v.word_or_phrase.toLowerCase().includes(search.toLowerCase()) ||
      v.hebrew_translation.includes(search) ||
      v.source_context.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when search changes
  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(0);
  };

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="font-medium">Your vocabulary bank is empty</p>
        <p className="mt-1 text-sm">
          Words you learn during sessions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search words…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-gray-600">Word / Phrase</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600">Hebrew</th>
              <th className="hidden px-4 py-2.5 font-semibold text-gray-600 md:table-cell">
                Context
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageItems.map((item) => (
              <tr key={item.id} className="transition hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {item.word_or_phrase}
                </td>
                <td className="px-4 py-3 text-gray-600" dir="rtl">
                  {item.hebrew_translation}
                </td>
                <td className="hidden max-w-xs truncate px-4 py-3 text-gray-500 md:table-cell">
                  <span className="line-clamp-2 italic">"{item.source_context}"</span>
                </td>
                <td className="px-4 py-3">
                  <MasteryBadge level={item.mastery_level} />
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No matching words found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg p-1.5 transition hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg p-1.5 transition hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

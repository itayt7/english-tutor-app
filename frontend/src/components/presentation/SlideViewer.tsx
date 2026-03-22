import React from "react";
import { FileText, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { ExtractedSlide } from "../../types/presentation";

interface Props {
  filename: string;
  slides: ExtractedSlide[];
  activeSlideIndex: number;
  onSlideChange: (idx: number) => void;
  onReset: () => void;
}

const SlideViewer: React.FC<Props> = ({
  filename,
  slides,
  activeSlideIndex,
  onSlideChange,
  onReset,
}) => {
  const currentSlide = slides[activeSlideIndex];
  const totalSlides = slides.length;
  const hasPrev = activeSlideIndex > 0;
  const hasNext = activeSlideIndex < totalSlides - 1;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {filename}
          </span>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium
                     text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Upload a different file"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New file
        </button>
      </div>

      {/* ── Slide content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            Slide {currentSlide.page_number} of {totalSlides}
          </span>
        </div>

        {currentSlide.text ? (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {currentSlide.text}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            This slide has no extractable text.
          </p>
        )}
      </div>

      {/* ── Slide navigation ────────────────────────────────────────────── */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <button
            disabled={!hasPrev}
            onClick={() => onSlideChange(activeSlideIndex - 1)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium
                       text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {/* Slide dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onSlideChange(idx)}
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  idx === activeSlideIndex
                    ? "bg-indigo-500 scale-125"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            disabled={!hasNext}
            onClick={() => onSlideChange(activeSlideIndex + 1)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium
                       text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SlideViewer;

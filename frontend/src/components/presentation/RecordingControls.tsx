import React from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";

interface Props {
  isRecording: boolean;
  isTranscribing: boolean;
  isEvaluating: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  micError: string | null;
}

const RecordingControls: React.FC<Props> = ({
  isRecording,
  isTranscribing,
  isEvaluating,
  disabled,
  onStart,
  onStop,
  micError,
}) => {
  const isBusy = isTranscribing || isEvaluating;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ── Main button ──────────────────────────────────────────────────── */}
      {isBusy ? (
        <div className="flex items-center gap-2.5 rounded-full bg-gray-100 px-5 py-3">
          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium text-gray-600">
            {isTranscribing ? "Transcribing…" : "Getting feedback…"}
          </span>
        </div>
      ) : isRecording ? (
        <button
          onClick={onStop}
          className="group flex items-center gap-2.5 rounded-full bg-red-500 px-6 py-3
                     text-white shadow-lg shadow-red-200 hover:bg-red-600
                     transition-all duration-200 active:scale-95"
        >
          <Square className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold">Stop Recording</span>

          {/* Pulse animation */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-200" />
          </span>
        </button>
      ) : (
        <button
          onClick={onStart}
          disabled={disabled}
          className="group flex items-center gap-2.5 rounded-full bg-indigo-500 px-6 py-3
                     text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                     transition-all duration-200 active:scale-95"
        >
          <Mic className="h-5 w-5" />
          <span className="text-sm font-semibold">Start Pitching</span>
        </button>
      )}

      {/* ── Status text ──────────────────────────────────────────────────── */}
      {isRecording && (
        <p className="text-xs text-red-500 animate-pulse">
          🔴 Recording — speak your pitch, then click Stop
        </p>
      )}

      {/* ── Mic error ────────────────────────────────────────────────────── */}
      {micError && (
        <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}
    </div>
  );
};

export default RecordingControls;

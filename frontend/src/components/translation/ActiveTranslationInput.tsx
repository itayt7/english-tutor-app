import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface Props {
  /** The source sentence the user needs to translate */
  sourceSentence: string;
  /** Whether we're waiting for the AI response */
  isLoading: boolean;
  /** Called when the user submits their translation */
  onSubmit: (translation: string) => void;
}

const ActiveTranslationInput: React.FC<Props> = ({
  sourceSentence,
  isLoading,
  onSubmit,
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea whenever the source sentence changes
  useEffect(() => {
    setValue("");
    textareaRef.current?.focus();
  }, [sourceSentence]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Source sentence */}
      <label
        htmlFor="translation-input"
        className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"
      >
        Translate this sentence
      </label>
      <p className="text-sm font-medium text-gray-800 mb-3 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
        {sourceSentence}
      </p>

      {/* Textarea */}
      <textarea
        id="translation-input"
        ref={textareaRef}
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
                   focus:border-indigo-400 disabled:bg-gray-50 disabled:cursor-not-allowed
                   transition-colors"
        placeholder="Type your English translation here…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        aria-label="Your English translation"
      />

      {/* Footer: hint + submit */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          {value.length > 0 ? `${value.length}/2000` : "⌘+Enter to submit"}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm
                     font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none
                     focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
          aria-label="Submit translation"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Evaluating…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ActiveTranslationInput;

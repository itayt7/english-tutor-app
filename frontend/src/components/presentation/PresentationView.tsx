import React from "react";
import { Presentation } from "lucide-react";
import { usePresentationPractice } from "../../hooks/usePresentationPractice";
import FileUploadDropzone from "./FileUploadDropzone";
import SlideViewer from "./SlideViewer";
import RecordingControls from "./RecordingControls";
import FeedbackPanel from "./FeedbackPanel";

const PresentationView: React.FC = () => {
  const {
    filename,
    slides,
    activeSlideIndex,
    setActiveSlideIndex,
    isUploading,
    uploadError,
    handleFileUpload,
    resetUpload,

    isRecording,
    isTranscribing,
    transcript,
    startRecording,
    stopRecording,
    micError,

    isEvaluating,
    evaluation,
    evaluationError,
    clearEvaluationError,
  } = usePresentationPractice();

  const hasFile = slides.length > 0 && filename;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.15))',
            boxShadow: '0 4px 12px rgba(245,158,11,0.15)',
          }}
        >
          <Presentation className="h-5 w-5 text-amber-500" />
        </span>
        <div>
          <h1
            className="text-2xl font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Presentation Practice
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Upload your deck, pitch each slide, and get AI coaching
          </p>
        </div>
      </div>

      {/* ── Main split layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[520px]">
        {/* ── Left pane: Upload / Slide Viewer ───────────────────────────── */}
        <div
          className="glass rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(255,255,255,0.78)' }}
        >
          {hasFile ? (
            <SlideViewer
              filename={filename}
              slides={slides}
              activeSlideIndex={activeSlideIndex}
              onSlideChange={setActiveSlideIndex}
              onReset={resetUpload}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8">
              <FileUploadDropzone
                onFileAccepted={handleFileUpload}
                isUploading={isUploading}
                error={uploadError}
              />
            </div>
          )}
        </div>

        {/* ── Right pane: Feedback Panel ──────────────────────────────────── */}
        <div
          className="glass rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(255,255,255,0.78)' }}
        >
          <FeedbackPanel
            evaluation={evaluation}
            transcript={transcript}
            isEvaluating={isEvaluating}
            error={evaluationError}
            onDismissError={clearEvaluationError}
          />
        </div>
      </div>

      {/* ── Recording controls (centered below the split) ────────────────── */}
      <div className="flex justify-center">
        <RecordingControls
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          isEvaluating={isEvaluating}
          disabled={!hasFile}
          onStart={startRecording}
          onStop={stopRecording}
          micError={micError}
        />
      </div>
    </div>
  );
};

export default PresentationView;

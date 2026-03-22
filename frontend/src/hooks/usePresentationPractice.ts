import { useState, useRef, useCallback } from "react";
import type {
  ExtractedSlide,
  PitchEvaluation,
} from "../types/presentation";
import {
  uploadPresentation,
  ingestPresentation,
  evaluatePitch,
} from "../services/presentationService";
import { transcribeAudio } from "../services/speechService";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Public return type
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface UsePresentationPracticeReturn {
  /* ── File upload state ──────────────────────────────────────────────── */
  filename: string | null;
  slides: ExtractedSlide[];
  activeSlideIndex: number;
  setActiveSlideIndex: (idx: number) => void;
  isUploading: boolean;
  uploadError: string | null;
  clearUploadError: () => void;
  handleFileUpload: (file: File) => Promise<void>;
  resetUpload: () => void;

  /* ── Recording state ────────────────────────────────────────────────── */
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  micError: string | null;

  /* ── Evaluation state ───────────────────────────────────────────────── */
  isEvaluating: boolean;
  evaluation: PitchEvaluation | null;
  evaluationError: string | null;
  clearEvaluationError: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Hook implementation
 * ═══════════════════════════════════════════════════════════════════════════ */

export function usePresentationPractice(): UsePresentationPracticeReturn {
  /* ── File / slide state ─────────────────────────────────────────────── */
  const [filename, setFilename] = useState<string | null>(null);
  const [slides, setSlides] = useState<ExtractedSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* ── Recording state ────────────────────────────────────────────────── */
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /* ── Evaluation state ───────────────────────────────────────────────── */
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<PitchEvaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  /* ── File upload handler ────────────────────────────────────────────── */
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setEvaluation(null);
    setTranscript(null);

    try {
      // 1. Upload and extract text
      const extraction = await uploadPresentation(file);
      setFilename(extraction.filename);
      setSlides(extraction.slides);
      setActiveSlideIndex(0);

      // 2. Ingest into the vector DB (fire-and-forget for UX speed)
      ingestPresentation(file).catch((err) => {
        console.warn("Background ingestion failed:", err);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }, []);

  /* ── Reset upload ───────────────────────────────────────────────────── */
  const resetUpload = useCallback(() => {
    setFilename(null);
    setSlides([]);
    setActiveSlideIndex(0);
    setEvaluation(null);
    setTranscript(null);
    setUploadError(null);
    setEvaluationError(null);
    setMicError(null);
  }, []);

  /* ── Evaluate pitch helper ──────────────────────────────────────────── */
  const runEvaluation = useCallback(
    async (transcriptText: string) => {
      setIsEvaluating(true);
      setEvaluationError(null);
      try {
        const result = await evaluatePitch(
          transcriptText,
          filename ?? undefined,
        );
        setEvaluation(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Evaluation failed";
        setEvaluationError(msg);
      } finally {
        setIsEvaluating(false);
      }
    },
    [filename],
  );

  /* ── Start recording ────────────────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    setMicError(null);
    setEvaluation(null);
    setTranscript(null);
    setEvaluationError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          setTranscript(text);

          // Auto-evaluate after transcription
          if (text.trim()) {
            await runEvaluation(text);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setMicError(msg);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setMicError(
        "Microphone access denied. Please allow microphone permissions.",
      );
    }
  }, [runEvaluation]);

  /* ── Stop recording ─────────────────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return {
    filename,
    slides,
    activeSlideIndex,
    setActiveSlideIndex,
    isUploading,
    uploadError,
    clearUploadError: () => setUploadError(null),
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
    clearEvaluationError: () => setEvaluationError(null),
  };
}

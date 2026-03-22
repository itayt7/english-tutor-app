/**
 * Presentation Service – talks to the backend /api/v1/presentations endpoints.
 *
 * • uploadPresentation → POST /upload   (multipart → extracted slides)
 * • ingestPresentation → POST /ingest   (multipart → ingest into vector DB)
 * • evaluatePitch      → POST /evaluate-pitch (JSON → PitchEvaluation)
 */

import type {
  DocumentExtractionResult,
  IngestResponse,
  PitchEvaluation,
} from "../types/presentation";

const API_BASE = "/api/v1/presentations";

/* ── Upload & extract text from a PDF/PPTX ────────────────────────────────── */

export async function uploadPresentation(
  file: File,
): Promise<DocumentExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Upload failed (HTTP ${res.status})`);
  }

  return res.json();
}

/* ── Upload, extract, and ingest into vector DB ───────────────────────────── */

export async function ingestPresentation(
  file: File,
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Ingestion failed (HTTP ${res.status})`);
  }

  return res.json();
}

/* ── Evaluate a spoken pitch against ingested slides ──────────────────────── */

export async function evaluatePitch(
  userTranscript: string,
  filename?: string,
  topK: number = 5,
): Promise<PitchEvaluation> {
  const res = await fetch(`${API_BASE}/evaluate-pitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_transcript: userTranscript,
      filename: filename ?? null,
      top_k: topK,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Evaluation failed (HTTP ${res.status})`);
  }

  return res.json();
}

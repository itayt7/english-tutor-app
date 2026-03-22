/* ── Presentation types (mirrors backend schemas/presentation.py) ──────── */

export interface ExtractedSlide {
  page_number: number;
  text: string;
}

export interface DocumentExtractionResult {
  filename: string;
  slides: ExtractedSlide[];
}

export interface IngestResponse {
  filename: string;
  chunks_stored: number;
}

export interface PitchEvaluation {
  accuracy_score: number;
  grammar_corrections: string[];
  coach_feedback: string;
  suggested_phrasing: string;
}

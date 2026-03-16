export type Role = "user" | "assistant" | "system";
export type ErrorType = "grammar" | "vocabulary" | "syntax" | "literal_translation";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface CorrectionItem {
  original_text: string;
  corrected_text: string;
  explanation: string;
  error_type: ErrorType;
}

export interface EvaluationResult {
  has_errors: boolean;
  corrections: CorrectionItem[];
}

export interface UIMessage extends ChatMessage {
  id: string;
  evaluation?: EvaluationResult; 
}
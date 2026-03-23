/* ── Dashboard types (mirrors backend schemas/dashboard.py) ─────────────── */

export interface VocabularyItem {
  id: number;
  word_or_phrase: string;
  hebrew_translation: string;
  source_context: string;
  mastery_level: number; // 1 (new) → 5 (mastered)
}

export interface MistakePatternAggregate {
  category: string;
  frequency_count: number;
  recent_examples: string[];
}

export interface ActionableInsight {
  title: string;
  description: string;
  category: string;
}

export interface DashboardStats {
  total_sessions: number;
  total_minutes: number;
  words_mastered: number;
  vocabulary: VocabularyItem[];
  mistake_patterns: MistakePatternAggregate[];
  insights: ActionableInsight[];
}

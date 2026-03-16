import pytest
from app.ai.prompts.evaluator import get_evaluator_system_prompt


class TestGetEvaluatorSystemPrompt:
    """Tests for the evaluator system prompt generation."""

    def test_prompt_includes_proficiency_level(self):
        """The prompt should embed the student's proficiency level."""
        prompt = get_evaluator_system_prompt("intermediate")
        assert "intermediate" in prompt

    def test_prompt_includes_json_schema(self):
        """The prompt must describe the expected JSON output schema."""
        prompt = get_evaluator_system_prompt("beginner")
        assert '"has_errors"' in prompt
        assert '"corrections"' in prompt
        assert '"original_text"' in prompt
        assert '"corrected_text"' in prompt
        assert '"error_type"' in prompt

    def test_prompt_mentions_hebrew_context(self):
        """The prompt should include guidance specific to Hebrew speakers."""
        prompt = get_evaluator_system_prompt("advanced")
        assert "Hebrew" in prompt
        assert "literal_translation" in prompt or "literal translation" in prompt.lower()

    def test_prompt_mentions_stt_tolerance(self):
        """The prompt should instruct the LLM to ignore minor punctuation from STT."""
        prompt = get_evaluator_system_prompt("intermediate")
        assert "punctuation" in prompt.lower()
        assert "Speech-to-Text" in prompt

    def test_prompt_varies_by_level(self):
        """Different proficiency levels should produce different prompts."""
        beginner_prompt = get_evaluator_system_prompt("beginner")
        advanced_prompt = get_evaluator_system_prompt("advanced")
        assert beginner_prompt != advanced_prompt

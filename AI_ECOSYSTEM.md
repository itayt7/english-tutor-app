# 🤖 AI Ecosystem — English Tutor App

> **Maintenance note:** This document must be updated every time an AI agent, prompt, model deployment, RAG component, or embedding configuration is added, modified, or removed.  
> Last updated: **2026-03-23**

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [AI Components Table](#ai-components-table)
3. [RAG Pipeline](#rag-pipeline)
4. [Model Deployments Reference](#model-deployments-reference)
5. [Adding / Changing an AI Component](#adding--changing-an-ai-component)

---

## Infrastructure Overview

All LLM and Speech calls go through **Azure OpenAI**. There are **two separate Azure OpenAI clients**:

| Client | Variable | Purpose | Config keys |
|---|---|---|---|
| Chat / LLM | `ai_client` | All conversational agents + analysis agents | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT_NAME` |
| Speech (STT / TTS) | `speech_client` | Audio transcription + speech synthesis | `AZURE_OPENAI_SPEECH_API_KEY`, `AZURE_OPENAI_SPEECH_ENDPOINT`, `AZURE_OPENAI_SPEECH_API_VERSION` |

Both clients are instantiated as singletons in `backend/app/ai/client.py`.

Embeddings use a **third dedicated client** (`_embedding_client`) inside `backend/app/ai/rag/embeddings.py`, pointing to the same Azure resource as the chat client but targeting an embedding deployment.

Vector storage is provided by a local **ChromaDB** instance persisted at `./data/chroma_db`.

---

## AI Components Table

| # | Component Name | Role / Purpose | App Feature | Agent File | Prompt File | Model / Deployment | Temp | Output Format | Invoked By |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Tutor Agent** | Drives the conversational English tutoring session. Adapts tone and vocabulary to the student's proficiency level. Never corrects errors inline — another agent handles that asynchronously. | Chat (Conversation) | `app/ai/agents/tutor.py` | `app/ai/prompts/tutor.py` · `get_tutor_system_prompt(proficiency_level, native_language)` | `AZURE_OPENAI_DEPLOYMENT_NAME` (configurable, e.g. GPT-4o) | `0.7` | Plain text | `app/api/chat.py` — fired in parallel with Evaluator via `asyncio.gather` |
| 2 | **Shadow Evaluator** | Silently analyses each user message for grammar, vocabulary, syntax, and Hebrew-interference errors. Runs concurrently with the Tutor so it doesn't add latency. | Chat (Error Feedback) | `app/ai/agents/evaluator.py` | `app/ai/prompts/evaluator.py` · `get_evaluator_system_prompt(proficiency_level)` | `AZURE_OPENAI_DEPLOYMENT_NAME` | `0.1` | JSON (`EvaluationResult`) | `app/api/chat.py` — fired in parallel with Tutor |
| 3 | **Translation Coach** | Evaluates a student's English translation of a Hebrew sentence. Returns a score, corrected text, a list of grammar issues, and a Hebrew-speaker-specific tip. | Translation Practice | `app/ai/agents/translation_coach.py` | `app/ai/prompts/translation_coach.py` · `get_translation_coach_system_prompt()` | `AZURE_OPENAI_DEPLOYMENT_NAME` | `0.1` | JSON (`TranslationEvaluation`) | `app/api/translation.py` |
| 4 | **Article Translator** | Translates English news articles to fluent Hebrew (3–4 paragraphs). Strips noise (bylines, ads, captions). Used to support the Hebrew→English translation mode. | Translation Practice (Hebrew mode) | `app/ai/agents/article_translator.py` | `app/ai/prompts/article_translator.py` · `get_article_translator_system_prompt()` | `AZURE_OPENAI_DEPLOYMENT_NAME` | `0.3` | Plain Hebrew text | `app/services/news_gatherer.py` — called when `language == "he"` |
| 5 | **Presentation Coach** | Evaluates a user's spoken pitch against the actual content of their uploaded slide deck (retrieved via RAG). Returns an accuracy score, grammar corrections, coaching feedback, and a native-speaker rephrase. | Presentation Practice | `app/ai/agents/presentation_coach.py` | `app/ai/prompts/presentation_coach.py` · `get_presentation_coach_system_prompt(rag_context, user_transcript)` | `AZURE_OPENAI_DEPLOYMENT_NAME` | `0.2` | JSON (`PitchEvaluation`) | `app/api/presentations.py` — `/evaluate-pitch` endpoint |
| 6 | **Insights Generator** | Post-session analysis agent. Reads a full conversation transcript and extracts: categorised mistake patterns + 3–7 vocabulary items with Hebrew translations. Results are persisted to the DB for the dashboard. | Dashboard (Learning Insights) | `app/ai/agents/insights_generator.py` | `app/ai/prompts/insights_generator.py` · `get_insights_generator_prompt()` | `AZURE_OPENAI_DEPLOYMENT_NAME` | `0.15` | JSON (`InsightsGeneratorResult`) | `app/api/dashboard.py` — `/insights` endpoint |
| 7 | **STT (Speech-to-Text)** | Transcribes user audio to text using Azure OpenAI's Whisper/GPT-4o-transcribe deployment. Used in Presentation Practice (spoken pitch) and in the Chat screen (voice input). | Chat + Presentation Practice | `app/api/speech.py` (direct API call, no agent wrapper) | _(no prompt — raw audio model)_ | `AZURE_OPENAI_STT_DEPLOYMENT_NAME` (default: `gpt-4o-transcribe`) | N/A | Plain text | `app/api/speech.py` — `/speech/transcribe` endpoint |
| 8 | **TTS (Text-to-Speech)** | Synthesises audio from text using Azure OpenAI's TTS deployment. Used to play back the AI Tutor's responses aloud. Voice: `alloy`. | Chat | `app/api/speech.py` (direct API call, no agent wrapper) | _(no prompt — voice synthesis)_ | `AZURE_OPENAI_TTS_DEPLOYMENT_NAME` (default: `gpt-4o-mini-tts`) | N/A | `audio/mpeg` binary | `app/api/speech.py` — `/speech/synthesize` endpoint |
| 9 | **Embedding Model** | Generates dense vector embeddings for slide chunks during RAG ingestion, and for query vectors during similarity search. | Presentation Practice (RAG) | `app/ai/rag/embeddings.py` — `generate_embeddings(texts)` | _(no prompt — embedding model)_ | `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` (default: `text-embedding-3-small`) | N/A | `List[List[float]]` | `app/ai/rag/chroma_client.py` — on ingest + on search |

---

## RAG Pipeline

The Presentation Coach uses a Retrieval-Augmented Generation (RAG) pipeline to ground its evaluation in the actual slide content.

```
User uploads PDF / PPTX
        │
        ▼
document_parser.py          ← PyMuPDF / python-pptx extract slide text
        │
        ▼
chroma_client.py            ← chunk_slides() splits text (≤1000 chars, 100 overlap)
        │
        ▼
embeddings.py               ← Azure OpenAI text-embedding-3-small generates vectors
        │
        ▼
ChromaDB (local)            ← vectors + metadata stored at ./data/chroma_db
        │
  (query time)
        │
        ▼
similarity_search()         ← top-k chunks retrieved for the current slide
        │
        ▼
presentation_coach.py       ← RAG context injected into system prompt → GPT-4o
        │
        ▼
PitchEvaluation JSON        ← returned to frontend
```

**Key RAG constants** (in `app/ai/rag/chroma_client.py`):

| Constant | Value | Description |
|---|---|---|
| `MAX_CHUNK_CHARS` | `1000` | Max characters per chunk before recursive splitting |
| `CHUNK_OVERLAP` | `100` | Character overlap between consecutive sub-chunks |

---

## Model Deployments Reference

| Env Variable | Default Value | Used By |
|---|---|---|
| `AZURE_OPENAI_DEPLOYMENT_NAME` | _(required, e.g. `gpt-4o`)_ | Tutor, Evaluator, Translation Coach, Article Translator, Presentation Coach, Insights Generator |
| `AZURE_OPENAI_STT_DEPLOYMENT_NAME` | `gpt-4o-transcribe` | STT |
| `AZURE_OPENAI_TTS_DEPLOYMENT_NAME` | `gpt-4o-mini-tts` | TTS |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` | `text-embedding-3-small` | Embedding Model / RAG |
| `AZURE_OPENAI_API_VERSION` | `2024-02-15-preview` | Chat / LLM client |
| `AZURE_OPENAI_SPEECH_API_VERSION` | `2025-03-01-preview` | Speech client |

---

## Adding / Changing an AI Component

When making any change to the AI ecosystem, update this document accordingly:

### Adding a new agent
1. Create `app/ai/agents/<name>.py` and `app/ai/prompts/<name>.py`.
2. Add a new row to the [AI Components Table](#ai-components-table).
3. Document: purpose, invoking API route, model used, temperature, output format, prompt location.

### Changing a prompt
1. Edit the relevant file in `app/ai/prompts/`.
2. Update the **Prompt File** cell in the table and note the change in a git commit message.

### Changing a model or deployment
1. Update the environment variable in `.env` (and update deployment name defaults in `app/core/config.py` if applicable).
2. Update the **Model / Deployment** column and the [Model Deployments Reference](#model-deployments-reference) table.

### Changing RAG chunking or retrieval
1. Edit constants or logic in `app/ai/rag/chroma_client.py`.
2. Update the **Key RAG constants** table above.
3. Re-ingest all existing presentations — ChromaDB collections will have stale embeddings from the old chunking strategy.

### Removing a component
1. Delete agent + prompt files.
2. Remove the row from the table and remove any references in the invoking API routes.

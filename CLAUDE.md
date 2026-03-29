# Project Instructions

## Commands

```bash
# Dev (start both backend + frontend)
./dev.sh

# Backend
cd backend && source venv/bin/activate
uvicorn main:app --reload          # start server (port 8000)
pytest                             # run all tests
pytest tests/test_chat_api.py      # run single test file
alembic upgrade head               # apply migrations
alembic revision --autogenerate -m "description"  # create migration

# Frontend
cd frontend
npm run dev        # start dev server (port 5173)
npm run build      # tsc + vite build
npm run lint       # eslint check
```

## Architecture

- `backend/app/api/` — FastAPI routers (chat, users, news, translation, presentations, dashboard, speech)
- `backend/app/services/` — business logic (no direct DB calls from api/)
- `backend/app/ai/agents/` — LLM agents (tutor, evaluator, presentation_coach, translation_coach, article_translator, insights_generator)
- `backend/app/ai/rag/` — ChromaDB RAG pipeline for presentation coaching
- `backend/app/models/` — SQLAlchemy ORM models (User, LearningSession, VocabularyItem, MistakePattern)
- `backend/app/schemas/` — Pydantic request/response schemas
- `backend/alembic/` — database migrations (SQLite in dev)
- `frontend/src/components/` — feature-based React components (chat/, translation/, presentation/, dashboard/)
- `frontend/src/hooks/` — custom React hooks per feature
- `frontend/src/pages/` — page-level components wired to React Router

## Key Decisions

- API routers live in `app/api/`, all business logic is in `app/services/` or `app/ai/` — never put DB calls directly in routers.
- Each AI feature has a paired agent (`app/ai/agents/`) and prompt file (`app/ai/prompts/`) — keep them in sync.
- ChromaDB vector store is used only for the presentation RAG pipeline, not general chat.
- Frontend uses Vite proxy to forward `/api` to FastAPI on port 8000 — no CORS config needed in dev.
- SQLite in dev, migrations managed by Alembic — never edit existing migration files.

## Domain Knowledge

- **MistakePattern** — tracked grammar/vocabulary errors from chat sessions, used to power dashboard insights.
- **LearningSession** — a single conversation session; links messages to a user for history tracking.
- **VocabularyItem** — words the tutor has flagged for the user to review.
- **RAG** — Retrieval-Augmented Generation; the presentation coach retrieves relevant coaching content from ChromaDB before generating feedback.

## Workflow

- Run `npm run build` (frontend) or check FastAPI startup errors after backend changes to catch type issues early.
- Prefer fixing the root cause over adding workarounds.
- When unsure about approach, use plan mode (`Shift+Tab`) before coding.

## Don'ts

- Don't modify generated files (`*.gen.ts`, `*.generated.*`).
- Don't put business logic in FastAPI routers — use `services/` or `ai/agents/`.
- Don't add raw SQL when SQLAlchemy ORM provides an equivalent method.

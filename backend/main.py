from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.users import router as users_router
from app.api.chat import router as chat_router
from app.database import get_db
from app.models.user import User

# NOTE: Schema is managed by Alembic migrations.
# Run `alembic upgrade head` before starting the server.

app = FastAPI(
    title="AI English Tutor API",
    description="Backend for the AI-powered English tutoring application.",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the Vite dev server (and any localhost port) during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # CRA / fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(users_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])


# ── Root & Health ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def read_root():
    return {"status": "online", "message": "The AI Tutor Backend is breathing!"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}


# ── Integration test ──────────────────────────────────────────────────────────
@app.get("/api/test-connection", tags=["Debug"])
def test_connection(db: Session = Depends(get_db)):
    """Returns the total number of users — used by the frontend integration test."""
    user_count = db.query(User).count()
    return {
        "status": "ok",
        "database": "connected",
        "user_count": user_count,
    }

"""
Test fixtures shared across all test modules.

Overrides the `get_db` FastAPI dependency so that every test runs against an
isolated in-memory SQLite database instead of the real Supabase PostgreSQL
instance.  This keeps tests fast, deterministic, and side-effect-free.
"""

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User

# Import all models so their tables are registered on Base.metadata
import app.models.session       # noqa: F401
import app.models.vocabulary    # noqa: F401
import app.models.mistake       # noqa: F401
import app.models.chat_message  # noqa: F401

_TEST_DATABASE_URL = "sqlite://"  # in-memory, discarded after the process ends


@pytest.fixture(scope="session")
def db_engine():
    # StaticPool reuses a single connection so the in-memory DB persists
    # across all sessions created from this engine.
    engine = create_engine(
        _TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Enable FK enforcement for SQLite so tests catch constraint violations
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def db_session_factory(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture(autouse=True, scope="session")
def seed_default_user(db_session_factory):
    """Ensure user id=1 exists for all tests that create sessions."""
    session = db_session_factory()
    try:
        if not session.get(User, 1):
            session.add(User(id=1, native_language="Hebrew", proficiency_level="B2"))
            session.commit()
    finally:
        session.close()


@pytest.fixture(autouse=True)
def override_get_db(db_session_factory):
    """Replace the real DB dependency with the in-memory test session."""
    from main import app

    def _test_db():
        session = db_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _test_db
    yield
    app.dependency_overrides.pop(get_db, None)

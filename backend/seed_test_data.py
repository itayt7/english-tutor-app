"""
seed_test_data.py
-----------------
Inserts one demo User and one Conversation Session into the SQLite database.
Safe to run multiple times — skips insertion if the demo user already exists.

Usage (from the backend/ folder with the venv active):
    python seed_test_data.py
"""

import sys
import os

# Ensure `app.*` imports resolve when run directly from backend/
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User
from app.models.session import Session as TutorSession  # avoid shadowing built-in


def seed() -> None:
    db = SessionLocal()
    try:
        # ── Check for existing demo user ──────────────────────────────────────
        existing = db.query(User).filter_by(native_language="Hebrew").first()
        if existing:
            print(f"⚠️  Demo user already exists (id={existing.id}). Skipping insert.")
            return

        # ── Insert User ───────────────────────────────────────────────────────
        demo_user = User(
            native_language="Hebrew",
            proficiency_level="B2",
        )
        db.add(demo_user)
        db.flush()  # populate demo_user.id before using it in the session FK

        print(f"✅ Created user  → id={demo_user.id} | "
              f"language={demo_user.native_language} | "
              f"level={demo_user.proficiency_level}")

        # ── Insert Session ────────────────────────────────────────────────────
        demo_session = TutorSession(
            user_id=demo_user.id,
            type="Conversation",
            topic="Ordering food at a restaurant",
        )
        db.add(demo_session)
        db.commit()
        db.refresh(demo_session)

        print(f"✅ Created session → id={demo_session.id} | "
              f"type={demo_session.type} | "
              f"topic='{demo_session.topic}' | "
              f"created_at={demo_session.created_at}")

    except Exception as exc:
        db.rollback()
        print(f"❌ Seed failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()

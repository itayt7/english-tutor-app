"""
Seed realistic dashboard demo data for User #1.
Run:  python seed_dashboard_data.py
"""
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models.user import User
from app.models.session import Session
from app.models.vocabulary import VocabularyItem
from app.models.mistake import MistakePattern


def seed():
    db = SessionLocal()

    # Make sure user 1 exists
    user = db.get(User, 1)
    if not user:
        user = User(id=1, native_language="Hebrew", proficiency_level="intermediate")
        db.add(user)
        db.commit()
        db.refresh(user)
        print("✅ Created user #1")

    # ── Sessions ─────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    session_data = [
        ("conversation", "Ordering food at a restaurant", 12),
        ("conversation", "Asking for directions", 8),
        ("translation", "News article about technology", 15),
        ("conversation", "Job interview practice", 20),
        ("presentation", "Startup pitch practice", 25),
        ("conversation", "Discussing weekend plans", 10),
        ("translation", "Sports article translation", 14),
        ("conversation", "Small talk at a party", 9),
    ]

    sessions = []
    for i, (stype, topic, dur) in enumerate(session_data):
        s = Session(
            user_id=user.id,
            type=stype,
            topic=topic,
            duration_minutes=dur,
            created_at=now - timedelta(days=len(session_data) - i),
        )
        db.add(s)
        db.flush()
        sessions.append(s)
    db.commit()
    print(f"✅ Created {len(sessions)} sessions")

    # ── Vocabulary Items ─────────────────────────────────────────────────
    vocab_data = [
        ("Nevertheless", "בכל זאת", "Nevertheless, the project was completed on time.", 3, sessions[0].id),
        ("Accomplish", "להשיג", "I want to accomplish my goals this year.", 2, sessions[1].id),
        ("Regarding", "בנוגע ל", "Regarding your question, I have an answer.", 4, sessions[2].id),
        ("Take into account", "לקחת בחשבון", "You should take into account the risks.", 1, sessions[3].id),
        ("Procrastinate", "לדחות / להתמהמה", "I tend to procrastinate when I have big tasks.", 2, sessions[3].id),
        ("Subtle", "עדין / דק", "There is a subtle difference between the two words.", 1, sessions[4].id),
        ("Comprehensive", "מקיף", "We need a comprehensive plan for the project.", 3, sessions[4].id),
        ("Leverage", "למנף", "We can leverage our existing technology.", 5, sessions[4].id),
        ("Stand out", "לבלוט", "Our product stands out from the competition.", 4, sessions[5].id),
        ("Break the ice", "לשבור את הקרח", "He told a joke to break the ice at the party.", 2, sessions[7].id),
        ("Get along", "להסתדר עם", "I get along well with my colleagues.", 3, sessions[7].id),
        ("Drawback", "חיסרון", "The main drawback is the high cost.", 1, sessions[6].id),
    ]

    for word, heb, ctx, mastery, sid in vocab_data:
        v = VocabularyItem(
            user_id=user.id,
            session_id=sid,
            word_or_phrase=word,
            hebrew_translation=heb,
            source_context=ctx,
            mastery_level=mastery,
        )
        db.add(v)
    db.commit()
    print(f"✅ Created {len(vocab_data)} vocabulary items")

    # ── Mistake Patterns ─────────────────────────────────────────────────
    mistake_data = [
        # Prepositions (high frequency for Hebrew speakers)
        ("Prepositions", "I arrived to the office early.", "I arrived at the office early.", sessions[0].id),
        ("Prepositions", "I'm interested at this topic.", "I'm interested in this topic.", sessions[1].id),
        ("Prepositions", "We depend in good weather.", "We depend on good weather.", sessions[3].id),
        ("Prepositions", "I will meet you in Monday.", "I will meet you on Monday.", sessions[5].id),
        ("Prepositions", "She is good in math.", "She is good at math.", sessions[7].id),

        # Verb Tense
        ("Verb Tense", "I live here for 5 years.", "I have lived here for 5 years.", sessions[0].id),
        ("Verb Tense", "Yesterday I go to the store.", "Yesterday I went to the store.", sessions[1].id),
        ("Verb Tense", "I already finish the project.", "I have already finished the project.", sessions[3].id),

        # Hebrew Interference
        ("Hebrew Interference", "I did a mistake in the test.", "I made a mistake on the test.", sessions[2].id),
        ("Hebrew Interference", "It doesn't make sense to me, I mean it does sense.", "It makes sense to me.", sessions[3].id),
        ("Hebrew Interference", "I closed the light before sleeping.", "I turned off the light before sleeping.", sessions[5].id),
        ("Hebrew Interference", "Can you open the air conditioner?", "Can you turn on the air conditioner?", sessions[7].id),

        # Subject-Verb Agreement
        ("Subject-Verb Agreement", "The team are working hard.", "The team is working hard.", sessions[4].id),
        ("Subject-Verb Agreement", "Everyone have their own opinion.", "Everyone has their own opinion.", sessions[6].id),

        # Articles
        ("Articles", "I went to university yesterday.", "I went to the university yesterday.", sessions[1].id),
        ("Articles", "She is very good teacher.", "She is a very good teacher.", sessions[5].id),
        ("Articles", "Can you pass me salt?", "Can you pass me the salt?", sessions[7].id),

        # Vocabulary Misuse
        ("Vocabulary Misuse", "I want to do progress in English.", "I want to make progress in English.", sessions[2].id),
        ("Vocabulary Misuse", "He said me to come early.", "He told me to come early.", sessions[6].id),
    ]

    for cat, example, correction, sid in mistake_data:
        m = MistakePattern(
            user_id=user.id,
            session_id=sid,
            category=cat,
            example_from_transcript=example,
            correction=correction,
        )
        db.add(m)
    db.commit()
    print(f"✅ Created {len(mistake_data)} mistake patterns")

    db.close()
    print("\n🎉 Dashboard seed data complete!")


if __name__ == "__main__":
    seed()

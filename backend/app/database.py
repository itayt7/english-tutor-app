from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# SQLite requires check_same_thread=False; PostgreSQL does not support it
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Dependency – yields a DB session and guarantees it is closed afterwards
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

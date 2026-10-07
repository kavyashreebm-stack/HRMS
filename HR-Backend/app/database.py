import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 🔐 Load .env file
load_dotenv()

# PostgreSQL database URL — loaded from .env
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin123@localhost:5432/hr_onboarding"  # fallback default
)

# Engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Session (connection to DB)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()

# Dependency (used in APIs)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
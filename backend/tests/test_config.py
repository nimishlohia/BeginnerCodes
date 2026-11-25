import pytest
from app.core.config import Settings
from app.db.base import Base
from app.db.session import SessionLocal, get_db


def test_default_configuration_settings():
    """Verify default configuration values."""
    settings = Settings()
    assert settings.PROJECT_NAME == "LevelUp"
    assert settings.API_V1_PREFIX == "/api"
    assert "http://localhost:5173" in settings.ALLOWED_CORS_ORIGINS


def test_cors_origins_parsing_from_string():
    """Verify CORS origins string parsing."""
    settings = Settings(ALLOWED_CORS_ORIGINS='["http://example.com", "http://app.local"]')
    assert "http://example.com" in settings.ALLOWED_CORS_ORIGINS
    assert "http://app.local" in settings.ALLOWED_CORS_ORIGINS

    settings_comma = Settings(ALLOWED_CORS_ORIGINS="http://foo.com, http://bar.com")
    assert "http://foo.com" in settings_comma.ALLOWED_CORS_ORIGINS
    assert "http://bar.com" in settings_comma.ALLOWED_CORS_ORIGINS


def test_db_declarative_base():
    """Verify that SQLAlchemy Base metadata exists and registers the core Phase 2 tables."""
    import app.models  # Ensure models are loaded
    assert Base.metadata is not None
    assert "users" in Base.metadata.tables
    assert "user_profiles" in Base.metadata.tables
    assert "user_skills" in Base.metadata.tables
    assert "user_preferences" in Base.metadata.tables


def test_get_db_generator():
    """Verify that get_db yields a session and closes properly."""
    gen = get_db()
    session = next(gen)
    assert session is not None
    # Closing via generator exit
    with pytest.raises(StopIteration):
        next(gen)


def test_sqlite_connection():
    """Verify that SQLAlchemy connects to SQLite and executes a query."""
    from sqlalchemy import text
    from app.db.session import engine

    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1


def test_database_url_normalization():
    """Verify postgres:// and postgresql:// URLs normalize to psycopg v3."""
    s1 = Settings(DATABASE_URL="postgres://user:pass@host:5432/dbname")
    assert s1.DATABASE_URL == "postgresql+psycopg://user:pass@host:5432/dbname"

    s2 = Settings(DATABASE_URL="postgresql://user:pass@host:5432/dbname")
    assert s2.DATABASE_URL == "postgresql+psycopg://user:pass@host:5432/dbname"

    s3 = Settings(DATABASE_URL="sqlite:///./levelup.db")
    assert s3.DATABASE_URL == "sqlite:///./levelup.db"

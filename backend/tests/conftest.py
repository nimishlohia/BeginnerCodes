import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import sqlite3

from app.main import app
from app.db.session import get_db
from app.db.base import Base

# Import all model classes so they are registered on Base.metadata before
# create_all() is called.
from app.models.user import User  # noqa: F401
from app.models.profile import UserProfile  # noqa: F401
from app.models.skill import UserSkill  # noqa: F401
from app.models.preference import UserPreference  # noqa: F401
from app.models.challenge import CodingChallenge, ChallengeExample, ChallengeTestCase  # noqa: F401
from app.models.submission import CodeSubmission  # noqa: F401


# ---------------------------------------------------------------------------
# In-memory test database
#
# StaticPool ensures every connection call returns the SAME underlying
# connection, so that tables created in one session are visible in another.
# This is the canonical pattern for SQLite in-memory testing with SQLAlchemy.
# ---------------------------------------------------------------------------

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable FK constraints for the test database, mirroring production config.
@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# ---------------------------------------------------------------------------
# get_db override — used by the FastAPI dependency injection system.
# ---------------------------------------------------------------------------

def override_get_db():
    """Yields a session backed by the in-memory test database."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_test_db():
    """
    Drop and recreate all tables before each test so every test starts
    with a completely empty, isolated database.

    autouse=True means this runs automatically for every test in the suite.
    """
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    # Install the DB dependency override for the duration of every test.
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Session:
    """Provides a direct SQLAlchemy session bound to the test database."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
async def async_client():
    """
    Provides an asynchronous HTTP test client bound to the FastAPI application.
    The database dependency is already overridden by the autouse reset_test_db
    fixture, so every request hits the in-memory test database.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

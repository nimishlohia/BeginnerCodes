import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, event, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.user import User
from app.models.profile import UserProfile
from app.models.skill import UserSkill
from app.models.preference import UserPreference


@pytest.fixture
def test_db_session():
    """Provides an isolated in-memory SQLite database session with foreign key enforcement."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        import sqlite3
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


def test_user_creation_and_defaults(test_db_session):
    """Verify that a User can be created with UTC timestamps."""
    user = User(username="alice_coder", email="alice@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)

    assert user.id is not None
    assert user.username == "alice_coder"
    assert user.email == "alice@example.com"
    assert user.hashed_password == "hashed_test_password"
    assert isinstance(user.created_at, datetime)
    assert isinstance(user.updated_at, datetime)


def test_user_unique_username_constraint(test_db_session):
    """Verify that duplicate usernames are rejected by the database."""
    user1 = User(username="duplicate_user", email="user1@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user1)
    test_db_session.commit()

    user2 = User(username="duplicate_user", email="user2@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user2)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_user_unique_email_constraint(test_db_session):
    """Verify that duplicate emails are rejected by the database."""
    user1 = User(username="user_one", email="shared@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user1)
    test_db_session.commit()

    user2 = User(username="user_two", email="shared@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user2)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_user_profile_relationship_and_uniqueness(test_db_session):
    """Verify 1-to-1 relationship between User and UserProfile, and reject multiple profiles."""
    user = User(username="bob_dev", email="bob@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()

    profile = UserProfile(
        user=user,
        display_name="Bob Developer",
        bio="Full stack learner",
        avatar_url="https://example.com/avatar.png",
    )
    test_db_session.add(profile)
    test_db_session.commit()
    test_db_session.refresh(user)

    assert user.profile is not None
    assert user.profile.display_name == "Bob Developer"
    assert user.profile.user_id == user.id

    # Attempt second profile for the same user must fail
    profile2 = UserProfile(user_id=user.id, display_name="Bob Clone")
    test_db_session.add(profile2)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_user_skills_relationship_and_uniqueness(test_db_session):
    """Verify 1-to-many relationship and unique constraint on (user_id, skill_name)."""
    user = User(username="carol_coder", email="carol@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()

    skill1 = UserSkill(user=user, skill_name="Python", proficiency_level=3)
    skill2 = UserSkill(user=user, skill_name="TypeScript", proficiency_level=2)
    test_db_session.add_all([skill1, skill2])
    test_db_session.commit()
    test_db_session.refresh(user)

    assert len(user.skills) == 2
    assert {s.skill_name for s in user.skills} == {"Python", "TypeScript"}

    # Duplicate skill for same user must fail
    duplicate_skill = UserSkill(user_id=user.id, skill_name="Python", proficiency_level=4)
    test_db_session.add(duplicate_skill)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_user_skill_proficiency_range_constraint(test_db_session):
    """Verify that proficiency levels outside 1-5 are rejected by the check constraint."""
    user = User(username="dan_dev", email="dan@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()

    # Proficiency level 0 is invalid
    invalid_skill_low = UserSkill(user_id=user.id, skill_name="Rust", proficiency_level=0)
    test_db_session.add(invalid_skill_low)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    # Proficiency level 6 is invalid
    invalid_skill_high = UserSkill(user_id=user.id, skill_name="Rust", proficiency_level=6)
    test_db_session.add(invalid_skill_high)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    # Proficiency level 5 is valid
    valid_skill = UserSkill(user_id=user.id, skill_name="Rust", proficiency_level=5)
    test_db_session.add(valid_skill)
    test_db_session.commit()
    assert valid_skill.id is not None


def test_user_preference_relationship_and_difficulty_constraint(test_db_session):
    """Verify 1-to-1 preference relationship and allowed difficulty check constraint."""
    user = User(username="eve_engineer", email="eve@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()

    pref = UserPreference(
        user=user,
        preferred_programming_language="Python",
        preferred_difficulty="intermediate",
    )
    test_db_session.add(pref)
    test_db_session.commit()
    test_db_session.refresh(user)

    assert user.preferences is not None
    assert user.preferences.preferred_difficulty == "intermediate"

    # Attempt second preference record for same user must fail
    pref2 = UserPreference(user_id=user.id, preferred_difficulty="beginner")
    test_db_session.add(pref2)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    # Invalid difficulty must fail check constraint
    user2 = User(username="frank_dev", email="frank@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user2)
    test_db_session.commit()

    invalid_pref = UserPreference(user_id=user2.id, preferred_difficulty="extreme")
    test_db_session.add(invalid_pref)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_foreign_key_enforcement(test_db_session):
    """Verify that referencing nonexistent user_id is rejected by foreign key constraint."""
    orphan_profile = UserProfile(user_id=99999, display_name="Ghost")
    test_db_session.add(orphan_profile)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()


def test_cascade_delete_behavior(test_db_session):
    """Verify that deleting a User cascades and cleans up profile, skills, and preferences."""
    user = User(username="grace_dev", email="grace@example.com", hashed_password="hashed_test_password")
    test_db_session.add(user)
    test_db_session.commit()

    profile = UserProfile(user=user, display_name="Grace Hopper")
    skill = UserSkill(user=user, skill_name="COBOL", proficiency_level=5)
    preference = UserPreference(user=user, preferred_programming_language="COBOL")
    test_db_session.add_all([profile, skill, preference])
    test_db_session.commit()

    user_id = user.id
    profile_id = profile.id
    skill_id = skill.id
    pref_id = preference.id

    # Delete user
    test_db_session.delete(user)
    test_db_session.commit()

    # Verify no orphaned records exist
    assert test_db_session.get(User, user_id) is None
    assert test_db_session.get(UserProfile, profile_id) is None
    assert test_db_session.get(UserSkill, skill_id) is None
    assert test_db_session.get(UserPreference, pref_id) is None

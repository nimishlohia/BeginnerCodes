"""
Tests for CodeSubmission model.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.challenge import CodingChallenge
from app.models.submission import CodeSubmission
from app.models.user import User
from app.core.security import hash_password


def make_user(db_session, username="alice"):
    u = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("Password123"),
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def make_challenge(db_session, slug="two-sum"):
    ch = CodingChallenge(
        slug=slug,
        title="Two Sum",
        description="Desc",
        difficulty="Easy",
        topic="arrays",
        is_published=True,
    )
    db_session.add(ch)
    db_session.commit()
    db_session.refresh(ch)
    return ch


class TestCodeSubmission:
    def test_create_submission(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id,
            challenge_id=ch.id,
            language="python",
            source_code="print('hello')",
            status="PENDING",
        )
        db_session.add(sub)
        db_session.commit()
        db_session.refresh(sub)
        assert sub.id is not None
        assert sub.status == "PENDING"
        assert sub.result_summary is None
        assert sub.execution_time_ms is None

    def test_invalid_language_rejected(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id,
            challenge_id=ch.id,
            language="brainfuck",  # not in allowed list
            source_code="+++",
            status="PENDING",
        )
        db_session.add(sub)
        with pytest.raises(Exception):
            db_session.commit()

    def test_invalid_status_rejected(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id,
            challenge_id=ch.id,
            language="python",
            source_code="x = 1",
            status="HACKED",  # not in allowed list
        )
        db_session.add(sub)
        with pytest.raises(Exception):
            db_session.commit()

    def test_cascade_delete_on_user_delete(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id, challenge_id=ch.id,
            language="python", source_code="x", status="PENDING",
        )
        db_session.add(sub)
        db_session.commit()
        sub_id = sub.id
        db_session.delete(user)
        db_session.commit()
        assert db_session.get(CodeSubmission, sub_id) is None

    def test_cascade_delete_on_challenge_delete(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id, challenge_id=ch.id,
            language="python", source_code="x", status="PENDING",
        )
        db_session.add(sub)
        db_session.commit()
        sub_id = sub.id
        db_session.delete(ch)
        db_session.commit()
        assert db_session.get(CodeSubmission, sub_id) is None

    def test_user_relationship(self, db_session):
        user = make_user(db_session)
        ch = make_challenge(db_session)
        sub = CodeSubmission(
            user_id=user.id, challenge_id=ch.id,
            language="python", source_code="x", status="PENDING",
        )
        db_session.add(sub)
        db_session.commit()
        db_session.refresh(sub)
        assert sub.user.username == "alice"
        assert sub.challenge.slug == "two-sum"

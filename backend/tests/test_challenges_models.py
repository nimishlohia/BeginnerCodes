"""
Tests for CodingChallenge, ChallengeExample, and ChallengeTestCase models.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.challenge import CodingChallenge, ChallengeExample, ChallengeTestCase


def make_challenge(db_session, slug="two-sum", published=True):
    ch = CodingChallenge(
        slug=slug,
        title="Two Sum",
        description="Find two numbers that add up to target.",
        difficulty="Easy",
        topic="arrays",
        is_published=published,
    )
    db_session.add(ch)
    db_session.commit()
    db_session.refresh(ch)
    return ch


class TestCodingChallenge:
    def test_create_challenge(self, db_session):
        ch = make_challenge(db_session)
        assert ch.id is not None
        assert ch.slug == "two-sum"
        assert ch.difficulty == "Easy"
        assert ch.is_published is True
        assert ch.created_at is not None

    def test_slug_uniqueness_enforced(self, db_session):
        make_challenge(db_session, slug="unique-slug")
        with pytest.raises(IntegrityError):
            make_challenge(db_session, slug="unique-slug")

    def test_invalid_difficulty_rejected(self, db_session):
        ch = CodingChallenge(
            slug="bad-diff",
            title="Bad",
            description="x",
            difficulty="SuperHard",  # not in allowed values
            topic="misc",
            is_published=True,
        )
        db_session.add(ch)
        with pytest.raises(Exception):
            db_session.commit()

    def test_examples_relationship(self, db_session):
        ch = make_challenge(db_session)
        ex = ChallengeExample(
            challenge_id=ch.id,
            input_data="[2,7,11,15]\n9",
            expected_output="[0,1]",
            display_order=0,
        )
        db_session.add(ex)
        db_session.commit()
        db_session.refresh(ch)
        assert len(ch.examples) == 1
        assert ch.examples[0].input_data == "[2,7,11,15]\n9"

    def test_examples_cascade_delete(self, db_session):
        ch = make_challenge(db_session)
        ex = ChallengeExample(
            challenge_id=ch.id,
            input_data="a",
            expected_output="b",
            display_order=0,
        )
        db_session.add(ex)
        db_session.commit()
        example_id = ex.id
        db_session.delete(ch)
        db_session.commit()
        deleted_ex = db_session.get(ChallengeExample, example_id)
        assert deleted_ex is None

    def test_test_cases_relationship(self, db_session):
        ch = make_challenge(db_session)
        tc = ChallengeTestCase(
            challenge_id=ch.id,
            input_data="secret input",
            expected_output="secret output",
            is_sample=False,
            display_order=0,
        )
        db_session.add(tc)
        db_session.commit()
        db_session.refresh(ch)
        assert len(ch.test_cases) == 1
        assert ch.test_cases[0].is_sample is False

    def test_test_cases_cascade_delete(self, db_session):
        ch = make_challenge(db_session)
        tc = ChallengeTestCase(
            challenge_id=ch.id,
            input_data="x",
            expected_output="y",
            is_sample=True,
            display_order=0,
        )
        db_session.add(tc)
        db_session.commit()
        tc_id = tc.id
        db_session.delete(ch)
        db_session.commit()
        assert db_session.get(ChallengeTestCase, tc_id) is None

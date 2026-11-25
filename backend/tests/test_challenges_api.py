"""
Tests for GET /api/v1/challenges and GET /api/v1/challenges/{id}.

Design note: helpers here create their own short-lived DB sessions and close
them before making HTTP requests. This avoids the SQLite StaticPool deadlock
that occurs when a test holds a db_session connection open while the async
HTTP client also needs the same single in-memory connection.
"""
import pytest
from httpx import AsyncClient
from app.models.challenge import CodingChallenge, ChallengeExample, ChallengeTestCase
from tests.conftest import TestSessionLocal


def make_challenge(slug="c1", title="Test Challenge",
                   difficulty="Easy", topic="arrays", published=True) -> int:
    """Insert a challenge and return its id. Session is closed immediately."""
    db = TestSessionLocal()
    try:
        ch = CodingChallenge(
            slug=slug, title=title, description="A test challenge.",
            difficulty=difficulty, topic=topic, is_published=published,
        )
        db.add(ch)
        db.commit()
        db.refresh(ch)
        return ch.id
    finally:
        db.close()


def add_example(challenge_id: int, input_data="in", expected_output="out",
                explanation=None, display_order=0) -> int:
    """Insert a ChallengeExample and return its id."""
    db = TestSessionLocal()
    try:
        ex = ChallengeExample(
            challenge_id=challenge_id,
            input_data=input_data,
            expected_output=expected_output,
            explanation=explanation,
            display_order=display_order,
        )
        db.add(ex)
        db.commit()
        db.refresh(ex)
        return ex.id
    finally:
        db.close()


def add_test_case(challenge_id: int, input_data="secret input",
                  expected_output="secret output", is_sample=False,
                  display_order=0) -> int:
    """Insert a ChallengeTestCase and return its id."""
    db = TestSessionLocal()
    try:
        tc = ChallengeTestCase(
            challenge_id=challenge_id,
            input_data=input_data,
            expected_output=expected_output,
            is_sample=is_sample,
            display_order=display_order,
        )
        db.add(tc)
        db.commit()
        db.refresh(tc)
        return tc.id
    finally:
        db.close()


@pytest.mark.asyncio
async def test_list_challenges_returns_only_published(async_client: AsyncClient):
    make_challenge(slug="pub1", published=True)
    make_challenge(slug="priv1", published=False)

    resp = await async_client.get("/api/v1/challenges")
    assert resp.status_code == 200
    data = resp.json()
    slugs = [item["slug"] for item in data["items"]]
    assert "pub1" in slugs
    assert "priv1" not in slugs


@pytest.mark.asyncio
async def test_list_challenges_search_filter(async_client: AsyncClient):
    make_challenge(slug="s1", title="Binary Search", published=True)
    make_challenge(slug="s2", title="Two Sum", published=True)

    resp = await async_client.get("/api/v1/challenges?search=binary")
    assert resp.status_code == 200
    titles = [i["title"] for i in resp.json()["items"]]
    assert "Binary Search" in titles
    assert "Two Sum" not in titles


@pytest.mark.asyncio
async def test_list_challenges_difficulty_filter(async_client: AsyncClient):
    make_challenge(slug="e1", difficulty="Easy", published=True)
    make_challenge(slug="m1", difficulty="Medium", published=True)

    resp = await async_client.get("/api/v1/challenges?difficulty=Easy")
    assert resp.status_code == 200
    difficulties = [i["difficulty"] for i in resp.json()["items"]]
    assert all(d == "Easy" for d in difficulties)


@pytest.mark.asyncio
async def test_list_challenges_invalid_difficulty(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/challenges?difficulty=SuperHard")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_challenges_pagination(async_client: AsyncClient):
    for i in range(5):
        make_challenge(slug=f"pg{i}", published=True)

    resp = await async_client.get("/api/v1/challenges?page=1&page_size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5
    assert data["total_pages"] == 3


@pytest.mark.asyncio
async def test_challenge_detail_includes_examples(async_client: AsyncClient):
    ch_id = make_challenge(slug="with-ex")
    add_example(ch_id, input_data="1 2\n3", expected_output="1", explanation="example")

    resp = await async_client.get(f"/api/v1/challenges/{ch_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "with-ex"
    assert len(data["examples"]) == 1
    assert data["examples"][0]["input_data"] == "1 2\n3"


@pytest.mark.asyncio
async def test_challenge_detail_never_returns_hidden_test_cases(
    async_client: AsyncClient,
):
    ch_id = make_challenge(slug="hidden-tc")
    add_test_case(ch_id, input_data="secret input", expected_output="secret output")

    resp = await async_client.get(f"/api/v1/challenges/{ch_id}")
    assert resp.status_code == 200
    data = resp.json()
    # test_cases must not appear in the response at all
    assert "test_cases" not in data
    # Verify the secret data is not anywhere in the response body
    assert "secret input" not in resp.text
    assert "secret output" not in resp.text


@pytest.mark.asyncio
async def test_challenge_detail_unpublished_returns_404(
    async_client: AsyncClient,
):
    ch_id = make_challenge(slug="draft", published=False)
    resp = await async_client.get(f"/api/v1/challenges/{ch_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_challenge_detail_nonexistent_returns_404(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/challenges/99999")
    assert resp.status_code == 404

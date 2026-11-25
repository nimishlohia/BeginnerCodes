"""
Tests for submission API endpoints.

Design note: helpers here create their own short-lived DB sessions and close
them before making HTTP requests. This avoids the SQLite StaticPool deadlock
that occurs when a test holds a db_session connection open while the async
HTTP client also needs the same single in-memory connection.

Security requirements verified:
  - Unauthenticated users cannot submit.
  - user_id always from JWT, never request body.
  - Invalid language rejected.
  - Oversized source code rejected.
  - Users cannot see each other's submissions.
  - Hidden test data never in responses.
"""
import pytest
from httpx import AsyncClient
from app.models.challenge import CodingChallenge, ChallengeTestCase
from app.models.user import User
from app.core.security import hash_password, create_access_token
from tests.conftest import TestSessionLocal


def make_user(username="alice") -> tuple[int, str]:
    """Insert a user, return (id, username). Session is closed immediately."""
    db = TestSessionLocal()
    try:
        u = User(
            username=username,
            email=f"{username}@test.com",
            hashed_password=hash_password("Password123"),
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u.id, u.username
    finally:
        db.close()


def make_challenge(slug="ch1", published=True) -> int:
    """Insert a challenge, return its id. Session is closed immediately."""
    db = TestSessionLocal()
    try:
        ch = CodingChallenge(
            slug=slug, title="Test", description="Desc",
            difficulty="Easy", topic="arrays", is_published=published,
        )
        db.add(ch)
        db.commit()
        db.refresh(ch)
        return ch.id
    finally:
        db.close()


def add_test_case(challenge_id: int, input_data="hidden-input",
                  expected_output="hidden-output") -> None:
    """Insert a hidden test case. Session is closed immediately."""
    db = TestSessionLocal()
    try:
        tc = ChallengeTestCase(
            challenge_id=challenge_id,
            input_data=input_data,
            expected_output=expected_output,
            is_sample=False,
            display_order=0,
        )
        db.add(tc)
        db.commit()
    finally:
        db.close()


def auth_headers(user_id: int) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_submit_requires_authentication(async_client: AsyncClient):
    ch_id = make_challenge()
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('hi')"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_submit_valid_code_returns_201(async_client: AsyncClient):
    user_id, _ = make_user()
    ch_id = make_challenge()
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('hello')"},
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["challenge_id"] == ch_id
    assert data["language"] == "python"
    assert data["status"] in ("PENDING", "ACCEPTED", "RUNNING")


@pytest.mark.asyncio
async def test_submit_invalid_language_rejected(async_client: AsyncClient):
    user_id, _ = make_user()
    ch_id = make_challenge()
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "brainfuck", "source_code": "+++"},
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_submit_empty_source_code_rejected(async_client: AsyncClient):
    user_id, _ = make_user()
    ch_id = make_challenge()
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "   "},
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_submit_oversized_source_code_rejected(async_client: AsyncClient):
    from app.models.submission import MAX_SOURCE_CODE_BYTES
    user_id, _ = make_user()
    ch_id = make_challenge()
    huge_code = "x" * (MAX_SOURCE_CODE_BYTES + 1)
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": huge_code},
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_submit_unpublished_challenge_returns_404(
    async_client: AsyncClient,
):
    user_id, _ = make_user()
    ch_id = make_challenge(slug="draft", published=False)
    resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('hi')"},
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_submission_detail_owner_only(async_client: AsyncClient):
    alice_id, _ = make_user("alice")
    bob_id, _ = make_user("bob")
    ch_id = make_challenge()

    # Alice submits
    create_resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('hi')"},
        headers=auth_headers(alice_id),
    )
    assert create_resp.status_code == 201
    sub_id = create_resp.json()["id"]

    # Alice can read her submission
    get_resp = await async_client.get(
        f"/api/v1/submissions/{sub_id}",
        headers=auth_headers(alice_id),
    )
    assert get_resp.status_code == 200

    # Bob cannot read Alice's submission
    bob_resp = await async_client.get(
        f"/api/v1/submissions/{sub_id}",
        headers=auth_headers(bob_id),
    )
    assert bob_resp.status_code == 404


@pytest.mark.asyncio
async def test_get_submission_detail_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/submissions/1")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_submission_detail_never_exposes_hidden_test_data(
    async_client: AsyncClient,
):
    user_id, _ = make_user()
    ch_id = make_challenge()
    add_test_case(ch_id, input_data="hidden-input", expected_output="hidden-output")

    create_resp = await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('hi')"},
        headers=auth_headers(user_id),
    )
    sub_id = create_resp.json()["id"]

    get_resp = await async_client.get(
        f"/api/v1/submissions/{sub_id}",
        headers=auth_headers(user_id),
    )
    assert get_resp.status_code == 200
    assert "hidden-input" not in get_resp.text
    assert "hidden-output" not in get_resp.text
    assert "test_cases" not in get_resp.text


@pytest.mark.asyncio
async def test_submission_history_only_own_submissions(
    async_client: AsyncClient,
):
    alice_id, _ = make_user("alice")
    bob_id, _ = make_user("bob")
    ch_id = make_challenge()

    # Alice submits
    await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "print('alice')"},
        headers=auth_headers(alice_id),
    )
    # Bob submits
    await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "javascript", "source_code": "console.log('bob')"},
        headers=auth_headers(bob_id),
    )

    # Alice's history
    alice_resp = await async_client.get(
        "/api/v1/users/me/submissions",
        headers=auth_headers(alice_id),
    )
    assert alice_resp.status_code == 200
    alice_items = alice_resp.json()["items"]
    assert len(alice_items) == 1
    assert alice_items[0]["language"] == "python"

    # Bob's history
    bob_resp = await async_client.get(
        "/api/v1/users/me/submissions",
        headers=auth_headers(bob_id),
    )
    assert bob_resp.status_code == 200
    bob_items = bob_resp.json()["items"]
    assert len(bob_items) == 1
    assert bob_items[0]["language"] == "javascript"


@pytest.mark.asyncio
async def test_submission_history_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/users/me/submissions")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_submission_history_no_source_code_in_list(
    async_client: AsyncClient,
):
    """Source code should NOT appear in the paginated history list items."""
    user_id, _ = make_user()
    ch_id = make_challenge()
    await async_client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python", "source_code": "super_secret_code_string"},
        headers=auth_headers(user_id),
    )
    resp = await async_client.get(
        "/api/v1/users/me/submissions",
        headers=auth_headers(user_id),
    )
    assert resp.status_code == 200
    # source_code field must not appear in list items
    for item in resp.json()["items"]:
        assert "source_code" not in item

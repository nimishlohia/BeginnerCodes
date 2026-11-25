from datetime import timedelta
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token


@pytest.fixture
async def auth_headers(async_client: AsyncClient):
    """Register and log in a user, returning valid authorization headers and user data."""
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "api_user",
            "email": "api_user@example.com",
            "password": "Password12345",
        },
    )
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "api_user", "password": "Password12345"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def second_auth_headers(async_client: AsyncClient):
    """Register and log in a second distinct user for isolation tests."""
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "second_user",
            "email": "second_user@example.com",
            "password": "Password12345",
        },
    )
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "second_user", "password": "Password12345"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_jwt_validation_and_failures(async_client: AsyncClient):
    """Verify that missing, expired, and malformed JWTs produce 401 Unauthorized."""
    # Missing token
    resp_no_token = await async_client.get("/api/v1/users/me")
    assert resp_no_token.status_code == 401

    # Malformed token
    resp_bad = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert resp_bad.status_code == 401

    # Expired token
    expired_token = create_access_token(subject=1, expires_delta=timedelta(seconds=-10))
    resp_expired = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp_expired.status_code == 401
    assert "Token has expired" in resp_expired.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_user_me(async_client: AsyncClient, auth_headers: dict):
    """Verify GET /api/v1/users/me returns authenticated user details."""
    response = await async_client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "api_user"
    assert data["email"] == "api_user@example.com"
    assert "profile" in data
    assert "skills" in data
    assert "preferences" in data


@pytest.mark.asyncio
async def test_profile_retrieval_and_partial_update(async_client: AsyncClient, auth_headers: dict):
    """Verify GET and PATCH /api/v1/users/me/profile."""
    # Read profile
    get_resp = await async_client.get("/api/v1/users/me/profile", headers=auth_headers)
    assert get_resp.status_code == 200

    # Partially update bio only
    patch_resp = await async_client.patch(
        "/api/v1/users/me/profile",
        headers=auth_headers,
        json={"bio": "Learning Rust and Python concurrency"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["bio"] == "Learning Rust and Python concurrency"
    assert data["display_name"] == "api_user"  # Preserved omitted field


@pytest.mark.asyncio
async def test_skills_crud_and_isolation(
    async_client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
):
    """Verify skill creation, list, update, duplicate rejection, and cross-user isolation."""
    # Add skill
    create_resp = await async_client.post(
        "/api/v1/users/me/skills",
        headers=auth_headers,
        json={"skill_name": "Python", "proficiency_level": 4},
    )
    assert create_resp.status_code == 201
    skill_data = create_resp.json()
    skill_id = skill_data["id"]
    assert skill_data["skill_name"] == "Python"
    assert skill_data["proficiency_level"] == 4

    # Duplicate skill rejection
    dup_resp = await async_client.post(
        "/api/v1/users/me/skills",
        headers=auth_headers,
        json={"skill_name": "Python", "proficiency_level": 5},
    )
    assert dup_resp.status_code == 409

    # Invalid proficiency level
    invalid_resp = await async_client.post(
        "/api/v1/users/me/skills",
        headers=auth_headers,
        json={"skill_name": "Go", "proficiency_level": 10},
    )
    assert invalid_resp.status_code == 422

    # Update skill proficiency
    update_resp = await async_client.patch(
        f"/api/v1/users/me/skills/{skill_id}",
        headers=auth_headers,
        json={"proficiency_level": 5},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["proficiency_level"] == 5

    # Cross-user isolation: second user CANNOT modify or delete first user's skill
    attack_resp = await async_client.delete(
        f"/api/v1/users/me/skills/{skill_id}",
        headers=second_auth_headers,
    )
    assert attack_resp.status_code == 404

    # Delete own skill
    delete_resp = await async_client.delete(
        f"/api/v1/users/me/skills/{skill_id}",
        headers=auth_headers,
    )
    assert delete_resp.status_code == 204

    # Verify skill is removed
    list_resp = await async_client.get("/api/v1/users/me/skills", headers=auth_headers)
    assert all(s["id"] != skill_id for s in list_resp.json())


@pytest.mark.asyncio
async def test_preferences_get_and_update(async_client: AsyncClient, auth_headers: dict):
    """Verify GET and PATCH /api/v1/users/me/preferences."""
    # Initial preferences
    get_resp = await async_client.get("/api/v1/users/me/preferences", headers=auth_headers)
    assert get_resp.status_code == 200

    # Update preferences
    update_resp = await async_client.patch(
        "/api/v1/users/me/preferences",
        headers=auth_headers,
        json={
            "preferred_programming_language": "TypeScript",
            "preferred_difficulty": "intermediate",
        },
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["preferred_programming_language"] == "TypeScript"
    assert data["preferred_difficulty"] == "intermediate"

    # Reject invalid difficulty
    invalid_resp = await async_client.patch(
        "/api/v1/users/me/preferences",
        headers=auth_headers,
        json={"preferred_difficulty": "godmode"},
    )
    assert invalid_resp.status_code == 422

import pytest
from httpx import AsyncClient
from app.core.security import verify_password


@pytest.mark.asyncio
async def test_successful_user_registration(async_client: AsyncClient):
    """Verify that a user can register and receive a sanitized response."""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "coder_jane",
            "email": "jane@example.com",
            "password": "SuperSecretPassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "coder_jane"
    assert data["email"] == "jane@example.com"
    assert "id" in data
    # Password hash must NEVER be in response
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_duplicate_username_registration_rejected(async_client: AsyncClient):
    """Verify that registering with an existing username returns 409 Conflict."""
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "unique_dev",
            "email": "dev1@example.com",
            "password": "Password12345",
        },
    )
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "unique_dev",
            "email": "dev2@example.com",
            "password": "Password12345",
        },
    )
    assert response.status_code == 409
    assert "Username is already taken" in response.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_email_registration_rejected(async_client: AsyncClient):
    """Verify that registering with an existing email returns 409 Conflict."""
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "user_alpha",
            "email": "shared_email@example.com",
            "password": "Password12345",
        },
    )
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "user_beta",
            "email": "shared_email@example.com",
            "password": "Password12345",
        },
    )
    assert response.status_code == 409
    assert "Email is already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_registration_validation_rules(async_client: AsyncClient):
    """Verify that invalid emails and short passwords fail with 422."""
    # Invalid email
    resp1 = await async_client.post(
        "/api/v1/auth/register",
        json={"username": "test_user", "email": "not-an-email", "password": "Password123"},
    )
    assert resp1.status_code == 422

    # Password too short (< 8 chars)
    resp2 = await async_client.post(
        "/api/v1/auth/register",
        json={"username": "test_user", "email": "valid@example.com", "password": "short"},
    )
    assert resp2.status_code == 422


@pytest.mark.asyncio
async def test_successful_login_with_username_and_email(async_client: AsyncClient):
    """Verify that login works using either username or email and returns a valid JWT."""
    # Register user
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "login_tester",
            "email": "login_tester@example.com",
            "password": "ValidPassword123",
        },
    )

    # Login with username
    resp_user = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "login_tester", "password": "ValidPassword123"},
    )
    assert resp_user.status_code == 200
    data_user = resp_user.json()
    assert "access_token" in data_user
    assert data_user["token_type"] == "bearer"
    assert data_user["user"]["username"] == "login_tester"

    # Login with email
    resp_email = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "login_tester@example.com", "password": "ValidPassword123"},
    )
    assert resp_email.status_code == 200
    assert "access_token" in resp_email.json()


@pytest.mark.asyncio
async def test_login_invalid_password_and_unknown_identifier(async_client: AsyncClient):
    """Verify that invalid credentials produce generic 401 Unauthorized errors."""
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "secure_user",
            "email": "secure@example.com",
            "password": "CorrectPassword123",
        },
    )

    # Wrong password
    resp1 = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "secure_user", "password": "WrongPassword"},
    )
    assert resp1.status_code == 401
    assert "Invalid username/email or password" in resp1.json()["detail"]

    # Unknown user
    resp2 = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "nonexistent_person", "password": "AnyPassword123"},
    )
    assert resp2.status_code == 401
    assert "Invalid username/email or password" in resp2.json()["detail"]

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_status_and_structure(async_client: AsyncClient):
    """Verify that GET /api/health responds with 200 and expected JSON structure."""
    response = await async_client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "LevelUp"
    assert "version" in data
    assert "environment" in data
    # Ensure sensitive credentials or internal paths are never exposed
    assert "password" not in data
    assert "secret" not in data
    assert "database" not in data


@pytest.mark.asyncio
async def test_openapi_schema_accessible(async_client: AsyncClient):
    """Verify that OpenAPI schema JSON is available and correctly titled."""
    response = await async_client.get("/openapi.json")
    assert response.status_code == 200

    schema = response.json()
    assert schema["info"]["title"] == "LevelUp"
    assert "/api/health" in schema["paths"]


@pytest.mark.asyncio
async def test_spa_fallback_and_api_404(tmp_path, monkeypatch):
    """Verify FastAPI serves built SPA routes while unknown /api/* paths return 404."""
    from httpx import ASGITransport
    from app.core.config import settings
    from app.main import create_application

    dist_dir = tmp_path / "dist"
    (dist_dir / "assets").mkdir(parents=True)
    (dist_dir / "index.html").write_text("<html><body>LevelUp SPA</body></html>", encoding="utf-8")
    (dist_dir / "assets" / "app.js").write_text("console.log('ok');", encoding="utf-8")

    monkeypatch.setattr(settings, "FRONTEND_DIST_DIR", str(dist_dir))
    spa_app = create_application()

    async with AsyncClient(
        transport=ASGITransport(app=spa_app),
        base_url="http://testserver",
    ) as client:
        root_resp = await client.get("/")
        assert root_resp.status_code == 200
        assert "LevelUp SPA" in root_resp.text

        route_resp = await client.get("/challenges/1")
        assert route_resp.status_code == 200
        assert "LevelUp SPA" in route_resp.text

        asset_resp = await client.get("/assets/app.js")
        assert asset_resp.status_code == 200
        assert "console.log('ok')" in asset_resp.text

        api_missing = await client.get("/api/nonexistent-route")
        assert api_missing.status_code == 404

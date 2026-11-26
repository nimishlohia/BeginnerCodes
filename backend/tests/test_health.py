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
async def test_spa_fallback_and_api_404(tmp_path, monkeypatch, db_session):
    """Verify FastAPI serves built SPA routes with initial HTML SEO and 404s unknown /api/*."""
    from httpx import ASGITransport
    from app.core.config import settings
    from app.db.session import get_db
    from app.main import create_application
    from app.models.challenge import CodingChallenge

    challenge = CodingChallenge(
        slug="two-sum-seo",
        title="Two Sum",
        description="Given an array of integers nums and an integer target.",
        difficulty="Easy",
        topic="arrays",
        is_published=True,
    )
    unpublished = CodingChallenge(
        slug="secret-draft",
        title="Secret Draft",
        description="Should not be exposed in initial HTML.",
        difficulty="Hard",
        topic="graphs",
        is_published=False,
    )
    db_session.add_all([challenge, unpublished])
    db_session.commit()
    db_session.refresh(challenge)
    db_session.refresh(unpublished)

    dist_dir = tmp_path / "dist"
    (dist_dir / "assets").mkdir(parents=True)
    (dist_dir / "index.html").write_text(
        "<!doctype html><html><head><!-- SEO_HEAD_START --><title>Fallback</title><!-- SEO_HEAD_END --></head>"
        "<body>LevelUp SPA</body></html>",
        encoding="utf-8",
    )
    (dist_dir / "assets" / "app.js").write_text("console.log('ok');", encoding="utf-8")
    (dist_dir / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")

    monkeypatch.setattr(settings, "FRONTEND_DIST_DIR", str(dist_dir))
    spa_app = create_application()
    spa_app.dependency_overrides[get_db] = lambda: db_session

    async with AsyncClient(
        transport=ASGITransport(app=spa_app),
        base_url="http://testserver",
    ) as client:
        root_resp = await client.get("/")
        assert root_resp.status_code == 200
        assert "<title>Peer-Based Coding Practice and Programming Challenges | LevelUp</title>" in root_resp.text
        assert 'href="https://www.beginnercodes.online/"' in root_resp.text
        assert '"@type": "Organization"' in root_resp.text

        challenges_resp = await client.get("/challenges")
        assert challenges_resp.status_code == 200
        assert "<title>Coding Challenges for Beginners | LevelUp</title>" in challenges_resp.text
        assert 'href="https://www.beginnercodes.online/challenges"' in challenges_resp.text
        assert '"@type": "BreadcrumbList"' in challenges_resp.text

        detail_resp = await client.get(f"/challenges/{challenge.id}")
        assert detail_resp.status_code == 200
        assert "<title>Two Sum - arrays Coding Challenge | LevelUp</title>" in detail_resp.text
        assert f'href="https://www.beginnercodes.online/challenges/{challenge.id}"' in detail_resp.text
        assert 'property="og:type" content="article"' in detail_resp.text
        assert 'name="twitter:title" content="Two Sum - arrays Coding Challenge | LevelUp"' in detail_resp.text

        unpub_resp = await client.get(f"/challenges/{unpublished.id}")
        assert unpub_resp.status_code == 200
        assert "Secret Draft" not in unpub_resp.text
        assert 'content="noindex, nofollow"' in unpub_resp.text

        for private_path in ("/login", "/register", "/dashboard", "/submissions"):
            priv_resp = await client.get(private_path)
            assert priv_resp.status_code == 200
            assert 'content="noindex, nofollow"' in priv_resp.text
            assert f'href="https://www.beginnercodes.online{private_path}"' in priv_resp.text

        robots_resp = await client.get("/robots.txt")
        assert robots_resp.status_code == 200
        assert "User-agent: *" in robots_resp.text

        asset_resp = await client.get("/assets/app.js")
        assert asset_resp.status_code == 200
        assert "console.log('ok')" in asset_resp.text

        api_missing = await client.get("/api/nonexistent-route")
        assert api_missing.status_code == 404

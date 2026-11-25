from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api import api_router


def _resolve_frontend_dist() -> Path:
    """Return the built frontend dist directory path."""
    if settings.FRONTEND_DIST_DIR:
        return Path(settings.FRONTEND_DIST_DIR).resolve()
    return (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()


def _mount_frontend_spa(application: FastAPI) -> None:
    """Serve built Vite assets and SPA routes from FastAPI when frontend/dist exists."""
    frontend_dist = _resolve_frontend_dist()
    index_file = frontend_dist / "index.html"
    if not index_file.is_file():
        return

    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        application.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="frontend-assets",
        )

    api_prefix = settings.API_V1_PREFIX.strip("/")

    @application.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if api_prefix and (
            full_path == api_prefix or full_path.startswith(f"{api_prefix}/")
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (frontend_dist / full_path).resolve()
            if candidate.is_relative_to(frontend_dist) and candidate.is_file():
                return FileResponse(candidate)

        return FileResponse(index_file)


def create_application() -> FastAPI:
    """Factory function to configure and initialize the FastAPI application."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )

    # CORS configuration
    if settings.ALLOWED_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=settings.ALLOWED_CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Mount API routes under configured prefix (defaults to /api)
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)
    _mount_frontend_spa(application)

    return application

app = create_application()

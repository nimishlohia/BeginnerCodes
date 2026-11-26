from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.seo import inject_seo_head, render_seo_head, resolve_page_metadata
from app.api import api_router
from app.db.session import get_db

_CSP_REPORT_ONLY = (
    "default-src 'self'; "
    "script-src 'self' https://www.googletagmanager.com 'sha256-WFRMLsMGdvJeEZAYZrUympeBpc2cT0AELK1vPulFTTM='; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; "
    "font-src 'self'; "
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; "
    "object-src 'none'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)


def _resolve_frontend_dist() -> Path:
    """Return the built frontend dist directory path."""
    if settings.FRONTEND_DIST_DIR:
        return Path(settings.FRONTEND_DIST_DIR).resolve()
    return (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()


def _mount_frontend_spa(application: FastAPI) -> None:
    """Serve built Vite assets and SPA routes with route-specific initial HTML SEO."""
    frontend_dist = _resolve_frontend_dist()
    index_file = frontend_dist / "index.html"
    if not index_file.is_file():
        return

    index_template = index_file.read_text(encoding="utf-8")

    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        application.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="frontend-assets",
        )

    api_prefix = settings.API_V1_PREFIX.strip("/")

    @application.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str, db: Session = Depends(get_db)):
        if api_prefix and (
            full_path == api_prefix or full_path.startswith(f"{api_prefix}/")
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (frontend_dist / full_path).resolve()
            if candidate.is_relative_to(frontend_dist) and candidate.is_file():
                headers = {}
                if full_path in ("robots.txt", "sitemap.xml"):
                    headers["Cache-Control"] = "public, max-age=3600"
                return FileResponse(candidate, headers=headers)

            if full_path == "favicon.ico":
                return Response(
                    status_code=204,
                    headers={"Cache-Control": "public, max-age=86400"},
                )

        metadata = resolve_page_metadata(full_path, db)
        rendered_html = inject_seo_head(index_template, render_seo_head(metadata))
        return HTMLResponse(
            content=rendered_html,
            headers={"Cache-Control": "no-cache"},
        )


def create_application() -> FastAPI:
    """Factory function to configure and initialize the FastAPI application."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )

    @application.middleware("http")
    async def add_security_and_cache_headers(request: Request, call_next):
        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )

        # Skip CSP on interactive API docs paths in DEBUG mode
        if request.url.path not in ("/docs", "/redoc", "/openapi.json"):
            response.headers.setdefault(
                "Content-Security-Policy-Report-Only",
                _CSP_REPORT_ONLY,
            )

        # Enable HSTS only when request arrived over HTTPS (Render/Cloudflare edge)
        forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
        if request.url.scheme == "https" or forwarded_proto == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000",
            )

        # Hashed Vite assets can be cached immutably for 1 year
        if request.url.path.startswith("/assets/") and response.status_code in (200, 304):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

        return response

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

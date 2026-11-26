"""Server-side initial HTML SEO metadata helpers for public and private SPA routes."""

from dataclasses import dataclass, field
import html
import json
from typing import Any, Sequence
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.challenge import CodingChallenge

SITE_NAME = "LevelUp"
SITE_URL = "https://www.beginnercodes.online"
SEO_HEAD_START = "<!-- SEO_HEAD_START -->"
SEO_HEAD_END = "<!-- SEO_HEAD_END -->"


@dataclass(frozen=True)
class PageMetadata:
    """Resolved SEO head metadata for a single route."""

    title: str
    description: str
    canonical_url: str
    robots: str = "index, follow"
    og_type: str = "website"
    include_social: bool = True
    structured_data: Sequence[dict[str, Any]] = field(default_factory=tuple)


_STATIC_NOINDEX_ROUTES: dict[str, tuple[str, str]] = {
    "/login": (
        "Sign In",
        "Sign in to your LevelUp account to solve coding challenges and track your learning progress.",
    ),
    "/register": (
        "Create Account",
        "Create a LevelUp account to practise coding challenges alongside peers at your skill level.",
    ),
    "/dashboard": (
        "Dashboard",
        "Manage your LevelUp profile, programming skills and learning preferences.",
    ),
    "/submissions": (
        "My Submissions",
        "View your personal coding challenge submission history and evaluation summaries on LevelUp.",
    ),
}


def _canonical(path: str) -> str:
    if path == "/":
        return f"{SITE_URL}/"
    return f"{SITE_URL}{path}"


def _home_metadata() -> PageMetadata:
    description = (
        "Structured programming practice for beginners on LevelUp. Explore starter "
        "coding questions, Python beginner guides, and peer-aligned learning in India."
    )
    return PageMetadata(
        title=f"Programming Practice for Beginners & Coding Challenges | {SITE_NAME}",
        description=description,
        canonical_url=_canonical("/"),
        robots="index, follow",
        og_type="website",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": SITE_NAME,
                "url": SITE_URL,
                "description": (
                    "Skill-aligned, peer-based coding practice in a friendly, "
                    "supportive environment."
                ),
            },
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": SITE_NAME,
                "url": SITE_URL,
                "description": description,
            },
        ),
    )


def _about_metadata() -> PageMetadata:
    return PageMetadata(
        title=f"About Us - Friendly Coding Practice Platform | {SITE_NAME}",
        description=(
            "Discover LevelUp, a beginner-friendly platform for programming practice, "
            "coding challenges, and building problem-solving skills step by step."
        ),
        canonical_url=_canonical("/about"),
        robots="index, follow",
        og_type="website",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": _canonical("/"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "About Us",
                        "item": _canonical("/about"),
                    },
                ],
            },
        ),
    )


def _blog_index_metadata() -> PageMetadata:
    return PageMetadata(
        title=f"Blog - Beginner Programming Guides & Practice Tips | {SITE_NAME}",
        description=(
            "Read practical beginner programming guides on LevelUp. Learn Python basics, "
            "starter coding questions, and step-by-step problem-solving habits."
        ),
        canonical_url=_canonical("/blog"),
        robots="index, follow",
        og_type="website",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": _canonical("/"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Blog",
                        "item": _canonical("/blog"),
                    },
                ],
            },
        ),
    )


def _blog_article_metadata() -> PageMetadata:
    article_path = "/blog/how-to-start-learning-programming-as-a-beginner"
    article_url = _canonical(article_path)
    seo_title = f"How to Start Programming as a Beginner | {SITE_NAME}"
    headline = (
        "How to Start Learning Programming as a Beginner: "
        "Basics, Python Practice & Next Steps"
    )
    description = (
        "Learn programming as a beginner with practical steps, Python examples, "
        "coding practice questions, and a simple daily learning routine."
    )
    return PageMetadata(
        title=seo_title,
        description=description,
        canonical_url=article_url,
        robots="index, follow",
        og_type="article",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": headline,
                "description": description,
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": article_url,
                },
                "author": {
                    "@type": "Organization",
                    "name": SITE_NAME,
                    "url": SITE_URL,
                },
                "publisher": {
                    "@type": "Organization",
                    "name": SITE_NAME,
                    "url": SITE_URL,
                },
                "datePublished": "2026-11-26",
                "dateModified": "2026-11-26",
                "inLanguage": "en-IN",
            },
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": _canonical("/"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Blog",
                        "item": _canonical("/blog"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": "How to Start Learning Programming as a Beginner",
                        "item": article_url,
                    },
                ],
            },
        ),
    )


def _challenges_list_metadata() -> PageMetadata:
    return PageMetadata(
        title=f"Coding Challenges for Beginners | {SITE_NAME}",
        description=(
            "Explore programming challenges on LevelUp. Browse coding problems by difficulty, "
            "practise problem-solving and improve your programming skills."
        ),
        canonical_url=_canonical("/challenges"),
        robots="index, follow",
        og_type="website",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": _canonical("/"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Challenges",
                        "item": _canonical("/challenges"),
                    },
                ],
            },
        ),
    )


def _challenge_not_found_metadata(path: str) -> PageMetadata:
    return PageMetadata(
        title=f"Challenge Not Found | {SITE_NAME}",
        description="The requested coding challenge could not be found on LevelUp.",
        canonical_url=_canonical(path),
        robots="noindex, nofollow",
        include_social=False,
    )


def _challenge_detail_metadata(raw_id: str, db: Session) -> PageMetadata:
    if not raw_id.isdigit():
        return _challenge_not_found_metadata("/challenges")

    challenge_id = int(raw_id)
    try:
        challenge = db.execute(
            select(CodingChallenge).where(
                CodingChallenge.id == challenge_id,
                CodingChallenge.is_published.is_(True),
            )
        ).scalar_one_or_none()
    except SQLAlchemyError:
        return _challenge_not_found_metadata(f"/challenges/{challenge_id}")

    if challenge is None:
        return _challenge_not_found_metadata(f"/challenges/{challenge_id}")

    clean_desc = " ".join(challenge.description.split())[:145]
    canonical_url = _canonical(f"/challenges/{challenge.id}")
    return PageMetadata(
        title=f"{challenge.title} - {challenge.topic} Coding Challenge | {SITE_NAME}",
        description=(
            f"{clean_desc}. Practise this {challenge.difficulty.lower()} "
            f"{challenge.topic} coding challenge on LevelUp and improve your programming skills."
        ),
        canonical_url=canonical_url,
        robots="index, follow",
        og_type="article",
        include_social=True,
        structured_data=(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": _canonical("/"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Challenges",
                        "item": _canonical("/challenges"),
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": challenge.title,
                        "item": canonical_url,
                    },
                ],
            },
        ),
    )


def resolve_page_metadata(route_path: str, db: Session) -> PageMetadata:
    """Resolve route-specific SEO metadata from the request path and database."""
    normalized = "/" + route_path.strip("/") if route_path.strip("/") else "/"

    if normalized == "/":
        return _home_metadata()

    if normalized == "/about":
        return _about_metadata()

    if normalized == "/blog":
        return _blog_index_metadata()

    if normalized == "/blog/how-to-start-learning-programming-as-a-beginner":
        return _blog_article_metadata()

    if normalized == "/challenges":
        return _challenges_list_metadata()

    if normalized.startswith("/challenges/"):
        raw_id = normalized[len("/challenges/"):]
        if "/" not in raw_id and raw_id:
            return _challenge_detail_metadata(raw_id, db)

    if normalized in _STATIC_NOINDEX_ROUTES:
        page_title, description = _STATIC_NOINDEX_ROUTES[normalized]
        return PageMetadata(
            title=f"{page_title} | {SITE_NAME}",
            description=description,
            canonical_url=_canonical(normalized),
            robots="noindex, nofollow",
            include_social=False,
        )

    return PageMetadata(
        title=f"Page Not Found | {SITE_NAME}",
        description="The requested page could not be found on LevelUp.",
        canonical_url=_canonical(normalized),
        robots="noindex, nofollow",
        include_social=False,
    )


def render_seo_head(meta: PageMetadata) -> str:
    """Render escaped HTML head tags with data-rh='true' for React Helmet compatibility."""
    title_esc = html.escape(meta.title, quote=True)
    desc_esc = html.escape(meta.description, quote=True)
    canonical_esc = html.escape(meta.canonical_url, quote=True)
    robots_esc = html.escape(meta.robots, quote=True)

    lines = [
        f"<title>{title_esc}</title>",
        f'<meta name="description" content="{desc_esc}" data-rh="true" />',
        f'<link rel="canonical" href="{canonical_esc}" data-rh="true" />',
        f'<meta name="robots" content="{robots_esc}" data-rh="true" />',
    ]

    if meta.include_social:
        og_type_esc = html.escape(meta.og_type, quote=True)
        site_name_esc = html.escape(SITE_NAME, quote=True)
        lines.extend(
            [
                f'<meta property="og:type" content="{og_type_esc}" data-rh="true" />',
                f'<meta property="og:title" content="{title_esc}" data-rh="true" />',
                f'<meta property="og:description" content="{desc_esc}" data-rh="true" />',
                f'<meta property="og:url" content="{canonical_esc}" data-rh="true" />',
                f'<meta property="og:site_name" content="{site_name_esc}" data-rh="true" />',
                '<meta property="og:locale" content="en_US" data-rh="true" />',
                '<meta name="twitter:card" content="summary" data-rh="true" />',
                f'<meta name="twitter:title" content="{title_esc}" data-rh="true" />',
                f'<meta name="twitter:description" content="{desc_esc}" data-rh="true" />',
            ]
        )

    for schema in meta.structured_data:
        json_payload = json.dumps(schema).replace("</", "<\\/")
        lines.append(
            f'<script type="application/ld+json" data-rh="true">{json_payload}</script>'
        )

    return "\n    ".join(lines)


def inject_seo_head(html_text: str, head_markup: str) -> str:
    """Replace the SEO head block in built index.html without touching asset links."""
    start_idx = html_text.find(SEO_HEAD_START)
    end_idx = html_text.find(SEO_HEAD_END)
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        end_idx += len(SEO_HEAD_END)
        return f"{html_text[:start_idx]}{head_markup}{html_text[end_idx:]}"

    close_head_idx = html_text.lower().find("</head>")
    if close_head_idx != -1:
        return f"{html_text[:close_head_idx]}{head_markup}\n  {html_text[close_head_idx:]}"

    return html_text

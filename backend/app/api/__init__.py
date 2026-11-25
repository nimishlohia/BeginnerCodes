from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.challenges import router as challenges_router
from app.api.submissions import router as submissions_router

api_router = APIRouter()
api_router.include_router(health_router)

# v1 routes
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(auth_router)
v1_router.include_router(users_router)
v1_router.include_router(challenges_router)
v1_router.include_router(submissions_router)

api_router.include_router(v1_router)

# Also mount unversioned aliases for developer convenience
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(challenges_router)
api_router.include_router(submissions_router)

__all__ = ["api_router"]

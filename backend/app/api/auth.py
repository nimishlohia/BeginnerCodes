from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.models.preference import UserPreference
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Register a new user account with Argon2id password hashing."""
    # Check for existing username (case-insensitive)
    existing_username = db.execute(
        select(User).where(func.lower(User.username) == data.username.lower())
    ).scalar_one_or_none()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )

    # Check for existing email (case-insensitive)
    existing_email = db.execute(
        select(User).where(func.lower(User.email) == data.email.lower())
    ).scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    hashed_pw = hash_password(data.password)

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hashed_pw,
    )

    # Attach initial empty profile and preference records
    user.profile = UserProfile(display_name=data.username)
    user.preferences = UserPreference(preferred_difficulty="beginner")

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with these credentials already exists",
        )

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and receive a JWT access token",
)
def login(
    data: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate with username or email and receive a signed JWT access token."""
    identifier_lower = data.identifier.lower()

    # Find user by username OR email (case-insensitive)
    user = db.execute(
        select(User).where(
            (func.lower(User.username) == identifier_lower)
            | (func.lower(User.email) == identifier_lower)
        )
    ).scalar_one_or_none()

    # Return generic error on nonexistent user or password mismatch
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )

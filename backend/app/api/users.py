from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.models.skill import UserSkill
from app.models.preference import UserPreference
from app.schemas.user import UserDetailResponse
from app.schemas.profile import UserProfileResponse, UserProfileUpdateRequest
from app.schemas.skill import (
    UserSkillCreateRequest,
    UserSkillUpdateRequest,
    UserSkillResponse,
)
from app.schemas.preference import (
    UserPreferenceResponse,
    UserPreferenceUpdateRequest,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users & Profiles"])


# --- Current User Details ---

@router.get("/me", response_model=UserDetailResponse, summary="Get current user details")
def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Retrieve full account, profile, skills, and preference information for the authenticated user."""
    return current_user


# --- Profile Management ---

@router.get("/me/profile", response_model=UserProfileResponse, summary="Get current user profile")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Retrieve profile for the authenticated user."""
    if not current_user.profile:
        profile = UserProfile(user_id=current_user.id, display_name=current_user.username)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    return current_user.profile


@router.patch("/me/profile", response_model=UserProfileResponse, summary="Update current user profile")
def update_my_profile(
    data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Partially update profile information for the authenticated user."""
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


# --- Skill Management ---

@router.get("/me/skills", response_model=List[UserSkillResponse], summary="List current user skills")
def get_my_skills(
    current_user: User = Depends(get_current_user),
) -> List[UserSkill]:
    """Retrieve all self-reported skills for the authenticated user."""
    return current_user.skills


@router.post(
    "/me/skills",
    response_model=UserSkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a skill to current user",
)
def add_my_skill(
    data: UserSkillCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSkill:
    """Add a new programming language or skill to the authenticated user's portfolio."""
    # Check for duplicate skill for this user
    existing = db.execute(
        select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            UserSkill.skill_name.ilike(data.skill_name.strip()),
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill '{data.skill_name}' is already added",
        )

    skill = UserSkill(
        user_id=current_user.id,
        skill_name=data.skill_name.strip(),
        proficiency_level=data.proficiency_level,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.patch(
    "/me/skills/{skill_id}",
    response_model=UserSkillResponse,
    summary="Update proficiency for a skill",
)
def update_my_skill(
    skill_id: int,
    data: UserSkillUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSkill:
    """Update self-reported proficiency level for an existing skill owned by current user."""
    skill = db.get(UserSkill, skill_id)
    if not skill or skill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )

    skill.proficiency_level = data.proficiency_level
    db.commit()
    db.refresh(skill)
    return skill


@router.delete(
    "/me/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a skill",
)
def delete_my_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a skill from the authenticated user's portfolio."""
    skill = db.get(UserSkill, skill_id)
    if not skill or skill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )

    db.delete(skill)
    db.commit()
    return None


# --- Preferences Management ---

@router.get("/me/preferences", response_model=UserPreferenceResponse, summary="Get current user preferences")
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreference:
    """Retrieve matchmaking and difficulty preferences for the authenticated user."""
    if not current_user.preferences:
        prefs = UserPreference(user_id=current_user.id, preferred_difficulty="beginner")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
        return prefs
    return current_user.preferences


@router.patch("/me/preferences", response_model=UserPreferenceResponse, summary="Update preferences")
def update_my_preferences(
    data: UserPreferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreference:
    """Partially update difficulty and language preferences for the authenticated user."""
    prefs = current_user.preferences
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)
    return prefs

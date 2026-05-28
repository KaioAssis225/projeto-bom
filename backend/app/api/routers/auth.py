from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    TokenResponse,
    UserRoleResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db_session)) -> TokenResponse:
    return AuthService(db).login(payload)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db_session)) -> AccessTokenResponse:
    access_token = AuthService(db).refresh(payload.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> None:
    AuthService(db).logout(payload.refresh_token)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        must_change_password=user.must_change_password,
        roles=[UserRoleResponse(area=r.area.value, nivel=r.nivel.value) for r in user.roles],
    )


@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    from app.core.security import verify_password, hash_password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )
    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()

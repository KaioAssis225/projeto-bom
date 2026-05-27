from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.permissions import require_admin
from app.models.user import User
from app.schemas.user_admin import (
    UserAdminListResponse,
    UserAdminResponse,
    UserCreatePayload,
    UserPasswordPayload,
    UserRolesPayload,
    UserRoleResponse,
    UserUpdatePayload,
)
from app.services.user_service import UserService

router = APIRouter(tags=["admin-usuarios"])


def _to_response(user: User) -> UserAdminResponse:
    return UserAdminResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=[UserRoleResponse(id=r.id, area=r.area.value, nivel=r.nivel.value) for r in user.roles],
    )


@router.get("/", response_model=UserAdminListResponse)
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> UserAdminListResponse:
    users, total = UserService(db).list_users(skip=skip, limit=limit)
    return UserAdminListResponse(items=[_to_response(u) for u in users], total=total)


@router.post("/", response_model=UserAdminResponse, status_code=201)
def create_user(
    payload: UserCreatePayload,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> UserAdminResponse:
    return _to_response(UserService(db).create(payload))


@router.get("/{id}", response_model=UserAdminResponse)
def get_user(
    id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> UserAdminResponse:
    return _to_response(UserService(db).get(id))


@router.put("/{id}", response_model=UserAdminResponse)
def update_user(
    id: UUID,
    payload: UserUpdatePayload,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> UserAdminResponse:
    return _to_response(UserService(db).update(id, payload))


@router.patch("/{id}/senha", status_code=204)
def update_password(
    id: UUID,
    payload: UserPasswordPayload,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> None:
    UserService(db).update_password(id, payload)


@router.put("/{id}/roles", response_model=UserAdminResponse)
def update_roles(
    id: UUID,
    payload: UserRolesPayload,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> UserAdminResponse:
    return _to_response(UserService(db).update_roles(id, payload))


@router.delete("/{id}/sessoes", status_code=204)
def revoke_sessions(
    id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_admin),
) -> None:
    UserService(db).revoke_sessions(id)

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import Area, Nivel, RefreshToken, User, UserRole
from app.schemas.user_admin import (
    UserCreatePayload,
    UserPasswordPayload,
    UserRolesPayload,
    UserUpdatePayload,
)


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_users(self, skip: int = 0, limit: int = 50) -> tuple[list[User], int]:
        total = self.db.query(User).count()
        users = self.db.query(User).offset(skip).limit(limit).all()
        return users, total

    def get(self, user_id: UUID) -> User:
        user = self.db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        return user

    def create(self, payload: UserCreatePayload) -> User:
        if self.db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.senha_inicial),
        )
        self.db.add(user)
        self.db.flush()

        for role_input in payload.roles:
            self.db.add(UserRole(
                user_id=user.id,
                area=Area(role_input.area),
                nivel=Nivel(role_input.nivel),
            ))

        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user_id: UUID, payload: UserUpdatePayload) -> User:
        user = self.get(user_id)
        if payload.email is not None:
            if self.db.query(User).filter(User.email == payload.email, User.id != user_id).first():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")
            user.email = payload.email
        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.is_active is not None:
            user.is_active = payload.is_active
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_password(self, user_id: UUID, payload: UserPasswordPayload) -> None:
        user = self.get(user_id)
        user.password_hash = hash_password(payload.nova_senha)
        self.db.commit()

    def update_roles(self, user_id: UUID, payload: UserRolesPayload) -> User:
        user = self.get(user_id)
        self.db.query(UserRole).filter(UserRole.user_id == user_id).delete()
        for role_input in payload.roles:
            self.db.add(UserRole(
                user_id=user.id,
                area=Area(role_input.area),
                nivel=Nivel(role_input.nivel),
            ))
        self.db.commit()
        self.db.refresh(user)
        return user

    def revoke_sessions(self, user_id: UUID) -> None:
        self.get(user_id)
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        ).update({"revoked": True})
        self.db.commit()

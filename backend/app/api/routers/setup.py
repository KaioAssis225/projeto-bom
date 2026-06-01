from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.security import hash_password
from app.models.user import Area, Nivel, User, UserRole
from app.schemas.common import BaseSchema

router = APIRouter(tags=["setup"])


class SetupAdminPayload(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    force: bool = False


class SetupAdminResponse(BaseSchema):
    email: str
    full_name: str | None


@router.post("/admin", response_model=SetupAdminResponse, status_code=201)
def setup_admin(
    payload: SetupAdminPayload,
    db: Session = Depends(get_db_session),
) -> SetupAdminResponse:
    any_admin = db.query(UserRole).filter(UserRole.nivel == Nivel.ADMIN).first()
    if any_admin:
        if not payload.force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um administrador cadastrado. Use force: true para recriar.",
            )
        db.query(User).delete()
        db.commit()

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, area=Area.CUSTOS, nivel=Nivel.ADMIN))
    db.commit()

    return SetupAdminResponse(email=user.email, full_name=user.full_name)

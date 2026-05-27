from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, TokenResponse

_LOGIN_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Email ou senha incorretos",
)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.db.query(User).filter(User.email == payload.email).first()

        if user is None or not user.is_active:
            raise _LOGIN_ERROR

        if not verify_password(payload.password, user.password_hash):
            raise _LOGIN_ERROR

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
        self.db.add(RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=expires_at,
        ))
        user.last_login_at = datetime.now(UTC)
        self.db.commit()

        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    def refresh(self, refresh_token: str) -> str:
        _invalid = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada",
        )
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise _invalid
            user_id: str = payload["sub"]
        except (JWTError, KeyError):
            raise _invalid

        db_token = (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == hash_refresh_token(refresh_token),
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > datetime.now(UTC),
            )
            .first()
        )
        if db_token is None:
            raise _invalid

        return create_access_token({"sub": user_id})

    def logout(self, refresh_token: str) -> None:
        token_hash = hash_refresh_token(refresh_token)
        db_token = self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        if db_token:
            db_token.revoked = True
            self.db.commit()

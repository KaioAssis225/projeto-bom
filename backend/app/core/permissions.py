from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import Area, Nivel, NIVEL_ORDER, User


def _nivel_gte(nivel: Nivel, min_nivel: Nivel) -> bool:
    return NIVEL_ORDER.index(nivel) >= NIVEL_ORDER.index(min_nivel)


def _is_admin(user: User) -> bool:
    return any(r.nivel == Nivel.ADMIN for r in user.roles)


def _has_area_access(user: User, area: Area, nivel_min: Nivel) -> bool:
    if _is_admin(user):
        return True
    return any(r.area == area and _nivel_gte(r.nivel, nivel_min) for r in user.roles)


def require(area: str, nivel_min: str):
    _area = Area(area)
    _nivel_min = Nivel(nivel_min)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if not _has_area_access(user, _area, _nivel_min):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado para esta área",
            )
        return user

    return dependency


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not _is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return user


def require_price_read(user: User = Depends(get_current_user)) -> User:
    if _is_admin(user):
        return user
    for role in user.roles:
        if role.area == Area.CUSTOS:
            return user
        if _nivel_gte(role.nivel, Nivel.GESTOR):
            return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso restrito à área de custos",
    )

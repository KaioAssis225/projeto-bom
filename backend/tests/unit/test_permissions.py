from __future__ import annotations

import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.core.permissions import _is_admin, _nivel_gte, _has_area_access
from app.models.user import Area, Nivel, User, UserRole


def _make_user(roles: list[tuple[Area, Nivel]]) -> User:
    user = MagicMock(spec=User)
    user.roles = [MagicMock(spec=UserRole, area=a, nivel=n) for a, n in roles]
    return user


def test_nivel_gte_same_level():
    assert _nivel_gte(Nivel.VIEWER, Nivel.VIEWER) is True


def test_nivel_gte_higher():
    assert _nivel_gte(Nivel.GESTOR, Nivel.ANALISTA) is True


def test_nivel_gte_lower():
    assert _nivel_gte(Nivel.VIEWER, Nivel.ANALISTA) is False


def test_is_admin_true():
    user = _make_user([(Area.CUSTOS, Nivel.ADMIN)])
    assert _is_admin(user) is True


def test_is_admin_false():
    user = _make_user([(Area.CUSTOS, Nivel.GESTOR)])
    assert _is_admin(user) is False


def test_has_area_access_correct_area_and_level():
    user = _make_user([(Area.CUSTOS, Nivel.ANALISTA)])
    assert _has_area_access(user, Area.CUSTOS, Nivel.ANALISTA) is True


def test_has_area_access_wrong_area():
    user = _make_user([(Area.ESTOQUE, Nivel.ANALISTA)])
    assert _has_area_access(user, Area.CUSTOS, Nivel.ANALISTA) is False


def test_has_area_access_level_too_low():
    user = _make_user([(Area.CUSTOS, Nivel.VIEWER)])
    assert _has_area_access(user, Area.CUSTOS, Nivel.ANALISTA) is False


def test_has_area_access_admin_bypasses():
    user = _make_user([(Area.ESTOQUE, Nivel.ADMIN)])
    assert _has_area_access(user, Area.CUSTOS, Nivel.ANALISTA) is True

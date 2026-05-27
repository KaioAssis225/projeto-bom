from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user: User) -> None:
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "admin1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user: User) -> None:
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "errada",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Email ou senha incorretos"


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/login", json={
        "email": "naoexiste@test.com",
        "password": "qualquer",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Email ou senha incorretos"


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_user(client: AsyncClient, admin_user: User) -> None:
    login = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com", "password": "admin1234"
    })
    token = login.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.com"
    assert len(data["roles"]) == 1
    assert data["roles"][0]["nivel"] == "ADMIN"


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, admin_user: User) -> None:
    login = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com", "password": "admin1234"
    })
    refresh_token = login.json()["refresh_token"]
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_logout_invalidates_refresh_token(client: AsyncClient, admin_user: User) -> None:
    login = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com", "password": "admin1234"
    })
    tokens = login.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_non_admin_cannot_list_users(client: AsyncClient, custos_viewer: User) -> None:
    login = await client.post("/api/v1/auth/login", json={
        "email": "viewer@test.com", "password": "viewer1234"
    })
    token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/admin/usuarios/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_user(client: AsyncClient, admin_user: User) -> None:
    login = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com", "password": "admin1234"
    })
    token = login.json()["access_token"]
    response = await client.post(
        "/api/v1/admin/usuarios/",
        json={
            "email": "novo@test.com",
            "full_name": "Novo User",
            "senha_inicial": "novasenha123",
            "roles": [{"area": "ESTOQUE", "nivel": "VIEWER"}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "novo@test.com"
    assert data["roles"][0]["area"] == "ESTOQUE"

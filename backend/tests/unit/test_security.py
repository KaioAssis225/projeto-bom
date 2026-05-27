from __future__ import annotations

import pytest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_hash_password_returns_argon2_hash():
    h = hash_password("senha123")
    assert h.startswith("$argon2id$")


def test_verify_password_correct():
    h = hash_password("senha123")
    assert verify_password("senha123", h) is True


def test_verify_password_wrong():
    h = hash_password("senha123")
    assert verify_password("errada", h) is False


def test_hash_password_different_hashes_same_input():
    h1 = hash_password("senha123")
    h2 = hash_password("senha123")
    assert h1 != h2


def test_create_and_decode_access_token():
    token = create_access_token({"sub": "user-id-123"})
    payload = decode_token(token)
    assert payload["sub"] == "user-id-123"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    token = create_refresh_token({"sub": "user-id-123"})
    payload = decode_token(token)
    assert payload["sub"] == "user-id-123"
    assert payload["type"] == "refresh"


def test_hash_refresh_token_is_deterministic():
    t = "algum-token-qualquer"
    assert hash_refresh_token(t) == hash_refresh_token(t)


def test_hash_refresh_token_different_inputs():
    assert hash_refresh_token("abc") != hash_refresh_token("xyz")

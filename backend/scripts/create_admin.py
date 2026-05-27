#!/usr/bin/env python
"""Cria o primeiro usuário admin no banco de dados.

Uso:
    cd backend
    python scripts/create_admin.py

Variáveis de ambiente necessárias no .env:
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PASSWORD_PEPPER
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import Area, Nivel, User, UserRole


def create_admin(email: str, password: str, full_name: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Usuário {email} já existe.")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
        )
        db.add(user)
        db.flush()
        db.add(UserRole(user_id=user.id, area=Area.CUSTOS, nivel=Nivel.ADMIN))
        db.commit()
        print(f"Admin criado: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    import getpass

    email = input("Email do admin: ").strip()
    full_name = input("Nome completo: ").strip()
    password = getpass.getpass("Senha (mín. 8 chars): ")
    if len(password) < 8:
        print("Senha muito curta.")
        sys.exit(1)
    create_admin(email, password, full_name)

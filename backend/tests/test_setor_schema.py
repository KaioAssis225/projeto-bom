import pytest
from pydantic import ValidationError

from app.schemas.setor import SetorCreate, SetorUpdate


def test_setor_create_valid():
    s = SetorCreate(name="Produção")
    assert s.name == "Produção"


def test_setor_create_name_too_long():
    with pytest.raises(ValidationError):
        SetorCreate(name="A" * 51)


def test_setor_create_name_empty():
    with pytest.raises(ValidationError):
        SetorCreate(name="")


def test_setor_update_valid():
    s = SetorUpdate(name="Logística", active=True)
    assert s.name == "Logística"
    assert s.active is True


def test_setor_update_requires_active():
    with pytest.raises(ValidationError):
        SetorUpdate(name="Logística")

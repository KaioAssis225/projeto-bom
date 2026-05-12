from decimal import Decimal
from app.schemas.finished_product import FinishedProductCreate, FinishedProductUpdate


def test_create_schema_accepts_dimensoes():
    payload = FinishedProductCreate(
        code="PA001",
        description="Produto Teste",
        unit_of_measure_id="10000000-0000-0000-0000-000000000001",
        largura_mm=Decimal("100.50"),
        profundidade_mm=Decimal("50.00"),
        altura_mm=Decimal("30.25"),
    )
    assert payload.largura_mm == Decimal("100.50")
    assert payload.profundidade_mm == Decimal("50.00")
    assert payload.altura_mm == Decimal("30.25")


def test_create_schema_allows_null_dimensoes():
    payload = FinishedProductCreate(
        code="PA002",
        description="Produto Sem Dimensões",
        unit_of_measure_id="10000000-0000-0000-0000-000000000001",
    )
    assert payload.largura_mm is None
    assert payload.profundidade_mm is None
    assert payload.altura_mm is None


def test_update_schema_accepts_dimensoes():
    payload = FinishedProductUpdate(
        description="Atualizado",
        active=True,
        largura_mm=Decimal("200.00"),
        profundidade_mm=None,
        altura_mm=Decimal("80.00"),
    )
    assert payload.largura_mm == Decimal("200.00")
    assert payload.altura_mm == Decimal("80.00")

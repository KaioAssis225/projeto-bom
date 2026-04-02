from __future__ import annotations

import os
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
import pytest_asyncio
from dotenv import dotenv_values
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db_session
from app.core.database import Base
from app.main import app
from app.models import Bom, BomItem, Item, ItemPriceHistory, ItemType, MaterialGroup, UnitOfMeasure
from app.repositories.price_repository import PriceRepository


ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_TEST_PATH = ROOT_DIR / ".env.test"


def _load_test_database_url() -> str:
    env_data = dotenv_values(ENV_TEST_PATH)
    test_database_url = os.getenv("TEST_DATABASE_URL") or env_data.get("TEST_DATABASE_URL")
    if not test_database_url:
        raise RuntimeError(f"TEST_DATABASE_URL not configured in {ENV_TEST_PATH}")
    return str(test_database_url)


def _ensure_database_exists(database_url: str) -> None:
    url = make_url(database_url)
    database_name = url.database
    if not database_name:
        raise RuntimeError("TEST_DATABASE_URL must include a database name")

    admin_url = URL.create(
        drivername=url.drivername,
        username=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
        database="postgres",
    )
    admin_engine = create_engine(admin_url, future=True, isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as connection:
            exists = connection.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :database_name"),
                {"database_name": database_name},
            )
            if not exists:
                connection.execute(text(f'CREATE DATABASE "{database_name}"'))
    finally:
        admin_engine.dispose()


@pytest.fixture(scope="session")
def test_database_url() -> str:
    database_url = _load_test_database_url()
    _ensure_database_exists(database_url)
    return database_url


@pytest.fixture(scope="session")
def engine(test_database_url: str):
    test_engine = create_engine(test_database_url, future=True, pool_pre_ping=True)
    with test_engine.begin() as connection:
        connection.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'))
        Base.metadata.drop_all(bind=connection)
        Base.metadata.create_all(bind=connection)
    yield test_engine
    with test_engine.begin() as connection:
        Base.metadata.drop_all(bind=connection)
    test_engine.dispose()


@pytest.fixture()
def db(engine) -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    testing_session = sessionmaker(
        bind=connection,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )
    session = testing_session()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess: Session, trans) -> None:
        parent = getattr(trans, "_parent", None)
        if trans.nested and parent is not None and not parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        event.remove(session, "after_transaction_end", restart_savepoint)
        session.close()
        transaction.rollback()
        connection.close()


@pytest_asyncio.fixture()
async def client(db: Session) -> AsyncIterator[AsyncClient]:
    def override_get_db() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db_session] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client
    app.dependency_overrides.clear()


@dataclass
class TestFactories:
    db: Session

    def create_uom(self, code: str, description: str, decimal_places: int = 2) -> UnitOfMeasure:
        uom = UnitOfMeasure(code=code, description=description, decimal_places=decimal_places)
        self.db.add(uom)
        self.db.flush()
        self.db.refresh(uom)
        return uom

    def create_group(self, code: str, name: str, description: str | None = None, active: bool = True) -> MaterialGroup:
        group = MaterialGroup(code=code, name=name, description=description, active=active)
        self.db.add(group)
        self.db.flush()
        self.db.refresh(group)
        return group

    def create_item(
        self,
        *,
        code: str,
        description: str,
        item_type: ItemType,
        unit_of_measure_id,
        material_group_id=None,
        active: bool = True,
        notes: str | None = None,
    ) -> Item:
        item = Item(
            code=code,
            description=description,
            type=item_type,
            unit_of_measure_id=unit_of_measure_id,
            material_group_id=material_group_id,
            active=active,
            notes=notes,
        )
        self.db.add(item)
        self.db.flush()
        self.db.refresh(item)
        return item

    def create_bom(
        self,
        *,
        parent_item_id,
        version_code: str = "1.0",
        description: str = "Test BOM",
        valid_from: date | None = None,
        valid_to: date | None = None,
        created_by: str = "pytest",
        is_active: bool = True,
    ) -> Bom:
        bom = Bom(
            parent_item_id=parent_item_id,
            version_code=version_code,
            description=description,
            valid_from=valid_from or date.today(),
            valid_to=valid_to,
            created_by=created_by,
            is_active=is_active,
        )
        self.db.add(bom)
        self.db.flush()
        self.db.refresh(bom)
        return bom

    def add_bom_item(
        self,
        *,
        bom_id,
        parent_item_id,
        child_item_id,
        line_number: int,
        quantity: str | Decimal,
        scrap_percent: str | Decimal = Decimal("0"),
        notes: str | None = None,
    ) -> BomItem:
        bom_item = BomItem(
            bom_id=bom_id,
            parent_item_id=parent_item_id,
            child_item_id=child_item_id,
            line_number=line_number,
            quantity=Decimal(str(quantity)),
            scrap_percent=Decimal(str(scrap_percent)),
            notes=notes,
        )
        self.db.add(bom_item)
        self.db.flush()
        self.db.refresh(bom_item)
        return bom_item

    def set_price(
        self,
        *,
        item_id,
        price_value: str | Decimal,
        valid_from: datetime,
        created_by: str = "pytest",
        reason: str | None = None,
    ) -> ItemPriceHistory:
        repository = PriceRepository(self.db)
        return repository.set_price(
            item_id=item_id,
            price_value=Decimal(str(price_value)),
            valid_from=valid_from,
            created_by=created_by,
            reason=reason,
        )


@pytest.fixture()
def factories(db: Session) -> TestFactories:
    return TestFactories(db=db)


@pytest.fixture()
def base_data(factories: TestFactories) -> dict[str, object]:
    suffix = uuid4().hex[:8].upper()
    uom_unit = factories.create_uom(code=f"UN-{suffix}", description="Unidade")
    uom_kg = factories.create_uom(code=f"KG-{suffix}", description="Quilograma", decimal_places=3)
    group_raw = factories.create_group(code=f"RAW-{suffix}", name="Raw Materials")
    group_pack = factories.create_group(code=f"PACK-{suffix}", name="Packaging")

    raw_1 = factories.create_item(
        code=f"RM-A-{suffix}",
        description="Raw Material A",
        item_type=ItemType.RAW_MATERIAL,
        unit_of_measure_id=uom_kg.id,
        material_group_id=group_raw.id,
    )
    raw_2 = factories.create_item(
        code=f"RM-B-{suffix}",
        description="Raw Material B",
        item_type=ItemType.RAW_MATERIAL,
        unit_of_measure_id=uom_kg.id,
        material_group_id=group_pack.id,
    )
    semi = factories.create_item(
        code=f"SF-{suffix}",
        description="Semi Finished",
        item_type=ItemType.SEMI_FINISHED,
        unit_of_measure_id=uom_unit.id,
    )
    product = factories.create_item(
        code=f"FP-{suffix}",
        description="Finished Product",
        item_type=ItemType.FINISHED_PRODUCT,
        unit_of_measure_id=uom_unit.id,
    )
    inactive_product = factories.create_item(
        code=f"INACTIVE-{suffix}",
        description="Inactive Product",
        item_type=ItemType.FINISHED_PRODUCT,
        unit_of_measure_id=uom_unit.id,
        active=False,
    )

    return {
        "uom_unit": uom_unit,
        "uom_kg": uom_kg,
        "group_raw": group_raw,
        "group_pack": group_pack,
        "raw_1": raw_1,
        "raw_2": raw_2,
        "semi": semi,
        "product": product,
        "inactive_product": inactive_product,
    }

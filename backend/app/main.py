from contextlib import asynccontextmanager
import logging
import time

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.routers.audit import router as audit_router
from app.api.routers.bom import router as bom_router
from app.api.routers.calculations import router as calculations_router
from app.api.routers.finished_product import router as finished_product_router
from app.api.routers.health import router as health_router
from app.api.routers.items import router as items_router
from app.api.routers.logs import router as logs_router
from app.api.routers.material_groups import router as material_groups_router
from app.api.routers.prices import router as prices_router
from app.api.routers.raw_material import router as raw_material_router
from app.api.routers.suppliers import router as suppliers_router
from app.api.routers.unit_of_measures import router as unit_of_measures_router
from app.core.config import settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.core.time import now_sp


configure_logging()

logger = logging.getLogger("app.request")


def _run_migrations() -> None:
    """Run Alembic migrations programmatically at startup."""
    try:
        from pathlib import Path
        alembic_cfg = AlembicConfig(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("database_migrations_ok")
    except Exception as exc:
        logger.exception("database_migrations_failed: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _run_migrations()
    logger.info(
        "application_start",
        extra={
            "extra_data": {
                "app_name": settings.APP_NAME,
                "app_version": settings.APP_VERSION,
                "app_env": settings.APP_ENV,
                "timezone": settings.APP_TIMEZONE,
            }
        },
    )
    yield
    logger.info("application_shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/api/v1/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/api/v1/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/api/v1/openapi.json" if settings.DOCS_ENABLED else None,
)
register_exception_handlers(app)

# Trust Railway's reverse proxy so FastAPI sees the correct scheme (https)
# from the X-Forwarded-Proto header. Without this, Uvicorn treats every
# request as plain HTTP and Starlette may issue 307 redirects.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start_time) * 1000)

    logger.info(
        "request_completed",
        extra={
            "extra_data": {
                "timestamp": now_sp().isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        },
    )

    return response


app.include_router(health_router, prefix="/api/v1/health", tags=["health"])
app.include_router(bom_router, prefix="/api/v1/bom", tags=["bom"])
app.include_router(calculations_router, prefix="/api/v1/calculos", tags=["calculos"])
app.include_router(items_router, prefix="/api/v1/itens", tags=["itens"])
app.include_router(raw_material_router, prefix="/api/v1/materias-primas", tags=["materias-primas"])
app.include_router(finished_product_router, prefix="/api/v1/produtos-acabados", tags=["produtos-acabados"])
app.include_router(logs_router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(material_groups_router, prefix="/api/v1/grupos", tags=["grupos"])
app.include_router(prices_router, prefix="/api/v1/precos", tags=["precos"])
app.include_router(audit_router, prefix="/api/v1/auditoria", tags=["auditoria"])
app.include_router(suppliers_router, prefix="/api/v1/fornecedores", tags=["fornecedores"])
app.include_router(unit_of_measures_router, prefix="/api/v1/unidades", tags=["unidades"])

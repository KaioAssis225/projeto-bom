from contextlib import asynccontextmanager
import logging
import time

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.routers.admin_users import router as admin_users_router
from app.api.routers.setup import router as setup_router
from app.api.routers.auth import router as auth_router
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
from app.api.routers.setores import router as setores_router
from app.api.routers.estoque_aluminio import router as estoque_aluminio_router
from app.api.routers.requisicao import router as requisicao_router
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
        alembic_cfg = AlembicConfig(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("database_migrations_ok")
    except Exception as exc:
        logger.exception("database_migrations_failed: %s", exc)


def _seed_admin() -> None:
    """Creates a default admin user if no admin exists yet."""
    try:
        from app.core.database import SessionLocal
        from app.core.security import hash_password
        from app.models.user import Area, Nivel, User, UserRole

        db = SessionLocal()
        try:
            if db.query(User).filter(User.email == "admin@bomapp.com").first():
                return

            user = User(
                email="admin@bomapp.com",
                password_hash=hash_password("Admin@1234"),
                full_name="Administrador",
            )
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, area=Area.CUSTOS, nivel=Nivel.ADMIN))
            db.commit()
            logger.warning(
                "default_admin_created — TROQUE A SENHA: email=admin@bomapp.com senha=Admin@1234"
            )
        finally:
            db.close()
    except Exception as exc:
        logger.exception("seed_admin_failed: %s", exc)


def _cleanup_exports(max_age_days: int = 90) -> None:
    from pathlib import Path
    exports_dir = Path("exports")
    if not exports_dir.exists():
        return
    cutoff = time.time() - max_age_days * 86400
    removed = 0
    for f in exports_dir.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            try:
                f.unlink()
                removed += 1
            except OSError:
                pass
    if removed:
        logger.info("exports_cleanup", extra={"extra_data": {"removed_files": removed, "max_age_days": max_age_days}})


@asynccontextmanager
async def lifespan(_: FastAPI):
    _run_migrations()
    _cleanup_exports()
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

# Trust Railway's reverse proxy so FastAPI sees the correct scheme (https).
# PROXY_TRUSTED_HOSTS defaults to "127.0.0.1" for local dev.
# Set PROXY_TRUSTED_HOSTS=* only on Railway (where proxy IPs are dynamic).
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.PROXY_TRUSTED_HOSTS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
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


app.include_router(setup_router, prefix="/api/v1/setup", tags=["setup"])
app.include_router(admin_users_router, prefix="/api/v1/admin/usuarios", tags=["admin-usuarios"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
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
app.include_router(setores_router, prefix="/api/v1/setores", tags=["setores"])
app.include_router(estoque_aluminio_router, prefix="/api/v1/estoque-aluminio", tags=["estoque-aluminio"])
app.include_router(requisicao_router, prefix="/api/v1/requisicoes", tags=["requisicoes"])

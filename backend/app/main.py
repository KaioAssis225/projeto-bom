from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers.audit import router as audit_router
from app.api.routers.bom import router as bom_router
from app.api.routers.calculations import router as calculations_router
from app.api.routers.health import router as health_router
from app.api.routers.items import router as items_router
from app.api.routers.logs import router as logs_router
from app.api.routers.material_groups import router as material_groups_router
from app.api.routers.prices import router as prices_router
from app.api.routers.suppliers import router as suppliers_router
from app.api.routers.unit_of_measures import router as unit_of_measures_router
from app.core.config import settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.core.time import now_sp


configure_logging()

logger = logging.getLogger("app.request")


@asynccontextmanager
async def lifespan(_: FastAPI):
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

_use_wildcard = settings.APP_ENV == "development" or "*" in settings.ALLOWED_CORS_ORIGINS
_effective_origins = ["*"] if _use_wildcard else settings.ALLOWED_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=_effective_origins,
    allow_credentials=True,
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


@app.get("/api/v1/debug/cors", tags=["debug"])
async def debug_cors():
    return JSONResponse(
        content={
            "app_env": settings.APP_ENV,
            "allowed_origins": settings.ALLOWED_CORS_ORIGINS,
            "cors_mode": "wildcard" if _use_wildcard else "restricted",
        }
    )


app.include_router(health_router, prefix="/api/v1/health", tags=["health"])
app.include_router(bom_router, prefix="/api/v1/bom", tags=["bom"])
app.include_router(calculations_router, prefix="/api/v1/calculos", tags=["calculos"])
app.include_router(items_router, prefix="/api/v1/itens", tags=["itens"])
app.include_router(logs_router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(material_groups_router, prefix="/api/v1/grupos", tags=["grupos"])
app.include_router(prices_router, prefix="/api/v1/precos", tags=["precos"])
app.include_router(audit_router, prefix="/api/v1/auditoria", tags=["auditoria"])
app.include_router(suppliers_router, prefix="/api/v1/fornecedores", tags=["fornecedores"])
app.include_router(unit_of_measures_router, prefix="/api/v1/unidades", tags=["unidades"])

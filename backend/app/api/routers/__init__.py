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

__all__ = [
    "audit_router",
    "bom_router",
    "calculations_router",
    "health_router",
    "items_router",
    "logs_router",
    "material_groups_router",
    "prices_router",
    "suppliers_router",
    "unit_of_measures_router",
]

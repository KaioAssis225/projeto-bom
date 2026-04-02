from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    BomCycleError,
    DuplicateCodeError,
    InactiveItemError,
    ItemNotFoundError,
    PriceNotFoundError,
)


logger = logging.getLogger("app.error")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BomCycleError)
    async def handle_bom_cycle_error(_: Request, exc: BomCycleError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": "CYCLE_DETECTED",
                "detail": exc.detail,
                "path": exc.path,
            },
        )

    @app.exception_handler(ItemNotFoundError)
    async def handle_item_not_found(_: Request, exc: ItemNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"error": "NOT_FOUND", "detail": exc.detail},
        )

    @app.exception_handler(PriceNotFoundError)
    async def handle_price_not_found(_: Request, exc: PriceNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": "PRICE_NOT_FOUND", "detail": exc.detail},
        )

    @app.exception_handler(DuplicateCodeError)
    async def handle_duplicate_code(_: Request, exc: DuplicateCodeError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"error": "DUPLICATE_CODE", "detail": exc.detail},
        )

    @app.exception_handler(InactiveItemError)
    async def handle_inactive_item(_: Request, exc: InactiveItemError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": "INACTIVE_ITEM", "detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled application error",
            extra={
                "extra_data": {
                    "method": request.method,
                    "path": request.url.path,
                }
            },
        )
        return JSONResponse(status_code=500, content={"error": "INTERNAL_ERROR"})

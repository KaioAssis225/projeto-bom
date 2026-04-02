from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get(
    "/",
    summary="Verificar saúde da API",
    description="Endpoint simples para validar se a aplicação está respondendo.",
)
def health_check() -> dict[str, str]:
    return {"status": "ok"}

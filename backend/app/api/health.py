from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health() -> HealthResponse:
    """
    Health check endpoint to verify backend service availability.
    """
    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME
    )

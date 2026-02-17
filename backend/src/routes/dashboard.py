from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.dashboard_service import DashboardService
from src.dto import DashboardStats, VentasTrends, MovimientosTrends

router = APIRouter(prefix="/dashboard", tags=["dashboard"], redirect_slashes=False)


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_session)):
    """Obtener todas las estadísticas del dashboard."""
    try:
        return await DashboardService.get_stats(db)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener estadísticas: {str(e)}"
        )


@router.get("/trends", response_model=VentasTrends)
async def get_ventas_trends(
    dias: int = Query(7, ge=1, le=30, description="Número de días para la tendencia"),
    db: AsyncSession = Depends(get_session),
):
    """Obtener tendencia de ventas para gráficos."""
    try:
        return await DashboardService.get_trends(db, dias=dias)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener tendencias: {str(e)}"
        )


@router.get("/movimientos-trends", response_model=MovimientosTrends)
async def get_movimientos_trends(
    dias: int = Query(7, ge=1, le=30, description="Número de días para la tendencia"),
    db: AsyncSession = Depends(get_session),
):
    """Obtener tendencia de movimientos para gráficos."""
    try:
        return await DashboardService.get_movimientos_trends(db, dias=dias)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener tendencias de movimientos: {str(e)}",
        )

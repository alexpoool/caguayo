from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from src.database.connection import get_session
from src.services import DashboardService
from src.dto import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_session)):
    try:
        return DashboardService.get_stats(db)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener estadísticas: {str(e)}"
        )

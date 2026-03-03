from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Optional, Dict, Any
from datetime import datetime, date
from src.database.connection import get_session
from src.services.reportes_service import ReportesService
from src.services.pdf_report_service import PdfReportService
from src.models.dependencia import Dependencia

router = APIRouter(prefix="/reportes", tags=["reportes"])

@router.get("/inventario/stock")
async def get_stock_report(
    id_dependencia: Optional[int] = Query(None, description="Filtrar por dependencia"),
    fecha_corte: Optional[date] = Query(None, description="Fecha de corte para el cálculo de stock"),
    db: AsyncSession = Depends(get_session)
):
    service = ReportesService(db)
    return await service.get_stock_por_producto(id_dependencia, fecha_corte)

@router.get("/inventario/stock/pdf")
async def get_stock_report_pdf(
    id_dependencia: Optional[int] = Query(None, description="Filtrar por dependencia"),
    fecha_corte: Optional[date] = Query(None, description="Fecha de corte para el cálculo de stock"),
    db: AsyncSession = Depends(get_session)
):
    service = ReportesService(db)
    data = await service.get_stock_por_producto(id_dependencia, fecha_corte)
    
    filters: Dict[str, Any] = {}
    if id_dependencia:
        dep = await db.get(Dependencia, id_dependencia)
        if dep:
            filters['dependencia_nombre'] = dep.nombre
    if fecha_corte:
        filters['fecha_corte'] = fecha_corte

    pdf_service = PdfReportService()
    pdf_buffer = pdf_service.generate_existencias_pdf(data, filters)
    
    filename = f"existencias_por_producto_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/inventario/movimientos")
async def get_movimientos_report(
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    id_dependencia: Optional[int] = Query(None),
    id_producto: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session)
):
    service = ReportesService(db)
    return await service.get_movimientos_filtro(fecha_inicio, fecha_fin, id_dependencia, id_producto)

@router.get("/inventario/movimientos/pdf")
async def get_movimientos_report_pdf(
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    id_dependencia: Optional[int] = Query(None),
    id_producto: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session)
):
    service = ReportesService(db)
    data = await service.get_movimientos_filtro(fecha_inicio, fecha_fin, id_dependencia, id_producto)
    
    filters: Dict[str, Any] = {
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
    }
    if id_dependencia:
        dep = await db.get(Dependencia, id_dependencia)
        if dep:
            filters['dependencia_nombre'] = dep.nombre
            
    pdf_service = PdfReportService()
    pdf_buffer = pdf_service.generate_movimientos_pdf(data, filters)
    
    filename = f"reporte_movimientos_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

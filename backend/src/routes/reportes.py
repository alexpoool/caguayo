from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from src.database.connection import get_session
from src.services.reportes_service import ReportesService
from src.services.pdf_report_service import PdfReportService

router = APIRouter(prefix="/reportes", tags=["reportes"])

pdf_service = PdfReportService()


@router.get("/inventario/stock")
async def get_inventario_stock(
    id_dependencia: Optional[int] = Query(None),
    fecha_corte: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    service = ReportesService(db)
    return await service.get_stock_por_producto(id_dependencia, fecha_corte)


@router.get("/inventario/stock/pdf")
async def get_inventario_stock_pdf(
    id_dependencia: Optional[int] = Query(None),
    fecha_corte: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    service = ReportesService(db)
    data = await service.get_stock_por_producto(id_dependencia, fecha_corte)
    pdf_data = [
        {"codigo": r["codigo"], "descripcion": r["nombre"], "cantidad": r["stock_actual"]}
        for r in data
    ]
    filters: Dict[str, Any] = {}
    pdf_bytes = pdf_service.generate_existencias_pdf(pdf_data, filters)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=existencias_por_producto.pdf"},
    )


@router.get("/inventario/movimientos")
async def get_inventario_movimientos(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    id_dependencia: Optional[int] = Query(None),
    id_producto: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    service = ReportesService(db)
    fi = datetime.combine(fecha_inicio, datetime.min.time()) if fecha_inicio else None
    ff = datetime.combine(fecha_fin, datetime.max.time()) if fecha_fin else None
    return await service.get_movimientos_filtro(fi, ff, id_dependencia, id_producto)


@router.get("/inventario/movimientos/pdf")
async def get_inventario_movimientos_pdf(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    id_dependencia: Optional[int] = Query(None),
    id_producto: Optional[int] = Query(None),
    vista: Optional[str] = Query("clasificador"),  # "clasificador" | "recibo"
    db: AsyncSession = Depends(get_session),
):
    service = ReportesService(db)
    fi = datetime.combine(fecha_inicio, datetime.min.time()) if fecha_inicio else None
    ff = datetime.combine(fecha_fin, datetime.max.time()) if fecha_fin else None
    data = await service.get_movimientos_filtro(fi, ff, id_dependencia, id_producto)

    filters: Dict[str, Any] = {
        "desde": str(fecha_inicio) if fecha_inicio else "",
        "hasta": str(fecha_fin) if fecha_fin else "",
    }

    if id_producto:
        # ── Reporte por Producto (Kardex) — código extenso obligatorio ──
        pdf_data = [
            {
                "fecha": str(r.get("fecha", "")),
                "saldo_inicial": r.get("saldo_inicial", 0),
                "tipo": r.get("tipo", ""),
                "descripcion": r.get("observacion", "") or r.get("dependencia", ""),
                "cantidad": r.get("cantidad", 0),
                "saldo_final": r.get("saldo_final", 0),
            }
            for r in data
        ]
        if data:
            filters["producto_nombre"] = data[0].get("producto", "")
            # Código extenso obligatorio para este reporte
            filters["producto_codigo"] = (
                data[0].get("codigo_movimiento", "")
                or data[0].get("codigo_producto", "")
            )
        pdf_bytes = pdf_service.generate_movimientos_producto_pdf(pdf_data, filters)
    else:
        # ── Reporte por Dependencia — desdoblamiento de códigos ──
        code_key = "codigo_movimiento" if vista == "recibo" else "codigo_producto"
        pdf_data = [
            {
                "fecha": str(r.get("fecha", "")),
                "codigo": r.get(code_key, "") or r.get("codigo_producto", ""),
                "saldo_inicial": r.get("saldo_inicial", 0),
                "tipo": r.get("tipo", ""),
                "descripcion": r.get("producto", ""),
                "cantidad": r.get("cantidad", 0),
                "saldo_final": r.get("saldo_final", 0),
            }
            for r in data
        ]
        pdf_bytes = pdf_service.generate_movimientos_dependencia_pdf(pdf_data, filters)

    filename = f"reporte_movimientos_{vista}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
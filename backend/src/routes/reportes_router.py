import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_session
from src.dto.auth_dto import UsuarioInfo
from src.services.reportes_service import (
    get_existencias,
    get_movimientos_dependencia,
    get_movimientos_producto,
    get_proveedores_por_dependencia,
)
from src.utils.dependencies import require_auth
from src.utils.logger import AppLogger
from src.utils.pdf_generator import (
    generar_pdf_existencias,
    generar_pdf_movimientos_dependencia,
    generar_pdf_movimientos_producto,
    generar_pdf_proveedores_dependencia,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes"])


# ---------------------------------------------------------------------------
# Endpoints PDF (requieren autenticación obligatoria)
# ---------------------------------------------------------------------------


@router.get("/proveedores-dependencia")
async def obtener_reporte_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(
        ..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"
    ),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, tipo_entidad, id_provincia
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_proveedores_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "tipo_entidad": tipo_entidad,
                "id_provincia": id_provincia,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_proveedores_dependencia(
            proveedores,
            dependencia_info,
            tipo_entidad,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=proveedores_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte proveedores-dependencia: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/existencias")
async def obtener_reporte_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        existencias, dependencia_info = await get_existencias(db, id_dependencia)

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_existencias",
            detalle={"id_dependencia": id_dependencia},
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_existencias(
            existencias,
            dependencia_info,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=existencias_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte existencias: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-dependencia")
async def obtener_reporte_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        movimientos, dependencia_info = await get_movimientos_dependencia(
            db, id_dependencia, fecha_inicio, fecha_fin
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_movimientos_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_movimientos_dependencia(
            movimientos,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=movimientos_dependencia_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte movimientos-dependencia: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-producto")
async def obtener_reporte_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        movimientos, dependencia_info, producto_info = await get_movimientos_producto(
            db, id_dependencia, id_producto, fecha_inicio, fecha_fin
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_movimientos_producto",
            detalle={
                "id_dependencia": id_dependencia,
                "id_producto": id_producto,
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_movimientos_producto(
            movimientos,
            producto_info,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=movimientos_producto_{id_producto}.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte movimientos-producto: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ---------------------------------------------------------------------------
# Preview endpoints – return raw JSON (no PDF, no approval params needed)
# ---------------------------------------------------------------------------


@router.get("/existencias/preview")
async def preview_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        existencias, dependencia_info = await get_existencias(db, id_dependencia)

        total_cantidad = sum(float(item["cantidad"]) for item in existencias)

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_existencias",
            detalle={
                "id_dependencia": id_dependencia,
                "total_items": len(existencias),
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "dependencia": dependencia_info,
            "items": existencias,
            "total_items": len(existencias),
            "total_cantidad": total_cantidad,
        }
    except Exception as e:
        logger.error(f"Error en preview existencias: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-dependencia/preview")
async def preview_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        movimientos, dependencia_info = await get_movimientos_dependencia(
            db, id_dependencia, fecha_inicio, fecha_fin
        )

        items = [
            {
                **r,
                "fecha": r["fecha"].isoformat()
                if hasattr(r["fecha"], "isoformat")
                else str(r["fecha"]),
            }
            for r in movimientos
        ]

        total_entradas = sum(
            float(r["cantidad"]) for r in movimientos if r["tipo"] == "Entrada"
        )
        total_salidas = sum(
            float(r["cantidad"]) for r in movimientos if r["tipo"] == "Salida"
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_movimientos_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "dependencia": dependencia_info,
            "items": items,
            "total_items": len(items),
            "total_entradas": total_entradas,
            "total_salidas": total_salidas,
        }
    except Exception as e:
        logger.error(f"Error en preview movimientos-dependencia: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-producto/preview")
async def preview_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        movimientos, dependencia_info, producto_info = await get_movimientos_producto(
            db, id_dependencia, id_producto, fecha_inicio, fecha_fin
        )

        items = [
            {
                **r,
                "fecha": r["fecha"].isoformat()
                if hasattr(r["fecha"], "isoformat")
                else str(r["fecha"]),
            }
            for r in movimientos
        ]

        total_entradas = sum(
            float(r["cantidad"]) for r in movimientos if r["tipo"] == "Entrada"
        )
        total_salidas = sum(
            float(r["cantidad"]) for r in movimientos if r["tipo"] == "Salida"
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_movimientos_producto",
            detalle={
                "id_dependencia": id_dependencia,
                "id_producto": id_producto,
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "dependencia": dependencia_info,
            "producto": producto_info,
            "items": items,
            "total_items": len(items),
            "total_entradas": total_entradas,
            "total_salidas": total_salidas,
        }
    except Exception as e:
        logger.error(f"Error en preview movimientos-producto: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/proveedores-dependencia/preview")
async def preview_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(
        ..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"
    ),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, tipo_entidad, id_provincia
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_proveedores_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "tipo_entidad": tipo_entidad,
                "id_provincia": id_provincia,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "dependencia": dependencia_info,
            "items": proveedores,
            "total_items": len(proveedores),
        }
    except Exception as e:
        logger.error(f"Error en preview proveedores-dependencia: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )

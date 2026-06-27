import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_session
from src.dto.auth_dto import UsuarioInfo
from src.services.reportes_service import (
    get_existencias,
    get_informe_desempeno,
    get_movimientos_dependencia,
    get_movimientos_producto,
    get_personas_list,
    get_proveedores_por_dependencia,
    get_registro_clientes,
    get_registro_creadores,
    get_registro_proyectos,
    get_reporte_mincult,
    get_reporte_onat,
    get_resumen_liquidaciones,
)
from src.utils.dependencies import require_auth
from src.utils.logger import AppLogger
from src.utils.pdf_generator import (
    generar_pdf_clientes,
    generar_pdf_creadores,
    generar_pdf_desempeno,
    generar_pdf_existencias,
    generar_pdf_liquidaciones,
    generar_pdf_mincult,
    generar_pdf_movimientos_dependencia,
    generar_pdf_movimientos_producto,
    generar_pdf_onat,
    generar_pdf_proveedores_dependencia,
    generar_pdf_proyectos,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes"])


# ---------------------------------------------------------------------------
# Endpoint auxiliar: listado de personas para dropdowns del frontend
# ---------------------------------------------------------------------------


@router.get("/personas")
async def listar_personas(
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        personas = await get_personas_list(db)
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="listar_personas",
            detalle={"total": len(personas)},
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )
        return personas
    except Exception as e:
        logger.error(f"Error al listar personas: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al listar personas"
        )


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


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 1 – REGISTRO DE CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/clientes")
async def obtener_reporte_clientes(
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_clientes(db)
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_clientes",
            detalle={"total": len(data)},
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_clientes(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=registro_clientes.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte clientes: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 2 – REGISTRO DE PROYECTOS / CONTRATOS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/proyectos")
async def obtener_reporte_proyectos(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_proyectos(db, fecha_inicio, fecha_fin)
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_proyectos",
            detalle={
                "total": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_proyectos(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=registro_proyectos.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte proyectos: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 3 – REGISTRO DE CREADORES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/creadores")
async def obtener_reporte_creadores(
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia"),
    id_municipio: Optional[int] = Query(None, description="Filtrar por municipio"),
    vigencia: Optional[str] = Query(None, description="Vigencia (activo/inactivo)"),
    texto_busqueda: Optional[str] = Query(None, description="Texto de búsqueda"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_creadores(
            db, id_provincia, id_municipio, vigencia, texto_busqueda
        )
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_creadores",
            detalle={
                "total": len(data),
                "id_provincia": id_provincia,
                "id_municipio": id_municipio,
                "vigencia": vigencia,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_creadores(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=registro_creadores.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte creadores: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 4 – INFORME DE DESEMPEÑO
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/desempeno")
async def obtener_reporte_desempeno(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_persona: Optional[int] = Query(None, description="Filtrar por creador"),
    estado: Optional[str] = Query(None, description="Estado (pagada/pendiente)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_informe_desempeno(
            db, fecha_inicio, fecha_fin, id_persona, estado
        )
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_desempeno",
            detalle={
                "total": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_desempeno(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=informe_desempeno.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte desempeño: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 5 – INGRESOS Y RETENCIONES (ONAT)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/onat")
async def obtener_reporte_onat(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    id_persona: Optional[int] = Query(None, description="Filtrar por creador"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_reporte_onat(
            db, fecha_inicio, fecha_fin, id_moneda, id_persona
        )
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_onat",
            detalle={
                "total": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_onat(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=reporte_onat.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte ONAT: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 6 – RETRIBUCIÓN POR ESCALA (MINCULT)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/mincult")
async def obtener_reporte_mincult(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_reporte_mincult(db, fecha_inicio, fecha_fin)
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_mincult",
            detalle={
                "total_brackets": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_mincult(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=reporte_mincult.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte MINCULT: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 7 – RESUMEN DE LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/liquidaciones")
async def obtener_reporte_liquidaciones(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_cliente: Optional[int] = Query(None, description="Filtrar por cliente"),
    tipo_concepto: Optional[int] = Query(None, description="Filtrar por tipo de concepto"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_resumen_liquidaciones(
            db, fecha_inicio, fecha_fin, id_cliente, tipo_concepto
        )
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_liquidaciones",
            detalle={
                "total": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_liquidaciones(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=resumen_liquidaciones.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte liquidaciones: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


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


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 1 – CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/clientes/preview")
async def preview_clientes(
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_clientes(db)

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_clientes",
            detalle={"total_items": len(data)},
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": data,
            "total_items": len(data),
        }
    except Exception as e:
        logger.error(f"Error en preview clientes: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 2 – PROYECTOS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/proyectos/preview")
async def preview_proyectos(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_proyectos(db, fecha_inicio, fecha_fin)

        items = [
            {
                **item,
                "fecha": item["fecha"].isoformat()
                if hasattr(item["fecha"], "isoformat")
                else str(item["fecha"]),
            }
            for item in data
        ]

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_proyectos",
            detalle={
                "total_items": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": items,
            "total_items": len(items),
        }
    except Exception as e:
        logger.error(f"Error en preview proyectos: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 3 – CREADORES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/creadores/preview")
async def preview_creadores(
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia"),
    id_municipio: Optional[int] = Query(None, description="Filtrar por municipio"),
    vigencia: Optional[str] = Query(None, description="Vigencia (activo/inactivo)"),
    texto_busqueda: Optional[str] = Query(None, description="Texto de búsqueda"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_registro_creadores(
            db, id_provincia, id_municipio, vigencia, texto_busqueda
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_creadores",
            detalle={
                "total_items": len(data),
                "id_provincia": id_provincia,
                "id_municipio": id_municipio,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": data,
            "total_items": len(data),
            "grupos_municipio": meta.get("grupos_municipio", {}),
        }
    except Exception as e:
        logger.error(f"Error en preview creadores: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 4 – DESEMPEÑO
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/desempeno/preview")
async def preview_desempeno(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_persona: Optional[int] = Query(None, description="Filtrar por creador"),
    estado: Optional[str] = Query(None, description="Estado (pagada/pendiente)"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_informe_desempeno(
            db, fecha_inicio, fecha_fin, id_persona, estado
        )

        items = [
            {
                **item,
                "fecha_pago": item["fecha_pago"].isoformat()
                if hasattr(item.get("fecha_pago"), "isoformat")
                else str(item.get("fecha_pago") or ""),
                "fecha_solicitud": item["fecha_solicitud"].isoformat()
                if hasattr(item.get("fecha_solicitud"), "isoformat")
                else str(item.get("fecha_solicitud") or ""),
            }
            for item in data
        ]

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_desempeno",
            detalle={
                "total_items": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": items,
            "total_items": len(items),
            "totales_por_persona": meta.get("totales_por_persona", {}),
            "gran_total_cobro": meta.get("gran_total_cobro", 0),
            "gran_total_valor": meta.get("gran_total_valor", 0),
        }
    except Exception as e:
        logger.error(f"Error en preview desempeño: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 5 – ONAT
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/onat/preview")
async def preview_onat(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    id_persona: Optional[int] = Query(None, description="Filtrar por creador"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_reporte_onat(
            db, fecha_inicio, fecha_fin, id_moneda, id_persona
        )

        items = [
            {
                **item,
                "fecha_emision": item["fecha_emision"].isoformat()
                if hasattr(item["fecha_emision"], "isoformat")
                else str(item["fecha_emision"]),
                "fecha_liquidacion": item["fecha_liquidacion"].isoformat()
                if hasattr(item.get("fecha_liquidacion"), "isoformat")
                else str(item.get("fecha_liquidacion") or ""),
            }
            for item in data
        ]

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_onat",
            detalle={
                "total_items": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": items,
            "total_items": len(items),
            "totales": meta.get("totales", {}),
        }
    except Exception as e:
        logger.error(f"Error en preview ONAT: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 6 – MINCULT
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/mincult/preview")
async def preview_mincult(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_reporte_mincult(db, fecha_inicio, fecha_fin)

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_mincult",
            detalle={
                "total_brackets": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": data,
            "total_brackets": len(data),
            "total_liquidaciones": meta.get("total_liquidaciones", 0),
            "total_devengado_general": meta.get("total_devengado_general", 0),
        }
    except Exception as e:
        logger.error(f"Error en preview MINCULT: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 7 – LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/liquidaciones/preview")
async def preview_liquidaciones(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_cliente: Optional[int] = Query(None, description="Filtrar por cliente"),
    tipo_concepto: Optional[int] = Query(None, description="Filtrar por tipo de concepto"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(require_auth),
):
    try:
        data, meta = await get_resumen_liquidaciones(
            db, fecha_inicio, fecha_fin, id_cliente, tipo_concepto
        )

        items = [
            {
                **item,
                "fecha_emision": item["fecha_emision"].isoformat()
                if hasattr(item["fecha_emision"], "isoformat")
                else str(item["fecha_emision"]),
                "fecha_liquidacion": item["fecha_liquidacion"].isoformat()
                if hasattr(item.get("fecha_liquidacion"), "isoformat")
                else str(item.get("fecha_liquidacion") or ""),
            }
            for item in data
        ]

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_liquidaciones",
            detalle={
                "total_items": len(data),
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "items": items,
            "total_items": len(items),
            "totales": meta.get("totales", {}),
        }
    except Exception as e:
        logger.error(f"Error en preview liquidaciones: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.dto.auth_dto import UsuarioInfo
from src.services.auth_service import get_current_user
from src.services.reportes_service import (
    buscar_productos_item_anexo,
    get_existencias,
    get_informe_desempeno,
    get_terceros_con_liquidaciones,
    get_movimientos_dependencia,
    get_movimientos_producto,
    get_personas_list,
    get_proveedores_por_dependencia,
    get_registro_clientes,
    get_registro_proyectos,
    get_reporte_mincult,
    get_reporte_onat,
    get_resumen_liquidaciones,
)
from src.utils.logger import AppLogger
from src.utils.pdf_generator import (
    generar_pdf_clientes,
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


def _paginate_preview(items, limit: Optional[int], offset: int):
    """Paginate only when a client explicitly requests it; preserve web defaults."""
    return items if limit is None else items[offset:offset + limit]

async def get_current_user_required(
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
) -> UsuarioInfo:
    """Auth obligatoria para reportes: sin token válido nunca expone datos."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Token de autenticación requerido"
        )
    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db_auth, token)
    if not usuario:
        raise HTTPException(
            status_code=401, detail="Token inválido o expirado"
        )
    return usuario


# ---------------------------------------------------------------------------
# Endpoint auxiliar: listado de personas para dropdowns del frontend
# ---------------------------------------------------------------------------


@router.get("/personas")
async def listar_personas(
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
        raise HTTPException(status_code=500, detail="Error interno al listar personas")


# ---------------------------------------------------------------------------
# Endpoint auxiliar: buscador de productos (item_anexo) para el reporte de
# movimientos por producto
# ---------------------------------------------------------------------------


@router.get("/productos-item-anexo")
async def buscar_productos_item_anexo_endpoint(
    id_dependencia: int = Query(..., description="ID de la dependencia"),
    q: str = Query("", description="Texto a buscar (nombre o código)"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    """Sugiere productos únicos registrados en item_anexo."""
    try:
        productos = await buscar_productos_item_anexo(db, id_dependencia, q)
        return productos
    except Exception as e:
        logger.error(f"Error en buscador de productos (item_anexo): {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al buscar productos"
        )


@router.get("/desempeno/terceros")
async def listar_terceros_informe_desempeno(
    tipo_tercero: str = Query("ambos", description="proveedores, realizadores o ambos"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        return await get_terceros_con_liquidaciones(db, tipo_tercero)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error al listar terceros del informe de desempeño: {e}")
        raise HTTPException(status_code=500, detail="Error interno al listar terceros")


# ---------------------------------------------------------------------------
# Endpoints PDF (requieren autenticación obligatoria)
# ---------------------------------------------------------------------------


@router.get("/proveedores-dependencia")
async def obtener_reporte_proveedores_dependencia(
    id_dependencia: Optional[int] = Query(None, description="ID de la Dependencia (opcional)"),
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia (opcional)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, id_provincia
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"

        await AppLogger.log_action(
            modulo="reportes",
            accion="export_proveedores_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "id_provincia": id_provincia,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        pdf_buffer = generar_pdf_proveedores_dependencia(
            proveedores,
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
                "Content-Disposition": "attachment; filename=proveedores.pdf"
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
        logger.exception("Error en reporte movimientos-dependencia")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-producto")
async def obtener_reporte_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto (obligatorio)"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        movimientos, dependencia_info, producto_info, resumen = await get_movimientos_producto(
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
            resumen_por_tipo=resumen,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=movimientos_producto_{id_producto}.pdf"
            },
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
            data,
            meta,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
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
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


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
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
            data,
            meta,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
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
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 4 – INFORME DE DESEMPEÑO
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/desempeno")
async def obtener_reporte_desempeno(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de emisión desde"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de emisión hasta"),
    tipo_tercero: str = Query("ambos", description="proveedores, realizadores o ambos"),
    id_tercero: Optional[int] = Query(None, description="Tercero específico"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    estado: Optional[str] = Query(None, description="pagada o pendiente"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        data, meta = await get_informe_desempeno(
            db, fecha_inicio, fecha_fin, tipo_tercero, id_tercero, id_moneda, estado
        )
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="terceros",
            accion="export_informe_desempeno",
            detalle={"total": len(data), "tipo_tercero": tipo_tercero,
                     "id_tercero": id_tercero, "id_moneda": id_moneda,
                     "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                     "fecha_fin": fecha_fin.isoformat() if fecha_fin else None},
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )
        pdf_buffer = generar_pdf_desempeno(
            data, meta, usuario_actual, aprobado_por_nombre, aprobado_por_cargo, notas=notas
        )
        return StreamingResponse(
            pdf_buffer, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=informe_desempeno_terceros.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error en informe de desempeño de terceros: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 5 – INGRESOS Y RETENCIONES (ONAT)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/onat")
async def obtener_reporte_onat(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    id_persona: Optional[int] = Query(None, description="Compatibilidad: filtrar por persona"),
    tipo_tercero: str = Query("ambos", description="proveedores, realizadores o ambos"),
    id_tercero: Optional[int] = Query(None, description="Filtrar por tercero"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        data, meta = await get_reporte_onat(
            db, fecha_inicio, fecha_fin, id_moneda, id_persona, tipo_tercero, id_tercero
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
            data,
            meta,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_onat.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error en reporte ONAT: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


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
    current_user: UsuarioInfo = Depends(get_current_user_required),
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
            data,
            meta,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_mincult.pdf"},
        )
    except Exception as e:
        logger.error(f"Error en reporte MINCULT: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 7 – RESUMEN DE LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/liquidaciones")
async def obtener_reporte_liquidaciones(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_cliente: Optional[int] = Query(None, description="Filtrar por cliente"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
):
    try:
        data, meta = await get_resumen_liquidaciones(
            db, fecha_inicio, fecha_fin, id_cliente, id_moneda
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
            data,
            meta,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
            notas=notas,
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
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
            "items": _paginate_preview(existencias, limit, offset),
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        movimientos, dependencia_info = await get_movimientos_dependencia(
            db, id_dependencia, fecha_inicio, fecha_fin
        )

        total_existencia_inicial = sum(float(r.get("saldo_inicial_unidades", 0)) for r in movimientos)
        total_existencia_final = sum(float(r.get("saldo_final_unidades", 0)) for r in movimientos)
        total_saldo_inicial = sum(float(r.get("saldo_inicial", 0)) for r in movimientos)
        total_saldo_final = sum(float(r.get("saldo_final", 0)) for r in movimientos)
        total_entradas = sum(
            float(r.get("recepcion", 0))
            + float(r.get("compra", 0))
            for r in movimientos
        )
        total_salidas = sum(
            float(r.get("venta", 0))
            + float(r.get("merma", 0))
            + float(r.get("donacion", 0))
            + float(r.get("devolucion", 0))
            for r in movimientos
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
            "items": _paginate_preview(movimientos, limit, offset),
            "total_items": len(movimientos),
            "total_existencia_inicial": total_existencia_inicial,
            "total_existencia_final": total_existencia_final,
            "total_saldo_inicial": total_saldo_inicial,
            "total_saldo_final": total_saldo_final,
        }
    except Exception as e:
        logger.exception("Error en preview movimientos-dependencia")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/movimientos-producto/preview")
async def preview_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto (obligatorio)"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        movimientos, dependencia_info, producto_info, resumen = await get_movimientos_producto(
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
            "items": _paginate_preview(items, limit, offset),
            "total_items": len(items),
            "resumen_por_tipo": resumen,
        }
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en preview movimientos-producto: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/proveedores-dependencia/preview")
async def preview_proveedores_dependencia(
    id_dependencia: Optional[int] = Query(None, description="ID de la Dependencia (opcional)"),
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia (opcional)"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, id_provincia
        )

        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="reportes",
            accion="preview_proveedores_dependencia",
            detalle={
                "id_dependencia": id_dependencia,
                "id_provincia": id_provincia,
            },
            usuario_id=current_user.id_usuario,
            usuario_nombre=usuario_actual,
        )

        return {
            "dependencia": dependencia_info,
            "items": _paginate_preview(proveedores, limit, offset),
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
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
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
            "items": _paginate_preview(data, limit, offset),
            "total_items": len(data),
        }
    except Exception as e:
        logger.error(f"Error en preview clientes: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 2 – PROYECTOS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/proyectos/preview")
async def preview_proyectos(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
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
            "items": _paginate_preview(items, limit, offset),
            "total_items": len(items),
        }
    except Exception as e:
        logger.error(f"Error en preview proyectos: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 4 – DESEMPEÑO
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/desempeno/preview")
async def preview_desempeno(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de emisión desde"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de emisión hasta"),
    tipo_tercero: str = Query("ambos", description="proveedores, realizadores o ambos"),
    id_tercero: Optional[int] = Query(None, description="Tercero específico"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    estado: Optional[str] = Query(None, description="pagada o pendiente"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(3, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        data, meta = await get_informe_desempeno(
            db, fecha_inicio, fecha_fin, tipo_tercero, id_tercero, id_moneda, estado
        )
        items = [
            {**item,
             "fecha_emision": item["fecha_emision"].isoformat() if item.get("fecha_emision") else "",
             "fecha_liquidacion": item["fecha_liquidacion"].isoformat() if item.get("fecha_liquidacion") else ""}
            for item in data
        ]
        usuario_actual = f"{current_user.nombre} {current_user.primer_apellido}"
        await AppLogger.log_action(
            modulo="terceros", accion="preview_informe_desempeno",
            detalle={"total_items": len(data), "tipo_tercero": tipo_tercero,
                     "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                     "fecha_fin": fecha_fin.isoformat() if fecha_fin else None},
            usuario_id=current_user.id_usuario, usuario_nombre=usuario_actual,
        )
        return {
            "items": _paginate_preview(items, limit, offset),
            "total_items": len(items),
            "total_terceros": meta.get("total_terceros", 0),
            "totales_por_moneda": meta.get("totales_por_moneda", []),
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error en preview de desempeño de terceros: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte")


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 5 – ONAT
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/onat/preview")
async def preview_onat(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    id_persona: Optional[int] = Query(None, description="Compatibilidad: filtrar por persona"),
    tipo_tercero: str = Query("ambos", description="proveedores, realizadores o ambos"),
    id_tercero: Optional[int] = Query(None, description="Filtrar por tercero"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(3, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        data, meta = await get_reporte_onat(
            db, fecha_inicio, fecha_fin, id_moneda, id_persona, tipo_tercero, id_tercero
        )

        items = data

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
            "items": _paginate_preview(items, limit, offset),
            "total_items": len(items),
            "total_terceros": meta.get("total_terceros", 0),
            "total_liquidaciones": meta.get("total_liquidaciones", 0),
            "totales_por_moneda": meta.get("totales_por_moneda", []),
            "totales": meta.get("totales", {}),
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error en preview ONAT: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 6 – MINCULT
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/mincult/preview")
async def preview_mincult(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
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
            "items": _paginate_preview(data, limit, offset),
            "total_brackets": len(data),
            "total_liquidaciones": meta.get("total_liquidaciones", 0),
            "total_devengado_general": meta.get("total_devengado_general", 0),
        }
    except Exception as e:
        logger.error(f"Error en preview MINCULT: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  PREVIEW REPORTE 7 – LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/liquidaciones/preview")
async def preview_liquidaciones(
    fecha_inicio: Optional[date] = Query(None, description="Fecha Inicio"),
    fecha_fin: Optional[date] = Query(None, description="Fecha Fin"),
    id_cliente: Optional[int] = Query(None, description="Filtrar por cliente"),
    id_moneda: Optional[int] = Query(None, description="Filtrar por moneda"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_current_user_required),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        data, meta = await get_resumen_liquidaciones(
            db, fecha_inicio, fecha_fin, id_cliente, id_moneda
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
            "items": _paginate_preview(items, limit, offset),
            "total_items": len(items),
            "totales": meta.get("totales", {}),
            "totales_por_moneda": meta.get("totales_por_moneda", []),
        }
    except Exception as e:
        logger.error(f"Error en preview liquidaciones: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )

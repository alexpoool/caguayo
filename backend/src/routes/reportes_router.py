from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.services.auth_service import get_current_user
from src.services.reportes_service import (
    get_existencias,
    get_movimientos_dependencia,
    get_movimientos_producto,
    get_proveedores_por_dependencia,
)
from src.utils.pdf_generator import (
    generar_pdf_existencias,
    generar_pdf_movimientos_dependencia,
    generar_pdf_movimientos_producto,
    generar_pdf_proveedores_dependencia,
)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


async def get_usuario_actual(
    authorization: str = Header(None),
    db_auth: AsyncSession = Depends(get_session),
) -> str:
    """Obtiene el nombre del usuario autenticado desde el token."""
    if not authorization or not authorization.startswith("Bearer "):
        return "Usuario Autenticado"

    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db_auth, token)

    if not usuario:
        return "Usuario Autenticado"

    return f"{usuario.nombre} {usuario.primer_apellido}"


@router.get("/proveedores-dependencia")
async def obtener_reporte_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(
        ..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"
    ),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: AsyncSession = Depends(get_session),
    authorization: str = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, tipo_entidad, id_provincia
        )

        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            usuario = await get_current_user(db_auth, token)
            usuario_actual = (
                f"{usuario.nombre} {usuario.primer_apellido}"
                if usuario
                else "Usuario Autenticado"
            )
        else:
            usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_proveedores_dependencia(
            proveedores,
            dependencia_info,
            tipo_entidad,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=proveedores_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/existencias")
async def obtener_reporte_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: AsyncSession = Depends(get_session),
    authorization: str = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        existencias, dependencia_info = await get_existencias(db, id_dependencia)

        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            usuario = await get_current_user(db_auth, token)
            usuario_actual = (
                f"{usuario.nombre} {usuario.primer_apellido}"
                if usuario
                else "Usuario Autenticado"
            )
        else:
            usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_existencias(
            existencias,
            dependencia_info,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=existencias_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimientos-dependencia")
async def obtener_reporte_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: AsyncSession = Depends(get_session),
    authorization: str = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        movimientos, dependencia_info = await get_movimientos_dependencia(
            db, id_dependencia, fecha_inicio, fecha_fin
        )

        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            usuario = await get_current_user(db_auth, token)
            usuario_actual = (
                f"{usuario.nombre} {usuario.primer_apellido}"
                if usuario
                else "Usuario Autenticado"
            )
        else:
            usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_movimientos_dependencia(
            movimientos,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=movimientos_dependencia_{id_dependencia}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimientos-producto")
async def obtener_reporte_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    db: AsyncSession = Depends(get_session),
    authorization: str = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        movimientos, dependencia_info, producto_info = await get_movimientos_producto(
            db, id_dependencia, id_producto, fecha_inicio, fecha_fin
        )

        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            usuario = await get_current_user(db_auth, token)
            usuario_actual = (
                f"{usuario.nombre} {usuario.primer_apellido}"
                if usuario
                else "Usuario Autenticado"
            )
        else:
            usuario_actual = "Usuario Autenticado"

        pdf_buffer = generar_pdf_movimientos_producto(
            movimientos,
            producto_info,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=movimientos_producto_{id_producto}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Preview endpoints – return raw JSON (no PDF, no approval params needed)
# ---------------------------------------------------------------------------


@router.get("/existencias/preview")
async def preview_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    db: AsyncSession = Depends(get_session),
):
    try:
        existencias, dependencia_info = await get_existencias(db, id_dependencia)

        total_cantidad = sum(float(item["cantidad"]) for item in existencias)

        return {
            "dependencia": dependencia_info,
            "items": existencias,
            "total_items": len(existencias),
            "total_cantidad": total_cantidad,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimientos-dependencia/preview")
async def preview_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
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

        return {
            "dependencia": dependencia_info,
            "items": items,
            "total_items": len(items),
            "total_entradas": total_entradas,
            "total_salidas": total_salidas,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimientos-producto/preview")
async def preview_movimientos_producto(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    id_producto: int = Query(..., description="ID del Producto"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    db: AsyncSession = Depends(get_session),
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

        return {
            "dependencia": dependencia_info,
            "producto": producto_info,
            "items": items,
            "total_items": len(items),
            "total_entradas": total_entradas,
            "total_salidas": total_salidas,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proveedores-dependencia/preview")
async def preview_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(
        ..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"
    ),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    db: AsyncSession = Depends(get_session),
):
    try:
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, tipo_entidad, id_provincia
        )

        return {
            "dependencia": dependencia_info,
            "items": proveedores,
            "total_items": len(proveedores),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

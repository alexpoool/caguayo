from fastapi import APIRouter, Depends, HTTPException, Query, Header

from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi.responses import StreamingResponse
from datetime import date
from typing import cast

from src.database.connection import get_session, get_auth_session
from src.services import auth_service

# Add your auth dependency as needed, for now generating dummy user
from src.services.reportes_service import (
    get_proveedores_por_dependencia,
    get_existencias,
    get_movimientos_dependencia,
    get_movimientos_producto,
    get_liquidacion_report_data,
    get_alertas_reposicion,
    ModoCodigoMovimiento,
    TipoEntidadReporte,
)
from src.services.auth_service import get_current_user
from src.utils.pdf_generator import (
    generar_pdf_proveedores_dependencia,
    generar_pdf_existencias,
    generar_pdf_movimientos_dependencia,
    generar_pdf_movimientos_producto,
    generar_pdf_liquidacion,
    generar_pdf_alertas_reposicion,
)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


async def _get_usuario_y_cargo(
    authorization: str | None,
    db_auth: AsyncSession,
) -> tuple[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    usuario = await auth_service.get_current_user(db_auth, token)
    if not usuario:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    nombre = " ".join(
        [
            p
            for p in [usuario.nombre, usuario.primer_apellido, usuario.segundo_apellido]
            if p
        ]
    )
    cargo = usuario.grupo.nombre if usuario.grupo else ""
    return (nombre or usuario.alias), cargo


@router.get("/proveedores-dependencia")
async def obtener_reporte_proveedores_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    tipo_entidad: str = Query(
        ..., description="Tipo de Entidad (NATURAL, TCP, JURIDICA)"
    ),
    id_provincia: int = Query(None, description="Filtrar por provincia (opcional)"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        if tipo_entidad not in {"NATURAL", "TCP", "JURIDICA"}:
            raise HTTPException(status_code=400, detail="tipo_entidad inválido")

        tipo_entidad_typed = cast(TipoEntidadReporte, tipo_entidad)
        proveedores, dependencia_info = await get_proveedores_por_dependencia(
            db, id_dependencia, tipo_entidad_typed, id_provincia
        )

        usuario_actual, usuario_cargo = await _get_usuario_y_cargo(
            authorization, db_auth
        )

        pdf_buffer = generar_pdf_proveedores_dependencia(
            proveedores,
            dependencia_info,
            tipo_entidad,
            usuario_actual,
            usuario_cargo,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=proveedores_dependencia_{id_dependencia}.pdf"
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/existencias")
async def obtener_reporte_existencias(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        existencias, dependencia_info = await get_existencias(db, id_dependencia)

        usuario_actual, usuario_cargo = await _get_usuario_y_cargo(
            authorization, db_auth
        )

        pdf_buffer = generar_pdf_existencias(
            existencias,
            dependencia_info,
            usuario_actual,
            usuario_cargo,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=existencias_dependencia_{id_dependencia}.pdf"
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimientos-dependencia")
async def obtener_reporte_movimientos_dependencia(
    id_dependencia: int = Query(..., description="ID de la Dependencia"),
    fecha_inicio: date = Query(..., description="Fecha Inicio"),
    fecha_fin: date = Query(..., description="Fecha Fin"),
    modo_codigo: str = Query(
        "corto",
        description="Modo de código: corto (productos.codigo) o extenso (movimiento.codigo)",
    ),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        if fecha_inicio > fecha_fin:
            raise HTTPException(
                status_code=400,
                detail="fecha_inicio no puede ser mayor que fecha_fin",
            )
        if modo_codigo not in {"corto", "extenso"}:
            raise HTTPException(status_code=400, detail="modo_codigo inválido")

        modo_codigo_typed = cast(ModoCodigoMovimiento, modo_codigo)
        movimientos, dependencia_info = await get_movimientos_dependencia(
            db,
            id_dependencia,
            fecha_inicio,
            fecha_fin,
            modo_codigo=modo_codigo_typed,
        )

        usuario_actual, usuario_cargo = await _get_usuario_y_cargo(
            authorization, db_auth
        )

        pdf_buffer = generar_pdf_movimientos_dependencia(
            movimientos,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            usuario_cargo,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        filename = f"movimientos_dependencia_{id_dependencia}_{fecha_inicio}_al_{fecha_fin}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
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
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        if fecha_inicio > fecha_fin:
            raise HTTPException(
                status_code=400,
                detail="fecha_inicio no puede ser mayor que fecha_fin",
            )

        movimientos, dependencia_info, producto_info = await get_movimientos_producto(
            db, id_dependencia, id_producto, fecha_inicio, fecha_fin
        )

        usuario_actual, usuario_cargo = await _get_usuario_y_cargo(
            authorization, db_auth
        )

        pdf_buffer = generar_pdf_movimientos_producto(
            movimientos,
            producto_info,
            dependencia_info,
            fecha_inicio,
            fecha_fin,
            usuario_actual,
            usuario_cargo,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        filename = (
            f"movimientos_producto_{id_producto}_{fecha_inicio}_al_{fecha_fin}.pdf"
        )
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/liquidacion/{id_liquidacion}")
async def obtener_reporte_liquidacion(
    id_liquidacion: int,
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        liquidacion_data, items, dependencia_info = await get_liquidacion_report_data(
            db, id_liquidacion
        )

        if not liquidacion_data:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")

        usuario_actual, _ = await _get_usuario_y_cargo(authorization, db_auth)

        pdf_buffer = generar_pdf_liquidacion(
            liquidacion_data,
            items,
            dependencia_info,
            usuario_actual,
            aprobado_por_nombre,
            aprobado_por_cargo,
        )

        filename = f"liquidacion_{liquidacion_data['codigo']}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alertas-reposicion")
async def obtener_datos_alertas_reposicion(
    db: AsyncSession = Depends(get_session),
    authorization: str | None = Header(None, alias="Authorization"),
):
    try:
        data = await get_alertas_reposicion(db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alertas-reposicion/pdf")
async def obtener_pdf_alertas_reposicion(
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
    db_auth: AsyncSession = Depends(get_auth_session),
):
    try:
        usuario_actual, usuario_cargo = await _get_usuario_y_cargo(
            authorization, db_auth
        )
        data = await get_alertas_reposicion(db)

        pdf_buffer = generar_pdf_alertas_reposicion(
            data=data,
            usuario=usuario_actual,
            usuario_cargo=usuario_cargo,
            aprobado_por_nombre=aprobado_por_nombre,
            aprobado_por_cargo=aprobado_por_cargo,
        )

        filename = "alertas_reposicion_stock.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

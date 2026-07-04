import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.dto.auth_dto import UsuarioInfo
from src.services.auth_service import get_current_user
from src.services.reportes_service import get_registro_creadores
from src.utils.logger import AppLogger
from src.utils.pdf_generator import generar_pdf_creadores

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proyecto", tags=["proyecto"])

DUMMY_USER = UsuarioInfo(
    id_usuario=0,
    ci="00000000000",
    nombre="Anónimo",
    primer_apellido="",
    alias="anonimo",
)


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
) -> UsuarioInfo:
    if not authorization or not authorization.startswith("Bearer "):
        return DUMMY_USER
    token = authorization.replace("Bearer ", "")
    try:
        usuario = await get_current_user(db_auth, token)
        if usuario:
            return usuario
    except Exception:
        pass
    return DUMMY_USER


@router.get("/")
async def obtener_reporte_creadores(
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia"),
    id_municipio: Optional[int] = Query(None, description="Filtrar por municipio"),
    vigencia: Optional[str] = Query(None, description="Vigencia (activo/inactivo)"),
    texto_busqueda: Optional[str] = Query(None, description="Texto de búsqueda"),
    aprobado_por_nombre: str = Query("", description="Nombre de quien aprueba"),
    aprobado_por_cargo: str = Query("", description="Cargo de quien aprueba"),
    notas: str = Query("", description="Observaciones para incluir en el PDF"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_optional_user),
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
                "Content-Disposition": "attachment; filename=registro_creadores.pdf"
            },
        )
    except Exception as e:
        logger.error(f"Error en reporte creadores: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )


@router.get("/preview")
async def preview_creadores(
    id_provincia: Optional[int] = Query(None, description="Filtrar por provincia"),
    id_municipio: Optional[int] = Query(None, description="Filtrar por municipio"),
    vigencia: Optional[str] = Query(None, description="Vigencia (activo/inactivo)"),
    texto_busqueda: Optional[str] = Query(None, description="Texto de búsqueda"),
    db: AsyncSession = Depends(get_session),
    current_user: UsuarioInfo = Depends(get_optional_user),
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
        raise HTTPException(
            status_code=500, detail="Error interno al generar el reporte"
        )

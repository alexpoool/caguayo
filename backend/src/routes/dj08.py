import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto.dj08_dto import (
    ActividadEconomicaCreate,
    ActividadEconomicaRead,
    TributoCreate,
    TributoRead,
    DeclaracionJuradaRead,
    DJ08Input,
    DJ08Calculado,
)
from src.models import ActividadEconomica, Tributo, DeclaracionJurada
from src.services import auth_service
from src.services.dj08_service import (
    construir_datos,
    guardar_declaracion,
    construir_datos_desde_declaracion,
)
from src.services.dj08_pdf import exportar_dj08_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dj08", tags=["dj08"], redirect_slashes=False)


async def _usuario_id(authorization: str, db: AsyncSession) -> int:
    """Extrae el id del usuario actual desde el token (patrón auth.py)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    usuario = await auth_service.get_current_user(db, token)
    if not usuario:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return usuario.id_usuario


# ── Actividades económicas (Sección A) ──────────────────────────────


@router.get("/actividades", response_model=List[ActividadEconomicaRead])
async def listar_actividades(db: AsyncSession = Depends(get_session)):
    items = (
        await db.exec(
            select(ActividadEconomica).order_by(
                ActividadEconomica.orden, ActividadEconomica.id_actividad
            )
        )
    ).all()
    return [
        ActividadEconomicaRead.model_validate(a, from_attributes=True) for a in items
    ]


@router.post("/actividades", response_model=ActividadEconomicaRead, status_code=201)
async def crear_actividad(
    datos: ActividadEconomicaCreate, db: AsyncSession = Depends(get_session)
):
    if not datos.codigo.strip() or not datos.nombre.strip():
        raise HTTPException(status_code=400, detail="Código y nombre son obligatorios")
    if datos.fecha_fin < datos.fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail="La fecha Hasta no puede ser anterior a la fecha Desde",
        )
    obj = ActividadEconomica(**datos.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return ActividadEconomicaRead.model_validate(obj, from_attributes=True)


@router.put("/actividades/{id_actividad}", response_model=ActividadEconomicaRead)
async def actualizar_actividad(
    id_actividad: int,
    datos: ActividadEconomicaCreate,
    db: AsyncSession = Depends(get_session),
):
    obj = await db.get(ActividadEconomica, id_actividad)
    if not obj:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not datos.codigo.strip() or not datos.nombre.strip():
        raise HTTPException(status_code=400, detail="Código y nombre son obligatorios")
    if datos.fecha_fin < datos.fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail="La fecha Hasta no puede ser anterior a la fecha Desde",
        )
    for k, v in datos.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return ActividadEconomicaRead.model_validate(obj, from_attributes=True)


@router.delete("/actividades/{id_actividad}", status_code=204)
async def eliminar_actividad(
    id_actividad: int, db: AsyncSession = Depends(get_session)
):
    obj = await db.get(ActividadEconomica, id_actividad)
    if not obj:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    await db.delete(obj)
    await db.commit()


# ── Tributos (Sección F) ─────────────────────────────────────────────


@router.get("/tributos", response_model=List[TributoRead])
async def listar_tributos(db: AsyncSession = Depends(get_session)):
    items = (await db.exec(select(Tributo).order_by(Tributo.id_tributo))).all()
    return [TributoRead.model_validate(t, from_attributes=True) for t in items]


@router.post("/tributos", response_model=TributoRead, status_code=201)
async def crear_tributo(datos: TributoCreate, db: AsyncSession = Depends(get_session)):
    if not datos.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    obj = Tributo(**datos.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return TributoRead.model_validate(obj, from_attributes=True)


@router.put("/tributos/{id_tributo}", response_model=TributoRead)
async def actualizar_tributo(
    id_tributo: int, datos: TributoCreate, db: AsyncSession = Depends(get_session)
):
    obj = await db.get(Tributo, id_tributo)
    if not obj:
        raise HTTPException(status_code=404, detail="Tributo no encontrado")
    for k, v in datos.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return TributoRead.model_validate(obj, from_attributes=True)


@router.delete("/tributos/{id_tributo}", status_code=204)
async def eliminar_tributo(id_tributo: int, db: AsyncSession = Depends(get_session)):
    obj = await db.get(Tributo, id_tributo)
    if not obj:
        raise HTTPException(status_code=404, detail="Tributo no encontrado")
    await db.delete(obj)
    await db.commit()


# ── Cálculo y exportación ────────────────────────────────────────────


@router.post("/calcular", response_model=DJ08Calculado)
async def calcular_dj08(
    entrada: DJ08Input,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Devuelve la declaración calculada (preview antes de exportar)."""
    id_usuario = await _usuario_id(authorization, db)
    try:
        return await construir_datos(db, id_usuario, entrada)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error al calcular DJ-08", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/exportar-pdf")
async def exportar_dj08(
    entrada: DJ08Input,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Genera el PDF de 4 páginas (recalcula server-side)."""
    id_usuario = await _usuario_id(authorization, db)
    try:
        datos = await construir_datos(db, id_usuario, entrada)
        contenido = exportar_dj08_pdf(datos)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error al exportar DJ-08", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    nombre = f"DJ08_declaracion_{entrada.ano_fiscal}.pdf"
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


# ── Declaraciones guardadas ──────────────────────────────────────────


def _dj_read(dj: DeclaracionJurada) -> DeclaracionJuradaRead:
    return DeclaracionJuradaRead.model_validate(dj, from_attributes=True)


@router.get("/declaraciones", response_model=List[DeclaracionJuradaRead])
async def listar_declaraciones(
    ano_fiscal: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(DeclaracionJurada).order_by(DeclaracionJurada.id_declaracion.desc())
    if ano_fiscal:
        stmt = stmt.where(DeclaracionJurada.ano_fiscal == ano_fiscal)
    if estado:
        stmt = stmt.where(DeclaracionJurada.estado == estado)
    items = (await db.exec(stmt)).all()
    return [_dj_read(dj) for dj in items]


@router.get(
    "/declaraciones/{id_declaracion}", response_model=DeclaracionJuradaRead
)
async def obtener_declaracion(
    id_declaracion: int, db: AsyncSession = Depends(get_session)
):
    dj = await db.get(DeclaracionJurada, id_declaracion)
    if not dj:
        raise HTTPException(status_code=404, detail="Declaración no encontrada")
    return _dj_read(dj)


@router.post("/declaraciones", response_model=DeclaracionJuradaRead, status_code=201)
async def guardar_dj(
    entrada: DJ08Input,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Guarda la declaración con snapshot (código correlativo por año)."""
    id_usuario = await _usuario_id(authorization, db)
    try:
        dj = await guardar_declaracion(db, id_usuario, entrada)
        return _dj_read(dj)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error al guardar la declaración", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put(
    "/declaraciones/{id_declaracion}/presentar",
    response_model=DeclaracionJuradaRead,
)
async def presentar_declaracion(
    id_declaracion: int, db: AsyncSession = Depends(get_session)
):
    dj = await db.get(DeclaracionJurada, id_declaracion)
    if not dj:
        raise HTTPException(status_code=404, detail="Declaración no encontrada")
    if dj.estado == "PRESENTADA":
        raise HTTPException(status_code=409, detail="La declaración ya está presentada")
    dj.estado = "PRESENTADA"
    await db.commit()
    await db.refresh(dj)
    return _dj_read(dj)


@router.delete("/declaraciones/{id_declaracion}", status_code=204)
async def eliminar_declaracion(
    id_declaracion: int, db: AsyncSession = Depends(get_session)
):
    dj = await db.get(DeclaracionJurada, id_declaracion)
    if not dj:
        raise HTTPException(status_code=404, detail="Declaración no encontrada")
    if dj.estado == "PRESENTADA":
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar una declaración presentada",
        )
    await db.delete(dj)
    await db.commit()


@router.post("/declaraciones/{id_declaracion}/exportar-pdf")
async def exportar_declaracion_pdf(
    id_declaracion: int,
    db: AsyncSession = Depends(get_session),
):
    """Re-exporta el PDF desde el snapshot guardado (sin recalcular)."""
    dj = await db.get(DeclaracionJurada, id_declaracion)
    if not dj:
        raise HTTPException(status_code=404, detail="Declaración no encontrada")
    try:
        datos = await construir_datos_desde_declaracion(db, dj)
        contenido = exportar_dj08_pdf(datos)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error al exportar la declaración", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{dj.codigo}.pdf"'},
    )

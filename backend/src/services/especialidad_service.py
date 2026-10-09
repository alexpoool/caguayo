# -*- coding: utf-8 -*-
"""Catálogo de especialidades del artista.

No hay borrado duro. Las 231 especialidades migradas están enlazadas a 708
artistas y la FK de `clientes_persona_natural.id_especialidad` es
`ON DELETE SET NULL`: un `DELETE` dejaría sin especialidad, en silencio, a
todos los que la usaran. Por eso "eliminar" desactiva.

Desactivar conserva el enlace, así que un artista puede seguir teniendo una
especialidad que ya no aparece en el Select de los formularios. El frontend lo
resuelve mostrando la asignada aunque esté desactivada.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto.especialidad_dto import (
    EspecialidadCreate,
    EspecialidadRead,
    EspecialidadUpdate,
)
from src.models.cliente_natural import ClienteNatural
from src.models.especialidades_artisticas import EspecialidadesArtisticas


async def _encontrar_por_nombre(db: AsyncSession, nombre: str) -> Optional[int]:
    stmt = select(EspecialidadesArtisticas.id_especialidad).where(
        func.lower(EspecialidadesArtisticas.nombre) == nombre.strip().lower()
    )
    return (await db.exec(stmt)).first()


async def _contar_artistas(db: AsyncSession) -> dict:
    stmt = (
        select(
            ClienteNatural.id_especialidad,
            func.count(ClienteNatural.id_cliente),
        )
        .where(ClienteNatural.id_especialidad.is_not(None))
        .group_by(ClienteNatural.id_especialidad)
    )
    return {f[0]: f[1] for f in (await db.exec(stmt)).all()}


def _a_read(esp: EspecialidadesArtisticas, artistas: int) -> EspecialidadRead:
    return EspecialidadRead(
        id_especialidad=esp.id_especialidad,
        nombre=esp.nombre,
        descripcion=esp.descripcion,
        categoria=esp.categoria,
        activo=esp.activo,
        artistas=artistas,
    )


async def get_all(
    db: AsyncSession,
    *,
    solo_activas: bool = False,
) -> List[EspecialidadRead]:
    stmt = select(EspecialidadesArtisticas).order_by(EspecialidadesArtisticas.nombre)
    if solo_activas:
        stmt = stmt.where(EspecialidadesArtisticas.activo.is_(True))
    filas = (await db.exec(stmt)).all()
    conteo = await _contar_artistas(db)
    return [_a_read(f, conteo.get(f.id_especialidad, 0)) for f in filas]


async def get(db: AsyncSession, id_especialidad: int) -> Optional[EspecialidadRead]:
    esp = await db.get(EspecialidadesArtisticas, id_especialidad)
    if not esp:
        return None
    conteo = await _contar_artistas(db)
    return _a_read(esp, conteo.get(esp.id_especialidad, 0))


async def create(db: AsyncSession, data: EspecialidadCreate) -> EspecialidadRead:
    nombre = (data.nombre or "").strip()
    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre de la especialidad es obligatorio",
        )
    if await _encontrar_por_nombre(db, nombre):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una especialidad llamada «{nombre}»",
        )

    esp = EspecialidadesArtisticas(
        nombre=nombre[:100],
        descripcion=(data.descripcion or "").strip() or None,
        categoria=(data.categoria or "").strip() or None,
        activo=True if data.activo is None else data.activo,
    )
    db.add(esp)
    await db.commit()
    await db.refresh(esp)
    return _a_read(esp, 0)


async def update(
    db: AsyncSession, id_especialidad: int, data: EspecialidadUpdate
) -> Optional[EspecialidadRead]:
    esp = await db.get(EspecialidadesArtisticas, id_especialidad)
    if not esp:
        return None

    cambios = data.model_dump(exclude_unset=True)

    nombre = cambios.get("nombre")
    if nombre is not None:
        nombre = nombre.strip()
        if not nombre:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre de la especialidad es obligatorio",
            )
        otro = await _encontrar_por_nombre(db, nombre)
        if otro and otro != id_especialidad:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una especialidad llamada «{nombre}»",
            )
        esp.nombre = nombre[:100]

    for campo in ("descripcion", "categoria"):
        if campo in cambios:
            valor = (cambios[campo] or "").strip() or None
            setattr(esp, campo, valor)
    if "activo" in cambios and cambios["activo"] is not None:
        esp.activo = bool(cambios["activo"])

    await db.commit()
    await db.refresh(esp)
    conteo = await _contar_artistas(db)
    return _a_read(esp, conteo.get(esp.id_especialidad, 0))


async def desactivar(db: AsyncSession, id_especialidad: int) -> Optional[EspecialidadRead]:
    """Desactiva la especialidad. Nunca la borra: el enlace se conserva."""
    esp = await db.get(EspecialidadesArtisticas, id_especialidad)
    if not esp:
        return None
    esp.activo = False
    await db.commit()
    await db.refresh(esp)
    conteo = await _contar_artistas(db)
    return _a_read(esp, conteo.get(esp.id_especialidad, 0))


async def reactivar(db: AsyncSession, id_especialidad: int) -> Optional[EspecialidadRead]:
    esp = await db.get(EspecialidadesArtisticas, id_especialidad)
    if not esp:
        return None
    esp.activo = True
    await db.commit()
    await db.refresh(esp)
    conteo = await _contar_artistas(db)
    return _a_read(esp, conteo.get(esp.id_especialidad, 0))
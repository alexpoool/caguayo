from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func

from src.database.connection import get_session
from src.models import Cliente, Cliente as ClienteModel, Convenio

router = APIRouter(prefix="/convenios", tags=["convenios"], redirect_slashes=False)


@router.get("")
async def listar_convenios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    cliente_id: int = Query(None, description="Filtrar por cliente"),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    from src.models import Cliente, Cliente as ClienteModel

    statement = select(Convenio)
    if cliente_id:
        statement = statement.where(Convenio.id_cliente == cliente_id)
    if search:
        statement = statement.where(Convenio.nombre_convenio.ilike(f"%{search}%"))
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    convenios = results.all()
    return [
        {
            "id_convenio": c.id_convenio,
            "id_cliente": c.id_cliente,
            "nombre_convenio": c.nombre_convenio,
            "fecha": str(c.fecha),
            "vigencia": str(c.vigencia),
            "id_tipo_convenio": c.id_tipo_convenio,
        }
        for c in convenios
    ]


@router.get("/simple")
async def listar_convenios_simple(db: AsyncSession = Depends(get_session)):
    from src.models import Cliente as ClienteModel

    statement = select(Convenio.id_convenio, ClienteModel.nombre).join(
        ClienteModel, isouter=True
    )
    results = await db.exec(statement)
    return [{"id_convenio": c.id_convenio, "nombre": c.nombre} for c in results.all()]


@router.get("/count")
async def contar_convenios(
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    statement = select(func.count(Convenio.id_convenio))
    if search:
        statement = statement.where(Convenio.nombre_convenio.ilike(f"%{search}%"))
    results = await db.exec(statement)
    return results.one()


@router.get("/{convenioid}")
async def obtener_convenio(
    convenioid: int,
    db: AsyncSession = Depends(get_session),
):
    statement = select(Convenio).where(Convenio.id_convenio == convenioid)
    results = await db.exec(statement)
    c = results.first()
    if not c:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")
    return {
        "id_convenio": c.id_convenio,
        "id_cliente": c.id_cliente,
        "nombre_convenio": c.nombre_convenio,
        "fecha": str(c.fecha),
        "vigencia": str(c.vigencia),
        "id_tipo_convenio": c.id_tipo_convenio,
    }


@router.post("", status_code=201)
async def crear_convenio(
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    try:
        datos_convertidos = datos.copy()
        if isinstance(datos_convertidos.get("fecha"), str):
            datos_convertidos["fecha"] = date.fromisoformat(datos_convertidos["fecha"])
        if isinstance(datos_convertidos.get("vigencia"), str):
            datos_convertidos["vigencia"] = date.fromisoformat(
                datos_convertidos["vigencia"]
            )

        db_convenio = Convenio(**datos_convertidos)
        db.add(db_convenio)
        await db.commit()
        await db.refresh(db_convenio)
        return {
            "id_convenio": db_convenio.id_convenio,
            "id_cliente": db_convenio.id_cliente,
            "nombre_convenio": db_convenio.nombre_convenio,
            "fecha": str(db_convenio.fecha),
            "vigencia": str(db_convenio.vigencia),
            "id_tipo_convenio": db_convenio.id_tipo_convenio,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear convenio: {str(e)}"
        )


@router.patch("/{convenioid}")
async def actualizar_convenio(
    convenioid: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    statement = select(Convenio).where(Convenio.id_convenio == convenioid)
    results = await db.exec(statement)
    db_convenio = results.first()
    if not db_convenio:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")

    for key, value in datos.items():
        if value is not None:
            if key in ("fecha", "vigencia") and isinstance(value, str):
                value = date.fromisoformat(value)
            setattr(db_convenio, key, value)

    await db.commit()
    await db.refresh(db_convenio)
    return {
        "id_convenio": db_convenio.id_convenio,
        "id_cliente": db_convenio.id_cliente,
        "nombre_convenio": db_convenio.nombre_convenio,
        "fecha": str(db_convenio.fecha),
        "vigencia": str(db_convenio.vigencia),
        "id_tipo_convenio": db_convenio.id_tipo_convenio,
    }


@router.delete("/{convenioid}", status_code=204)
async def eliminar_convenio(
    convenioid: int,
    db: AsyncSession = Depends(get_session),
):
    statement = select(Convenio).where(Convenio.id_convenio == convenioid)
    results = await db.exec(statement)
    db_convenio = results.first()
    if not db_convenio:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")
    await db.delete(db_convenio)
    await db.commit()

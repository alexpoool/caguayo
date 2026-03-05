from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import ClienteNatural
from sqlmodel import select
from sqlmodel.sql.sqltypes import Enum

router = APIRouter(
    prefix="/clientes-naturales", tags=["clientes-naturales"], redirect_slashes=False
)


@router.get("", response_model=List[ClienteNatural])
async def listar_clientes_naturales(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los clientes personas naturales."""
    statement = select(ClienteNatural).offset(skip).limit(limit)
    results = await db.exec(statement)
    return results.all()


@router.get("/by-cliente/{id_cliente}")
async def obtener_por_cliente(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener datos de persona natural por ID de cliente."""
    statement = select(ClienteNatural).where(ClienteNatural.id_cliente == id_cliente)
    results = await db.exec(statement)
    natural = results.first()
    if not natural:
        return None
    return {
        "id_cliente": natural.id_cliente,
        "nombre": natural.nombre,
        "primer_apellido": natural.primer_apellido,
        "segundo_apellido": natural.segundo_apellido,
        "codigo_expediente": natural.codigo_expediente,
        "numero_registro": natural.numero_registro,
        "carnet_identidad": natural.carnet_identidad,
        "catalogo": natural.catalogo,
        "es_trabajador": natural.es_trabajador,
        "ocupacion": natural.ocupacion,
        "centro_trabajo": natural.centro_trabajo,
        "correo_trabajo": natural.correo_trabajo,
        "direccion_trabajo": natural.direccion_trabajo,
        "telefono_trabajo": natural.telefono_trabajo,
        "en_baja": natural.en_baja,
        "fecha_baja": str(natural.fecha_baja) if natural.fecha_baja else None,
        "vigencia": str(natural.vigencia) if natural.vigencia else None,
    }


@router.post("", status_code=201)
async def crear_cliente_natural(
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Crear datos de persona natural."""
    try:
        db_natural = ClienteNatural(**datos)
        db.add(db_natural)
        await db.commit()
        await db.refresh(db_natural)
        return {"id_cliente": db_natural.id_cliente}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")


@router.put("/{id_cliente}")
async def actualizar_cliente_natural(
    id_cliente: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de persona natural."""
    statement = select(ClienteNatural).where(ClienteNatural.id_cliente == id_cliente)
    results = await db.exec(statement)
    db_natural = results.first()
    if not db_natural:
        raise HTTPException(status_code=404, detail="No encontrado")

    for key, value in datos.items():
        if value is not None:
            setattr(db_natural, key, value)

    await db.commit()
    await db.refresh(db_natural)
    return {"id_cliente": db_natural.id_cliente}


@router.delete("/{id_cliente}", status_code=204)
async def eliminar_cliente_natural(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar datos de persona natural."""
    statement = select(ClienteNatural).where(ClienteNatural.id_cliente == id_cliente)
    results = await db.exec(statement)
    db_natural = results.first()
    if not db_natural:
        raise HTTPException(status_code=404, detail="No encontrado")
    await db.delete(db_natural)
    await db.commit()

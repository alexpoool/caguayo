from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import ClienteNatural
from sqlmodel import select

router = APIRouter(
    prefix="/clientes-naturales", tags=["clientes-naturales"], redirect_slashes=False
)


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
        return {
            "id_cliente_natural": db_natural.id_cliente_natural,
            "id_cliente": db_natural.id_cliente,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")


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
        "id_cliente_natural": natural.id_cliente_natural,
        "id_cliente": natural.id_cliente,
        "codigo_expediente": natural.codigo_expediente,
        "numero_registro": natural.numero_registro,
        "carnet_identidad": natural.carnet_identidad,
        "es_trabajador": natural.es_trabajador,
        "ocupacion": natural.ocupacion,
        "centro_laboral": natural.centro_laboral,
        "centro_trabajo": natural.centro_trabajo,
        "correo_trabajo": natural.correo_trabajo,
        "direccion_trabajo": natural.direccion_trabajo,
        "telefono_trabajo": natural.telefono_trabajo,
        "catalogo": natural.catalogo,
        "baja": natural.baja,
        "fecha_baja": str(natural.fecha_baja) if natural.fecha_baja else None,
        "vigencia": str(natural.vigencia) if natural.vigencia else None,
        "codigo_reeup": natural.codigo_reeup,
        "id_tipo_entidad": natural.id_tipo_entidad,
    }


@router.put("/{id}")
async def actualizar_cliente_natural(
    id: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de persona natural."""
    statement = select(ClienteNatural).where(ClienteNatural.id_cliente_natural == id)
    results = await db.exec(statement)
    db_natural = results.first()
    if not db_natural:
        raise HTTPException(status_code=404, detail="No encontrado")

    for key, value in datos.items():
        if value is not None:
            setattr(db_natural, key, value)

    await db.commit()
    await db.refresh(db_natural)
    return {"id_cliente_natural": db_natural.id_cliente_natural}

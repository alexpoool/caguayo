from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import ClienteTCP
from sqlmodel import select

router = APIRouter(
    prefix="/clientes-tcp", tags=["clientes-tcp"], redirect_slashes=False
)


@router.post("", status_code=201)
async def crear_cliente_tcp(
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Crear datos de TCP."""
    try:
        db_tcp = ClienteTCP(**datos)
        db.add(db_tcp)
        await db.commit()
        await db.refresh(db_tcp)
        return {
            "id_cliente_tcp": db_tcp.id_cliente_tcp,
            "id_cliente": db_tcp.id_cliente,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")


@router.get("/by-cliente/{id_cliente}")
async def obtener_por_cliente(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener datos de TCP por ID de cliente."""
    statement = select(ClienteTCP).where(ClienteTCP.id_cliente == id_cliente)
    results = await db.exec(statement)
    tcp = results.first()
    if not tcp:
        return None
    return {
        "id_cliente_tcp": tcp.id_cliente_tcp,
        "id_cliente": tcp.id_cliente,
        "nombre": tcp.nombre,
        "primer_apellido": tcp.primer_apellido,
        "segundo_apellido": tcp.segundo_apellido,
        "direccion": tcp.direccion,
        "numero_registro_proyecto": tcp.numero_registro_proyecto,
        "fecha_aprobacion": str(tcp.fecha_aprobacion) if tcp.fecha_aprobacion else None,
    }


@router.put("/{id}")
async def actualizar_cliente_tcp(
    id: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de TCP."""
    statement = select(ClienteTCP).where(ClienteTCP.id_cliente_tcp == id)
    results = await db.exec(statement)
    db_tcp = results.first()
    if not db_tcp:
        raise HTTPException(status_code=404, detail="No encontrado")

    for key, value in datos.items():
        if value is not None:
            setattr(db_tcp, key, value)

    await db.commit()
    await db.refresh(db_tcp)
    return {"id_cliente_tcp": db_tcp.id_cliente_tcp}

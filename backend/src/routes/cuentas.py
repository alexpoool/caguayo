from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import Cuenta
from sqlmodel import select

router = APIRouter(prefix="/cuentas", tags=["cuentas"], redirect_slashes=False)


@router.get("/by-cliente/{id_cliente}")
async def obtener_cuentas_por_cliente(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener cuentas por ID de cliente."""
    statement = select(Cuenta).where(Cuenta.id_cliente == id_cliente)
    results = await db.exec(statement)
    cuentas = results.all()
    return [
        {
            "id_cuenta": c.id_cuenta,
            "id_cliente": c.id_cliente,
            "id_dependencia": c.id_dependencia,
            "id_tipo_cuenta": c.id_tipo_cuenta,
            "titular": c.titular,
            "banco": c.banco,
            "sucursal": c.sucursal,
            "direccion": c.direccion,
        }
        for c in cuentas
    ]


@router.post("", status_code=201)
async def crear_cuenta(
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Crear una cuenta."""
    try:
        db_cuenta = Cuenta(**datos)
        db.add(db_cuenta)
        await db.commit()
        await db.refresh(db_cuenta)
        return {"id_cuenta": db_cuenta.id_cuenta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")


@router.put("/{id}")
async def actualizar_cuenta(
    id: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una cuenta."""
    statement = select(Cuenta).where(Cuenta.id_cuenta == id)
    results = await db.exec(statement)
    db_cuenta = results.first()
    if not db_cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    for key, value in datos.items():
        if value is not None:
            setattr(db_cuenta, key, value)

    await db.commit()
    await db.refresh(db_cuenta)
    return {"id_cuenta": db_cuenta.id_cuenta}


@router.delete("/{id}", status_code=204)
async def eliminar_cuenta(
    id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una cuenta."""
    statement = select(Cuenta).where(Cuenta.id_cuenta == id)
    results = await db.exec(statement)
    db_cuenta = results.first()
    if not db_cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    await db.delete(db_cuenta)
    await db.commit()

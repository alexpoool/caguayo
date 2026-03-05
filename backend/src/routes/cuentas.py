from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import Cuenta
from src.dto import CuentaCreate, CuentaRead, CuentaUpdate
from sqlmodel import select

router = APIRouter(prefix="/cuentas", tags=["cuentas"], redirect_slashes=False)


@router.get("", response_model=List[CuentaRead])
async def listar_cuentas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las cuentas."""
    statement = select(Cuenta).offset(skip).limit(limit)
    results = await db.exec(statement)
    return results.all()


@router.get("/by-cliente/{id_cliente}", response_model=List[CuentaRead])
async def obtener_cuentas_por_cliente(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener cuentas por ID de cliente."""
    statement = select(Cuenta).where(Cuenta.id_cliente == id_cliente)
    results = await db.exec(statement)
    return results.all()


@router.get("/{id_cuenta}", response_model=CuentaRead)
async def obtener_cuenta(
    id_cuenta: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una cuenta por ID."""
    statement = select(Cuenta).where(Cuenta.id_cuenta == id_cuenta)
    results = await db.exec(statement)
    cuenta = results.first()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return cuenta


@router.post("", response_model=CuentaRead, status_code=201)
async def crear_cuenta(
    datos: CuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una cuenta."""
    try:
        db_cuenta = Cuenta(**datos.model_dump())
        db.add(db_cuenta)
        await db.commit()
        await db.refresh(db_cuenta)
        return db_cuenta
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear: {str(e)}")


@router.put("/{id_cuenta}", response_model=CuentaRead)
async def actualizar_cuenta(
    id_cuenta: int,
    datos: CuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una cuenta."""
    statement = select(Cuenta).where(Cuenta.id_cuenta == id_cuenta)
    results = await db.exec(statement)
    db_cuenta = results.first()
    if not db_cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    datos_dict = datos.model_dump(exclude_unset=True)
    for key, value in datos_dict.items():
        setattr(db_cuenta, key, value)

    await db.commit()
    await db.refresh(db_cuenta)
    return db_cuenta


@router.delete("/{id_cuenta}", status_code=204)
async def eliminar_cuenta(
    id_cuenta: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una cuenta."""
    statement = select(Cuenta).where(Cuenta.id_cuenta == id_cuenta)
    results = await db.exec(statement)
    db_cuenta = results.first()
    if not db_cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    await db.delete(db_cuenta)
    await db.commit()

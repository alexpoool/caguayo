from typing import List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import (
    Anexo,
    Dependencia,
    Cliente,
    Convenio,
    AnexoProducto,
    Movimiento,
    TipoMovimiento,
)
from src.dto.convenios_dto import AnexoRead, AnexoCreate, AnexoProductoCreate
from src.dto import DependenciaRead
from sqlmodel import select

router = APIRouter(prefix="/anexos", tags=["anexos"], redirect_slashes=False)


@router.get("", response_model=List[AnexoRead])
async def listar_anexos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    convenio_id: int = Query(None, description="Filtrar por convenio"),
    search: str = Query(None, description="Buscar por nombre o número"),
    db: AsyncSession = Depends(get_session),
):
    """Listar anexos con opción de búsqueda y filtro por convenio."""
    statement = select(Anexo).options(
        selectinload(Anexo.convenio)
        .selectinload(Convenio.cliente)
        .selectinload(Cliente.tipo_cliente),
        selectinload(Anexo.convenio).selectinload(Convenio.tipo_convenio),
    )
    if convenio_id:
        statement = statement.where(Anexo.id_convenio == convenio_id)
    if search:
        statement = statement.where(
            (Anexo.nombre_anexo.ilike(f"%{search}%"))
            | (Anexo.numero_anexo.ilike(f"%{search}%"))
        )
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    anexos = results.all()
    return [AnexoRead.from_orm(a) for a in anexos]


@router.get("/{anexo_id}", response_model=AnexoRead)
async def obtener_anexo(
    anexo_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un anexo por ID."""
    statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
    results = await db.exec(statement)
    anexo = results.first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo no encontrado")
    return AnexoRead.from_orm(anexo)


@router.post("", status_code=201)
async def crear_anexo(
    datos: AnexoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo anexo con productos y generar movimientos de recepción."""
    try:
        datos_dict = datos.model_dump(exclude_none=True)
        productos_data = datos_dict.pop("productos", [])

        fecha_anexo = (
            datos.fecha
            if isinstance(datos.fecha, date)
            else date.fromisoformat(str(datos.fecha))
        )

        stmt_convenio = select(Convenio).where(
            Convenio.id_convenio == datos.id_convenio
        )
        result_conv = await db.exec(stmt_convenio)
        convenio = result_conv.first()

        if not convenio:
            raise HTTPException(status_code=400, detail="Convenio no encontrado")

        if datetime.now().date() > convenio.vigencia:
            raise HTTPException(status_code=400, detail="El convenio no está vigente")

        db_anexo = Anexo(**datos_dict)
        db.add(db_anexo)
        await db.flush()

        if db_anexo.id_anexo is None:
            raise HTTPException(status_code=500, detail="Error al crear anexo")

        movimientos_creados = []

        for prod in productos_data:
            db_anexo_prod = AnexoProducto(
                id_anexo=db_anexo.id_anexo,
                id_producto=prod["id_producto"],
                cantidad=prod["cantidad"],
                precio_compra=prod["precio_compra"],
            )
            db.add(db_anexo_prod)
            await db.flush()

            stmt_tipo_mov = select(TipoMovimiento).where(
                TipoMovimiento.tipo == "RECEPCION"
            )
            result_tipo = await db.exec(stmt_tipo_mov)
            tipo_mov = result_tipo.first()

            if not tipo_mov or tipo_mov.id_tipo_movimiento is None:
                raise HTTPException(
                    status_code=500, detail="Tipo de movimiento RECEPCION no encontrado"
                )

            db_movimiento = Movimiento(
                id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                id_dependencia=1,
                id_anexo=db_anexo.id_anexo,
                id_convenio=db_anexo.id_convenio,
                id_cliente=convenio.id_cliente,
                id_producto=prod["id_producto"],
                cantidad=prod["cantidad"],
                fecha=datetime.utcnow(),
                precio_compra=prod["precio_compra"],
                estado="pendiente",
            )
            db.add(db_movimiento)
            await db.flush()

            if db_movimiento.id_movimiento is None:
                raise HTTPException(status_code=500, detail="Error al crear movimiento")

            anio = datetime.utcnow().year
            id_mov = db_movimiento.id_movimiento
            id_cliente = db_movimiento.id_cliente or 0
            id_convenio = db_movimiento.id_convenio or 0
            id_anexo = db_movimiento.id_anexo or 0

            codigo = f"{anio}{id_mov}{id_cliente}{id_convenio}{id_anexo}{prod['id_producto']}"
            db_movimiento.codigo = codigo

            movimientos_creados.append(
                {
                    "id_movimiento": db_movimiento.id_movimiento,
                    "codigo": codigo,
                    "id_producto": prod["id_producto"],
                    "cantidad": prod["cantidad"],
                }
            )

        await db.commit()
        await db.refresh(db_anexo)

        return {
            "id_anexo": db_anexo.id_anexo,
            "id_convenio": db_anexo.id_convenio,
            "nombre_anexo": db_anexo.nombre_anexo,
            "fecha": str(db_anexo.fecha),
            "numero_anexo": db_anexo.numero_anexo,
            "id_dependencia": db_anexo.id_dependencia,
            "comision": float(db_anexo.comision) if db_anexo.comision else None,
            "id_producto": db_anexo.id_producto,
            "movimientos": movimientos_creados,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear anexo: {str(e)}")


@router.patch("/{anexo_id}")
async def actualizar_anexo(
    anexo_id: int,
    datos: dict,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un anexo."""
    statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
    results = await db.exec(statement)
    db_anexo = results.first()
    if not db_anexo:
        raise HTTPException(status_code=404, detail="Anexo no encontrado")

    for key, value in datos.items():
        if value is not None:
            if key == "fecha" and isinstance(value, str):
                value = date.fromisoformat(value)
            setattr(db_anexo, key, value)

    await db.commit()
    await db.refresh(db_anexo)
    return {
        "id_anexo": db_anexo.id_anexo,
        "id_convenio": db_anexo.id_convenio,
        "nombre_anexo": db_anexo.nombre_anexo,
        "fecha": str(db_anexo.fecha),
        "numero_anexo": db_anexo.numero_anexo,
        "id_dependencia": db_anexo.id_dependencia,
        "comision": float(db_anexo.comision) if db_anexo.comision else None,
        "id_producto": db_anexo.id_producto,
    }


@router.delete("/{anexo_id}", status_code=204)
async def eliminar_anexo(
    anexo_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un anexo."""
    statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
    results = await db.exec(statement)
    db_anexo = results.first()
    if not db_anexo:
        raise HTTPException(status_code=404, detail="Anexo no encontrado")
    await db.delete(db_anexo)
    await db.commit()

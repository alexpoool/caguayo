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
from sqlmodel import select, func
from src.services.productos_en_liquidacion_service import agregar_desde_anexo

router = APIRouter(prefix="/anexos", tags=["anexos"], redirect_slashes=False)


@router.get("", response_model=List[AnexoRead])
async def listar_anexos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    convenio_id: int = Query(None, description="Filtrar por convenio"),
    search: str = Query(None, description="Buscar por nombre o código"),
    db: AsyncSession = Depends(get_session),
):
    """Listar anexos con opción de búsqueda y filtro por convenio."""
    statement = select(Anexo).options(
        selectinload(Anexo.convenio).selectinload(Convenio.cliente),
        selectinload(Anexo.convenio).selectinload(Convenio.tipo_convenio),
    )
    if convenio_id:
        statement = statement.where(Anexo.id_convenio == convenio_id)
    if search:
        statement = statement.where(
            (Anexo.nombre_anexo.ilike(f"%{search}%"))
            | (Anexo.codigo_anexo.ilike(f"%{search}%"))
        )
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    anexos = results.all()
    return [AnexoRead.model_validate(a) for a in anexos]


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
    return AnexoRead.model_validate(anexo)


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
        conveni = result_conv.first()

        if not conveni:
            raise HTTPException(status_code=400, detail="Convenio no encontrado")

        if datetime.now().date() > conveni.vigencia:
            raise HTTPException(status_code=400, detail="El convenio no está vigente")

        count_statement = select(func.count(Anexo.id_anexo)).where(
            Anexo.id_convenio == datos.id_convenio
        )
        count_result = await db.exec(count_statement)
        total_anexos = count_result.one()

        numero_anexo = total_anexos + 1
        codigo_anexo = f"{conveni.id_convenio}.{numero_anexo}"

        datos_dict["codigo_anexo"] = codigo_anexo

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
                TipoMovimiento.tipo == "compra"
            )
            result_tipo = await db.exec(stmt_tipo_mov)
            tipo_mov = result_tipo.first()

            if not tipo_mov or tipo_mov.id_tipo_movimiento is None:
                raise HTTPException(
                    status_code=500, detail="Tipo de movimiento 'compra' no encontrado"
                )

            db_movimiento = Movimiento(
                id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                id_dependencia=1,
                id_anexo=db_anexo.id_anexo,
                id_convenio=db_anexo.id_convenio,
                id_cliente=conveni.id_cliente,
                id_producto=prod["id_producto"],
                cantidad=prod["cantidad"],
                fecha=datetime.utcnow(),
                precio_compra=prod["precio_compra"],
                moneda_compra=db_anexo.id_moneda,
                estado="pendiente",
            )
            db.add(db_movimiento)
            await db.flush()

            if db_movimiento.id_movimiento is None:
                raise HTTPException(status_code=500, detail="Error al crear movimiento")

            anio = datetime.utcnow().year
            id_convenio = db_movimiento.id_convenio or 0

            codigo = f"{anio}.{id_convenio}.{codigo_anexo}.{prod['id_producto']}"
            db_movimiento.codigo = codigo

            movimientos_creados.append(
                {
                    "id_movimiento": db_movimiento.id_movimiento,
                    "codigo": codigo,
                    "id_producto": prod["id_producto"],
                    "cantidad": prod["cantidad"],
                }
            )

        productos_para_liquidacion = [
            {
                "id_producto": prod["id_producto"],
                "cantidad": prod["cantidad"],
                "precio": prod.get("precio_compra", 0),
                "id_moneda": db_anexo.id_moneda,
            }
            for prod in productos_data
        ]

        if productos_para_liquidacion:
            await agregar_desde_anexo(db, db_anexo.id_anexo, productos_para_liquidacion)

        await db.commit()
        await db.refresh(db_anexo)

        return {
            "id_anexo": db_anexo.id_anexo,
            "codigo_anexo": db_anexo.codigo_anexo,
            "id_convenio": db_anexo.id_convenio,
            "nombre_anexo": db_anexo.nombre_anexo,
            "fecha": str(db_anexo.fecha),
            "id_moneda": db_anexo.id_moneda,
            "id_dependencia": db_anexo.id_dependencia,
            "comision": float(db_anexo.comision) if db_anexo.comision else None,
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
        "codigo_anexo": db_anexo.codigo_anexo,
        "id_convenio": db_anexo.id_convenio,
        "nombre_anexo": db_anexo.nombre_anexo,
        "fecha": str(db_anexo.fecha),
        "id_moneda": db_anexo.id_moneda,
        "id_dependencia": db_anexo.id_dependencia,
        "comision": float(db_anexo.comision) if db_anexo.comision else None,
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

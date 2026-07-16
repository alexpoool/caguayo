import logging
from typing import List, Optional
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_auth_session, get_session
from src.models import (
    Anexo,
    Convenio,
    ItemAnexo,
    PrecioItemAnexo,
    Movimiento,
    TipoMovimiento,
    Productos,
    TipoConvenio,
)
from src.dto.convenios_dto import AnexoRead, AnexoCreate, AnexoUpdate
from src.utils import generar_codigo, _get_denominacion_from_token, verify_auth
from sqlmodel import select
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anexos", tags=["anexos"], redirect_slashes=False)


def _sanitize_search(search: str) -> str:
    """Escape wildcard characters and return a sanitized search string."""
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return escaped


@router.get("", response_model=List[AnexoRead])
async def listar_anexos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    convenio_id: int = Query(None, description="Filtrar por convenio"),
    search: str = Query(None, description="Buscar por nombre o código"),
    db: AsyncSession = Depends(get_session),
):
    """Listar anexos con opción de búsqueda y filtro por convenio."""
    try:
        statement = select(Anexo).options(
            selectinload(Anexo.convenios).selectinload(Convenio.cliente),
            selectinload(Anexo.convenios).selectinload(Convenio.tipo_convenio),
            selectinload(Anexo.items_anexo).selectinload(ItemAnexo.producto),
            selectinload(Anexo.items_anexo).selectinload(ItemAnexo.precios),
        )
        if convenio_id:
            statement = statement.where(Anexo.id_convenio == convenio_id)
        if search:
            escaped_search = _sanitize_search(search)
            statement = statement.where(
                (Anexo.nombre_anexo.ilike(f"%{escaped_search}%"))
                | (Anexo.codigo_anexo.ilike(f"%{escaped_search}%"))
            )
        statement = statement.offset(skip).limit(limit)
        results = await db.exec(statement)
        anexos = results.all()

        anexo_ids_list = [a.id_anexo for a in anexos if a.items_anexo]
        if anexo_ids_list:
            q = text("""
                SELECT ia.id_anexo, ia.id_item_anexo,
                       COALESCE(SUM(pel.cantidad), 0) as cantidad_liquidada
                FROM item_anexo ia
                LEFT JOIN productos_en_liquidacion pel
                    ON pel.id_anexo = ia.id_anexo
                    AND pel.id_producto = ia.id_producto
                    AND pel.liquidada = true
                WHERE ia.id_anexo = ANY(:anexo_ids)
                GROUP BY ia.id_anexo, ia.id_item_anexo
            """)
            r = await db.exec(q, params={"anexo_ids": anexo_ids_list})
            liquidado_map = {(row[0], row[1]): row[2] for row in r.all()}
            anexos_read = [AnexoRead.model_validate(a) for a in anexos]
            for a in anexos_read:
                if a.items_anexo:
                    for item in a.items_anexo:
                        item.cantidad_liquidada = liquidado_map.get(
                            (a.id_anexo, item.id_item_anexo), 0
                        )
        else:
            anexos_read = [AnexoRead.model_validate(a) for a in anexos]

        return anexos_read
    except Exception as e:
        logger.error("Error en listar_anexos", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{anexo_id}", response_model=AnexoRead)
async def obtener_anexo(
    anexo_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un anexo por ID."""
    statement = (
        select(Anexo)
        .where(Anexo.id_anexo == anexo_id)
        .options(
            selectinload(Anexo.convenios).selectinload(Convenio.cliente),
            selectinload(Anexo.convenios).selectinload(Convenio.tipo_convenio),
            selectinload(Anexo.items_anexo).selectinload(ItemAnexo.producto),
            selectinload(Anexo.items_anexo).selectinload(ItemAnexo.precios),
        )
    )
    results = await db.exec(statement)
    anexo = results.first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo no encontrado")

    anexo_read = AnexoRead.model_validate(anexo)

    if anexo_read.items_anexo:
        q = text("""
            SELECT ia.id_item_anexo,
                   COALESCE(SUM(pel.cantidad), 0) as cantidad_liquidada
            FROM item_anexo ia
            LEFT JOIN productos_en_liquidacion pel
                ON pel.id_anexo = ia.id_anexo
                AND pel.id_producto = ia.id_producto
                AND pel.liquidada = true
            WHERE ia.id_anexo = :id_anexo
            GROUP BY ia.id_item_anexo
        """)
        r = await db.exec(q, params={"id_anexo": anexo_id})
        liquidado_map = {row[0]: row[1] for row in r.all()}
        for item in anexo_read.items_anexo:
            item.cantidad_liquidada = liquidado_map.get(item.id_item_anexo, 0)

    return anexo_read


@router.post("", status_code=201)
async def crear_anexo(
    datos: AnexoCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo anexo con productos y generar movimientos de recepción."""
    try:
        denominacion = await _get_denominacion_from_token(authorization)

        datos_dict = datos.model_dump(exclude_none=True)
        items_data = datos_dict.pop("items", [])

        stmt_convenio = select(Convenio).where(
            Convenio.id_convenio == datos.id_convenio
        )
        result_conv = await db.exec(stmt_convenio)
        conveni = result_conv.first()

        if not conveni:
            raise HTTPException(status_code=400, detail="Convenio no encontrado")

        if datetime.now().date() > conveni.vigencia:
            raise HTTPException(status_code=400, detail="El convenio no está vigente")

        datos_dict["codigo_anexo"] = ""
        db_anexo = Anexo(**datos_dict)
        db.add(db_anexo)
        await db.flush()
        db_anexo.codigo_anexo = generar_codigo(denominacion, datos.fecha.year, db_anexo.id_anexo)
        db.add(db_anexo)
        await db.flush()

        if db_anexo.id_anexo is None:
            raise HTTPException(status_code=500, detail="Error al crear anexo")

        movimientos_creados = []

        stmt_tipo_mov = select(TipoMovimiento).where(TipoMovimiento.tipo == "compra")
        result_tipo = await db.exec(stmt_tipo_mov)
        tipo_mov = result_tipo.first()

        if not tipo_mov or tipo_mov.id_tipo_movimiento is None:
            raise HTTPException(
                status_code=500, detail="Tipo de movimiento 'compra' no encontrado"
            )

        for idx, item in enumerate(items_data, start=1):
            producto = await db.get(Productos, item["id_producto"])
            if not producto:
                continue

            pc_item = item.get("precio_compra") or producto.precio_compra

            db_item = ItemAnexo(
                id_anexo=db_anexo.id_anexo,
                id_producto=item["id_producto"],
                entrada=item["entrada"],
                precio_compra=pc_item,
                precio_venta=item["precio_venta"],
                id_moneda=item["id_moneda"],
                codigo=f"{db_anexo.codigo_anexo}-{idx:03d}",
            )
            db.add(db_item)
            await db.flush()

            for p in item.get("precios", []):
                if p["id_moneda"] == item["id_moneda"]:
                    continue
                db.add(
                    PrecioItemAnexo(
                        id_item_anexo=db_item.id_item_anexo,
                        id_moneda=p["id_moneda"],
                        precio_venta=p["precio_venta"],
                        precio_compra=p.get("precio_compra"),
                    )
                )

            producto.moneda_compra = item["id_moneda"]
            producto.precio_venta = item["precio_venta"]
            producto.moneda_venta = item["id_moneda"]
            producto.precio_minimo = item["precio_venta"] * Decimal("0.8")

            db_movimiento = Movimiento(
                id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                id_dependencia=db_anexo.id_dependencia or 1,
                id_anexo=db_anexo.id_anexo,
                id_convenio=db_anexo.id_convenio,
                id_cliente=conveni.id_cliente,
                id_producto=item["id_producto"],
                cantidad=item["entrada"],
                fecha=datetime.now(timezone.utc).replace(tzinfo=None),
                precio_compra=pc_item,
                moneda_compra=item["id_moneda"],
                precio_venta=item["precio_venta"],
                moneda_venta=item["id_moneda"],
                estado="pendiente",
            )
            db.add(db_movimiento)
            await db.flush()

            if db_movimiento.id_movimiento is None:
                raise HTTPException(status_code=500, detail="Error al crear movimiento")

            anio = datetime.now(timezone.utc).year
            id_convenio_val = db_movimiento.id_convenio or 0

            db_movimiento.codigo = generar_codigo(denominacion or "", anio, db_movimiento.id_movimiento)

            movimientos_creados.append(
                {
                    "id_movimiento": db_movimiento.id_movimiento,
                    "codigo": db_movimiento.codigo,
                    "id_producto": item["id_producto"],
                    "cantidad": item["entrada"],
                }
            )

        await db.commit()
        await db.refresh(db_anexo)

        return {
            "id_anexo": db_anexo.id_anexo,
            "codigo_anexo": db_anexo.codigo_anexo,
            "id_convenio": db_anexo.id_convenio,
            "nombre_anexo": db_anexo.nombre_anexo,
            "fecha": str(db_anexo.fecha),
            "id_dependencia": db_anexo.id_dependencia,
            "comision": float(db_anexo.comision) if db_anexo.comision else None,
            "movimientos": movimientos_creados,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al crear anexo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.patch("/{anexo_id}")
async def actualizar_anexo(
    anexo_id: int,
    datos: AnexoUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un anexo."""
    try:
        await verify_auth(authorization=authorization, db=db)
        denominacion = await _get_denominacion_from_token(authorization)

        statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
        results = await db.exec(statement)
        db_anexo = results.first()
        if not db_anexo:
            raise HTTPException(status_code=404, detail="Anexo no encontrado")

        update_data = datos.model_dump(exclude_unset=True)
        items_data = update_data.pop("items", None)
        db_anexo.sqlmodel_update(update_data)
        await db.flush()

        if items_data is not None:
            stmt_del_mov = select(Movimiento).where(Movimiento.id_anexo == anexo_id)
            result_mov = await db.exec(stmt_del_mov)
            for mov in result_mov.all():
                await db.delete(mov)

            stmt_del_items = select(ItemAnexo).where(ItemAnexo.id_anexo == anexo_id)
            result_items = await db.exec(stmt_del_items)
            for item in result_items.all():
                stmt_del_precios = select(PrecioItemAnexo).where(
                    PrecioItemAnexo.id_item_anexo == item.id_item_anexo
                )
                result_precios = await db.exec(stmt_del_precios)
                for p in result_precios.all():
                    await db.delete(p)
                await db.delete(item)

            await db.flush()

            stmt_tipo_mov = select(TipoMovimiento).where(TipoMovimiento.tipo == "compra")
            result_tipo = await db.exec(stmt_tipo_mov)
            tipo_mov = result_tipo.first()
            if not tipo_mov or tipo_mov.id_tipo_movimiento is None:
                raise HTTPException(
                    status_code=500, detail="Tipo de movimiento 'compra' no encontrado"
                )

            stmt_conv = select(Convenio).where(Convenio.id_convenio == db_anexo.id_convenio)
            result_conv = await db.exec(stmt_conv)
            conveni = result_conv.first()

            for idx, item in enumerate(items_data, start=1):
                producto = await db.get(Productos, item["id_producto"])
                if not producto:
                    continue

                pc_item = item.get("precio_compra") or producto.precio_compra

                db_item = ItemAnexo(
                    id_anexo=db_anexo.id_anexo,
                    id_producto=item["id_producto"],
                    entrada=item["entrada"],
                    precio_compra=pc_item,
                    precio_venta=item["precio_venta"],
                    id_moneda=item["id_moneda"],
                    codigo=f"{db_anexo.codigo_anexo}-{idx:03d}",
                )
                db.add(db_item)
                await db.flush()

                for p in item.get("precios", []):
                    if p["id_moneda"] == item["id_moneda"]:
                        continue
                    db.add(
                        PrecioItemAnexo(
                            id_item_anexo=db_item.id_item_anexo,
                            id_moneda=p["id_moneda"],
                            precio_venta=p["precio_venta"],
                            precio_compra=p.get("precio_compra"),
                        )
                    )

                producto.moneda_compra = item["id_moneda"]
                producto.precio_venta = item["precio_venta"]
                producto.moneda_venta = item["id_moneda"]
                producto.precio_minimo = item["precio_venta"] * Decimal("0.8")

                db_movimiento = Movimiento(
                    id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                    id_dependencia=db_anexo.id_dependencia or 1,
                    id_anexo=db_anexo.id_anexo,
                    id_convenio=db_anexo.id_convenio,
                    id_cliente=conveni.id_cliente if conveni else None,
                    id_producto=item["id_producto"],
                    cantidad=item["entrada"],
                    fecha=datetime.now(timezone.utc).replace(tzinfo=None),
                    precio_compra=pc_item,
                    moneda_compra=item["id_moneda"],
                    precio_venta=item["precio_venta"],
                    moneda_venta=item["id_moneda"],
                    estado="pendiente",
                )
                db.add(db_movimiento)
                await db.flush()

                if db_movimiento.id_movimiento is None:
                    raise HTTPException(status_code=500, detail="Error al crear movimiento")

                anio = datetime.now(timezone.utc).year
                db_movimiento.codigo = generar_codigo(denominacion, anio, db_movimiento.id_movimiento)

        await db.commit()
        await db.refresh(db_anexo)
        return {
            "id_anexo": db_anexo.id_anexo,
            "codigo_anexo": db_anexo.codigo_anexo,
            "id_convenio": db_anexo.id_convenio,
            "nombre_anexo": db_anexo.nombre_anexo,
            "fecha": str(db_anexo.fecha),
            "id_dependencia": db_anexo.id_dependencia,
            "comision": float(db_anexo.comision) if db_anexo.comision else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al actualizar anexo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{anexo_id}", status_code=204)
async def eliminar_anexo(
    anexo_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un anexo."""
    try:
        await verify_auth(authorization=authorization, db=db)

        statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
        results = await db.exec(statement)
        db_anexo = results.first()
        if not db_anexo:
            raise HTTPException(status_code=404, detail="Anexo no encontrado")
        await db.delete(db_anexo)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al eliminar anexo", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")

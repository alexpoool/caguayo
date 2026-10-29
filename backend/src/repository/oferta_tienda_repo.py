from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from decimal import Decimal
from time import monotonic_ns
from sqlalchemy.orm import selectinload
from sqlalchemy import text

from src.repository.base import CRUDBase
from src.models.oferta_tienda import OfertaTienda, ItemOfertaTienda
from src.models.producto import Productos
from src.models.contrato import Factura
from src.dto.oferta_tienda_dto import OfertaTiendaCreate, OfertaTiendaUpdate, ItemOfertaTiendaCreate
from src.repository.contratos_repo import normalize_id
from src.utils.codigos_entidad import generar_codigo_item_oferta_tienda

# Las ofertas anuladas (borrado lógico) no se muestran por defecto; las
# convertidas sí, para conservar el rastro de la factura/pre-factura generada.
ESTADOS_LISTABLES = ("ACTIVA", "CONVERTIDA")
# Estados admitidos por el filtro de la página.
ESTADOS_FILTRO = ("ACTIVA", "CONVERTIDA", "ANULADA", "TODAS")


def _filtro_estado(estado: Optional[str]):
    """Condición de estado para el listado.

    Sin filtro se devuelven las ofertas vigentes (activas y convertidas); las
    anuladas solo aparecen si se piden explícitamente o con `TODAS`.
    """
    if not estado:
        return OfertaTienda.estado.in_(ESTADOS_LISTABLES)
    valor = estado.strip().upper()
    if valor == "TODAS":
        return None
    return OfertaTienda.estado == valor


class OfertaTiendaRepository(CRUDBase[OfertaTienda, OfertaTiendaCreate, OfertaTiendaUpdate]):
    async def get_all_with_details(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[str] = None,
    ) -> List[OfertaTienda]:
        statement = (
            select(OfertaTienda)
            .options(
                selectinload(OfertaTienda.items_oferta_tienda).selectinload(
                    ItemOfertaTienda.producto
                )
            )
            .offset(skip)
            .limit(limit)
            .order_by(OfertaTienda.id_oferta_tienda.desc())
        )
        condicion = _filtro_estado(estado)
        if condicion is not None:
            statement = statement.where(condicion)
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_oferta_tienda: int
    ) -> Optional[OfertaTienda]:
        statement = (
            select(OfertaTienda)
            .options(
                selectinload(OfertaTienda.items_oferta_tienda).selectinload(
                    ItemOfertaTienda.producto
                )
            )
            .where(OfertaTienda.id_oferta_tienda == id_oferta_tienda)
        )
        results = await db.exec(statement)
        return results.first()

    async def get_by_contrato(
        self, db: AsyncSession, id_contrato: int, estado: Optional[str] = None
    ) -> List[OfertaTienda]:
        statement = (
            select(OfertaTienda)
            .options(
                selectinload(OfertaTienda.items_oferta_tienda).selectinload(
                    ItemOfertaTienda.producto
                )
            )
            .where(OfertaTienda.id_contrato == id_contrato)
            .order_by(OfertaTienda.id_oferta_tienda.desc())
        )
        condicion = _filtro_estado(estado)
        if condicion is not None:
            statement = statement.where(condicion)
        results = await db.exec(statement)
        return results.all()

    async def create(
        self, db: AsyncSession, oferta_data: OfertaTiendaCreate
    ) -> OfertaTienda:
        oferta_dict = {
            "id_contrato": normalize_id(oferta_data.id_contrato),
            "codigo_oferta": oferta_data.codigo_oferta or f"TMP_{monotonic_ns()}",
            "descripcion": oferta_data.descripcion,
            "observaciones": oferta_data.observaciones,
            "fecha": oferta_data.fecha,
            "monto": oferta_data.monto or Decimal("0.00"),
        }

        oferta = OfertaTienda(**oferta_dict)
        db.add(oferta)
        await db.commit()
        await db.refresh(oferta)
        return oferta

    async def update(
        self, db: AsyncSession, id_oferta_tienda: int, update_data: OfertaTiendaUpdate
    ) -> Optional[OfertaTienda]:
        oferta = await db.get(OfertaTienda, id_oferta_tienda)
        if not oferta:
            return None

        update_dict = update_data.model_dump(exclude_unset=True, mode="python")

        normalized_dict = {}
        for field, value in update_dict.items():
            normalized_dict[field] = normalize_id(value)

        for field, value in normalized_dict.items():
            setattr(oferta, field, value)

        await db.commit()
        await db.refresh(oferta)
        return oferta


class ItemOfertaTiendaRepository(CRUDBase[ItemOfertaTienda, ItemOfertaTiendaCreate, dict]):
    async def get_by_oferta(
        self, db: AsyncSession, id_oferta_tienda: int
    ) -> List[ItemOfertaTienda]:
        statement = (
            select(ItemOfertaTienda)
            .where(ItemOfertaTienda.id_oferta_tienda == id_oferta_tienda)
            .options(selectinload(ItemOfertaTienda.producto))
        )
        results = await db.exec(statement)
        return results.all()

    async def create_items(
        self,
        db: AsyncSession,
        id_oferta_tienda: int,
        items_data: List[ItemOfertaTiendaCreate],
    ) -> List[ItemOfertaTienda]:
        created_items = []
        for item in items_data:
            producto = await db.get(Productos, item["id_producto"])
            if producto:
                item_dict = {
                    "id_oferta_tienda": id_oferta_tienda,
                    "id_producto": item["id_producto"],
                    "cantidad": item["cantidad"],
                    "precio_compra": producto.precio_compra,
                    "precio_venta": item["precio_venta"],
                    "id_moneda": item["id_moneda"],
                    "id_anexo": item.get("id_anexo"),
                }
                db_item = ItemOfertaTienda(**item_dict)
                db.add(db_item)
                created_items.append(db_item)
        await db.flush()

        oferta = await db.get(OfertaTienda, id_oferta_tienda)
        if oferta and created_items:
            stmt_sec = text(
                "SELECT rn FROM ("
                "  SELECT id_oferta_tienda, "
                "         ROW_NUMBER() OVER ("
                "             PARTITION BY id_contrato ORDER BY fecha, id_oferta_tienda"
                "         ) AS rn"
                "  FROM oferta_tienda"
                ") t WHERE id_oferta_tienda = :id_oferta"
            )
            result_sec = await db.exec(
                stmt_sec, params={"id_oferta": id_oferta_tienda}
            )
            sec_oferta = result_sec.one()[0]

            for db_item in created_items:
                producto = await db.get(Productos, db_item.id_producto)
                db_item.codigo = generar_codigo_item_oferta_tienda(
                    oferta.id_contrato,
                    sec_oferta,
                    producto.codigo if producto else None,
                    db_item.id_producto,
                )
                db.add(db_item)
            await db.flush()
        return created_items


oferta_tienda_repo = OfertaTiendaRepository(OfertaTienda)
item_oferta_tienda_repo = ItemOfertaTiendaRepository(ItemOfertaTienda)

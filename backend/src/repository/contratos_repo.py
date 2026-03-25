from sqlmodel import select, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Any, Union
from decimal import Decimal


def normalize_id(value: Any) -> Any:
    """Normaliza valores que pueden ser objetos anidados o diccionarios a sus IDs."""
    if value is None:
        return None
    if isinstance(value, dict):
        if "id" in value:
            return value["id"]
        for k, v in value.items():
            if k.endswith("_id"):
                return v
        return value
    if hasattr(value, "id"):
        return getattr(value, "id", value)
    return value


from src.repository.base import CRUDBase
from src.models.contrato import (
    Contrato,
    Suplemento,
    Factura,
    VentaEfectivo,
)
from src.models.item_anexo import ItemAnexo
from src.models.item_factura import ItemFactura
from src.models.item_venta_efectivo import ItemVentaEfectivo
from src.models.producto import Productos
from src.dto.contratos_dto import (
    ContratoCreate,
    ContratoUpdate,
    SuplementoCreate,
    SuplementoUpdate,
    FacturaCreate,
    FacturaUpdate,
    VentaEfectivoCreate,
    VentaEfectivoUpdate,
    ItemFacturaCreate,
    ItemVentaEfectivoCreate,
)
from src.dto.convenios_dto import ItemAnexoCreate


class ContratoRepository(CRUDBase[Contrato, ContratoCreate, ContratoUpdate]):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Contrato]:
        statement = (
            select(Contrato)
            .offset(skip)
            .limit(limit)
            .order_by(Contrato.id_contrato.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_contrato: int
    ) -> Optional[Contrato]:
        return await db.get(Contrato, id_contrato)

    async def create(
        self, db: AsyncSession, contrato_data: ContratoCreate, codigo: str = None
    ) -> Contrato:
        contrato_dict = {
            "id_cliente": normalize_id(contrato_data.id_cliente),
            "nombre": contrato_data.nombre,
            "proforma": contrato_data.proforma,
            "id_estado": normalize_id(contrato_data.id_estado),
            "fecha": contrato_data.fecha,
            "vigencia": contrato_data.vigencia,
            "id_tipo_contrato": normalize_id(contrato_data.id_tipo_contrato),
            "id_moneda": normalize_id(contrato_data.id_moneda),
            "monto": contrato_data.monto or Decimal("0.00"),
            "documento_final": contrato_data.documento_final,
            "codigo": codigo,
        }

        contrato = Contrato(**contrato_dict)
        db.add(contrato)
        await db.commit()
        await db.refresh(contrato)
        return contrato

    async def update(
        self, db: AsyncSession, id_contrato: int, update_data: ContratoUpdate
    ) -> Optional[Contrato]:
        contrato = await db.get(Contrato, id_contrato)
        if not contrato:
            return None

        update_dict = update_data.model_dump(exclude_unset=True, mode="python")

        normalized_dict = {}
        for field, value in update_dict.items():
            normalized_dict[field] = normalize_id(value)

        for field, value in normalized_dict.items():
            setattr(contrato, field, value)

        await db.commit()
        await db.refresh(contrato)
        return contrato


class SuplementoRepository(CRUDBase[Suplemento, SuplementoCreate, SuplementoUpdate]):
    async def get_all_by_contrato(
        self, db: AsyncSession, id_contrato: int
    ) -> List[Suplemento]:
        statement = (
            select(Suplemento)
            .where(Suplemento.id_contrato == id_contrato)
            .order_by(Suplemento.id_suplemento.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_suplemento: int
    ) -> Optional[Suplemento]:
        return await db.get(Suplemento, id_suplemento)

    async def create(
        self, db: AsyncSession, suplemento_data: SuplementoCreate, codigo: str = None
    ) -> Suplemento:
        suplemento_dict = {
            "id_contrato": normalize_id(suplemento_data.id_contrato),
            "nombre": suplemento_data.nombre,
            "id_estado": normalize_id(suplemento_data.id_estado),
            "fecha": suplemento_data.fecha,
            "monto": suplemento_data.monto or Decimal("0.00"),
            "documento": suplemento_data.documento,
            "codigo": codigo,
        }

        suplemento = Suplemento(**suplemento_dict)
        db.add(suplemento)
        await db.commit()
        await db.refresh(suplemento)
        return suplemento

    async def update(
        self, db: AsyncSession, id_suplemento: int, update_data: SuplementoUpdate
    ) -> Optional[Suplemento]:
        suplemento = await db.get(Suplemento, id_suplemento)
        if not suplemento:
            return None

        update_dict = update_data.model_dump(exclude_unset=True, mode="python")

        normalized_dict = {}
        for field, value in update_dict.items():
            normalized_dict[field] = normalize_id(value)

        for field, value in normalized_dict.items():
            setattr(suplemento, field, value)

        await db.commit()
        await db.refresh(suplemento)
        return suplemento


class FacturaRepository(CRUDBase[Factura, FacturaCreate, FacturaUpdate]):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Factura]:
        statement = (
            select(Factura)
            .offset(skip)
            .limit(limit)
            .order_by(Factura.id_factura.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_factura: int
    ) -> Optional[Factura]:
        return await db.get(Factura, id_factura)

    async def get_by_contrato(
        self, db: AsyncSession, id_contrato: int
    ) -> List[Factura]:
        statement = (
            select(Factura)
            .where(Factura.id_contrato == id_contrato)
            .order_by(Factura.id_factura.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def create(self, db: AsyncSession, factura_data: FacturaCreate) -> Factura:
        factura_dict = {
            "id_contrato": normalize_id(factura_data.id_contrato),
            "codigo_factura": factura_data.codigo_factura,
            "descripcion": factura_data.descripcion,
            "observaciones": factura_data.observaciones,
            "fecha": factura_data.fecha,
            "monto": factura_data.monto or Decimal("0.00"),
            "pago_actual": factura_data.pago_actual or Decimal("0.00"),
        }

        factura = Factura(**factura_dict)
        db.add(factura)
        await db.commit()
        await db.refresh(factura)
        return factura

    async def update(
        self, db: AsyncSession, id_factura: int, update_data: FacturaUpdate
    ) -> Optional[Factura]:
        factura = await db.get(Factura, id_factura)
        if not factura:
            return None

        update_dict = update_data.model_dump(exclude_unset=True, mode="python")

        normalized_dict = {}
        for field, value in update_dict.items():
            normalized_dict[field] = normalize_id(value)

        for field, value in normalized_dict.items():
            setattr(factura, field, value)

        await db.commit()
        await db.refresh(factura)
        return factura


class VentaEfectivoRepository(
    CRUDBase[VentaEfectivo, VentaEfectivoCreate, VentaEfectivoUpdate]
):
    async def get_all_with_details(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[VentaEfectivo]:
        statement = (
            select(VentaEfectivo)
            .offset(skip)
            .limit(limit)
            .order_by(VentaEfectivo.id_venta_efectivo.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_venta_efectivo: int
    ) -> Optional[VentaEfectivo]:
        return await db.get(VentaEfectivo, id_venta_efectivo)

    async def create(
        self, db: AsyncSession, venta_data: VentaEfectivoCreate, codigo: str = None
    ) -> VentaEfectivo:
        venta_dict = {
            "slip": venta_data.slip,
            "fecha": venta_data.fecha,
            "id_dependencia": normalize_id(venta_data.id_dependencia),
            "cajero": venta_data.cajero,
            "monto": venta_data.monto or Decimal("0.00"),
            "codigo": codigo,
        }

        venta = VentaEfectivo(**venta_dict)
        db.add(venta)
        await db.commit()
        await db.refresh(venta)
        return venta

    async def update(
        self, db: AsyncSession, id_venta_efectivo: int, update_data: VentaEfectivoUpdate
    ) -> Optional[VentaEfectivo]:
        venta = await db.get(VentaEfectivo, id_venta_efectivo)
        if not venta:
            return None

        update_dict = update_data.model_dump(exclude_unset=True, mode="python")

        normalized_dict = {}
        for field, value in update_dict.items():
            normalized_dict[field] = normalize_id(value)

        for field, value in normalized_dict.items():
            setattr(venta, field, value)

        await db.commit()
        await db.refresh(venta)
        return venta


contrato_repo = ContratoRepository(Contrato)
suplemento_repo = SuplementoRepository(Suplemento)
factura_repo = FacturaRepository(Factura)
venta_efectivo_repo = VentaEfectivoRepository(VentaEfectivo)


class ItemAnexoRepository(CRUDBase[ItemAnexo, ItemAnexoCreate, dict]):
    async def get_by_anexo(self, db: AsyncSession, id_anexo: int) -> List[ItemAnexo]:
        statement = select(ItemAnexo).where(ItemAnexo.id_anexo == id_anexo)
        results = await db.exec(statement)
        return results.all()

    async def create_items(
        self, db: AsyncSession, id_anexo: int, items_data: List[ItemAnexoCreate]
    ) -> List[ItemAnexo]:
        created_items = []
        for item in items_data:
            producto = await db.get(Productos, item["id_producto"])
            if producto:
                item_dict = {
                    "id_anexo": id_anexo,
                    "id_producto": item["id_producto"],
                    "cantidad": item["cantidad"],
                    "precio_compra": producto.precio_compra,
                    "precio_venta": item["precio_venta"],
                    "id_moneda": item["id_moneda"],
                }
                db_item = ItemAnexo(**item_dict)
                db.add(db_item)
                created_items.append(db_item)
        await db.flush()
        return created_items


class ItemFacturaRepository(CRUDBase[ItemFactura, ItemFacturaCreate, dict]):
    async def get_by_factura(
        self, db: AsyncSession, id_factura: int
    ) -> List[ItemFactura]:
        statement = select(ItemFactura).where(ItemFactura.id_factura == id_factura)
        results = await db.exec(statement)
        return results.all()

    async def create_items(
        self, db: AsyncSession, id_factura: int, items_data: List[ItemFacturaCreate]
    ) -> List[ItemFactura]:
        created_items = []
        for item in items_data:
            producto = await db.get(Productos, item["id_producto"])
            if producto:
                item_dict = {
                    "id_factura": id_factura,
                    "id_producto": item["id_producto"],
                    "cantidad": item["cantidad"],
                    "precio_compra": producto.precio_compra,
                    "precio_venta": item["precio_venta"],
                    "id_moneda": item["id_moneda"],
                }
                db_item = ItemFactura(**item_dict)
                db.add(db_item)
                created_items.append(db_item)
        await db.flush()
        return created_items


class ItemVentaEfectivoRepository(
    CRUDBase[ItemVentaEfectivo, ItemVentaEfectivoCreate, dict]
):
    async def get_by_venta(
        self, db: AsyncSession, id_venta_efectivo: int
    ) -> List[ItemVentaEfectivo]:
        statement = select(ItemVentaEfectivo).where(
            ItemVentaEfectivo.id_venta_efectivo == id_venta_efectivo
        )
        results = await db.exec(statement)
        return results.all()

    async def create_items(
        self,
        db: AsyncSession,
        id_venta_efectivo: int,
        items_data: List[ItemVentaEfectivoCreate],
    ) -> List[ItemVentaEfectivo]:
        created_items = []
        for item in items_data:
            producto = await db.get(Productos, item["id_producto"])
            if producto:
                item_dict = {
                    "id_venta_efectivo": id_venta_efectivo,
                    "id_producto": item["id_producto"],
                    "cantidad": item["cantidad"],
                    "precio_compra": producto.precio_compra,
                    "precio_venta": item["precio_venta"],
                    "id_moneda": item["id_moneda"],
                }
                db_item = ItemVentaEfectivo(**item_dict)
                db.add(db_item)
                created_items.append(db_item)
        await db.flush()
        return created_items


item_anexo_repo = ItemAnexoRepository(ItemAnexo)
item_factura_repo = ItemFacturaRepository(ItemFactura)
item_venta_efectivo_repo = ItemVentaEfectivoRepository(ItemVentaEfectivo)

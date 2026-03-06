from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import (
    Contrato,
    ContratoProducto,
    Suplemento,
    SuplementoProducto,
    Factura,
    FacturaProducto,
    Pago,
    VentaEfectivo,
    VentaEfectivoProducto,
)
from src.dto import (
    ContratoCreate,
    ContratoUpdate,
    ContratoRead,
    ContratoProductoCreate,
    ContratoProductoUpdate,
    ContratoProductoRead,
    SuplementoCreate,
    SuplementoUpdate,
    SuplementoRead,
    SuplementoProductoCreate,
    SuplementoProductoUpdate,
    SuplementoProductoRead,
    FacturaCreate,
    FacturaUpdate,
    FacturaRead,
    FacturaProductoCreate,
    FacturaProductoUpdate,
    FacturaProductoRead,
    PagoCreate,
    PagoUpdate,
    PagoRead,
    VentaEfectivoCreate,
    VentaEfectivoUpdate,
    VentaEfectivoRead,
    VentaEfectivoProductoCreate,
    VentaEfectivoProductoUpdate,
    VentaEfectivoProductoRead,
)

# Repositorios base
contrato_repo = CRUDBase[Contrato, ContratoCreate, ContratoUpdate](Contrato)
contrato_producto_repo = CRUDBase[ContratoProducto, ContratoProductoCreate, ContratoProductoUpdate](ContratoProducto)
suplemento_repo = CRUDBase[Suplemento, SuplementoCreate, SuplementoUpdate](Suplemento)
suplemento_producto_repo = CRUDBase[SuplementoProducto, SuplementoProductoCreate, SuplementoProductoUpdate](SuplementoProducto)
factura_repo = CRUDBase[Factura, FacturaCreate, FacturaUpdate](Factura)
factura_producto_repo = CRUDBase[FacturaProducto, FacturaProductoCreate, FacturaProductoUpdate](FacturaProducto)
pago_repo = CRUDBase[Pago, PagoCreate, PagoUpdate](Pago)
venta_efectivo_repo = CRUDBase[VentaEfectivo, VentaEfectivoCreate, VentaEfectivoUpdate](VentaEfectivo)
venta_efectivo_producto_repo = CRUDBase[VentaEfectivoProducto, VentaEfectivoProductoCreate, VentaEfectivoProductoUpdate](VentaEfectivoProducto)


# ============== CONTRATO SERVICE ==============
class ContratoService:
    @staticmethod
    async def create(db: AsyncSession, data: ContratoCreate) -> ContratoRead:
        db_obj = await contrato_repo.create(db, obj_in=data)
        return ContratoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> ContratoRead:
        db_obj = await contrato_repo.get(db, id=id)
        return ContratoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ContratoRead]:
        db_objs = await contrato_repo.get_multi(db, skip=skip, limit=limit)
        return [ContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def get_by_cliente(db: AsyncSession, cliente_id: int) -> List[ContratoRead]:
        result = await db.execute(select(Contrato).where(Contrato.id_cliente == cliente_id))
        db_objs = result.scalars().all()
        return [ContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: ContratoUpdate) -> ContratoRead:
        db_obj = await contrato_repo.get(db, id=id)
        if db_obj:
            updated = await contrato_repo.update(db, db_obj=db_obj, obj_in=data)
            return ContratoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await contrato_repo.remove(db, id=id)
        return result is not None


# ============== CONTRATO PRODUCTO SERVICE ==============
class ContratoProductoService:
    @staticmethod
    async def create(db: AsyncSession, data: ContratoProductoCreate) -> ContratoProductoRead:
        db_obj = await contrato_producto_repo.create(db, obj_in=data)
        return ContratoProductoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> ContratoProductoRead:
        db_obj = await contrato_producto_repo.get(db, id=id)
        return ContratoProductoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_by_contrato(db: AsyncSession, contrato_id: int) -> List[ContratoProductoRead]:
        result = await db.execute(select(ContratoProducto).where(ContratoProducto.id_contrato == contrato_id))
        db_objs = result.scalars().all()
        return [ContratoProductoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await contrato_producto_repo.remove(db, id=id)
        return result is not None


# ============== SUPLEMENTO SERVICE ==============
class SuplementoService:
    @staticmethod
    async def create(db: AsyncSession, data: SuplementoCreate) -> SuplementoRead:
        db_obj = await suplemento_repo.create(db, obj_in=data)
        return SuplementoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> SuplementoRead:
        db_obj = await suplemento_repo.get(db, id=id)
        return SuplementoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[SuplementoRead]:
        db_objs = await suplemento_repo.get_multi(db, skip=skip, limit=limit)
        return [SuplementoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def get_by_contrato(db: AsyncSession, contrato_id: int) -> List[SuplementoRead]:
        result = await db.execute(select(Suplemento).where(Suplemento.id_contrato == contrato_id))
        db_objs = result.scalars().all()
        return [SuplementoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: SuplementoUpdate) -> SuplementoRead:
        db_obj = await suplemento_repo.get(db, id=id)
        if db_obj:
            updated = await suplemento_repo.update(db, db_obj=db_obj, obj_in=data)
            return SuplementoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await suplemento_repo.remove(db, id=id)
        return result is not None


# ============== SUPLEMENTO PRODUCTO SERVICE ==============
class SuplementoProductoService:
    @staticmethod
    async def create(db: AsyncSession, data: SuplementoProductoCreate) -> SuplementoProductoRead:
        db_obj = await suplemento_producto_repo.create(db, obj_in=data)
        return SuplementoProductoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> SuplementoProductoRead:
        db_obj = await suplemento_producto_repo.get(db, id=id)
        return SuplementoProductoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_by_suplemento(db: AsyncSession, suplemento_id: int) -> List[SuplementoProductoRead]:
        result = await db.execute(select(SuplementoProducto).where(SuplementoProducto.id_suplemento == suplemento_id))
        db_objs = result.scalars().all()
        return [SuplementoProductoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await suplemento_producto_repo.remove(db, id=id)
        return result is not None


# ============== FACTURA SERVICE ==============
class FacturaService:
    @staticmethod
    async def create(db: AsyncSession, data: FacturaCreate) -> FacturaRead:
        db_obj = await factura_repo.create(db, obj_in=data)
        return FacturaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> FacturaRead:
        db_obj = await factura_repo.get(db, id=id)
        return FacturaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[FacturaRead]:
        db_objs = await factura_repo.get_multi(db, skip=skip, limit=limit)
        return [FacturaRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def get_by_contrato(db: AsyncSession, contrato_id: int) -> List[FacturaRead]:
        result = await db.execute(select(Factura).where(Factura.id_contrato == contrato_id))
        db_objs = result.scalars().all()
        return [FacturaRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: FacturaUpdate) -> FacturaRead:
        db_obj = await factura_repo.get(db, id=id)
        if db_obj:
            updated = await factura_repo.update(db, db_obj=db_obj, obj_in=data)
            return FacturaRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await factura_repo.remove(db, id=id)
        return result is not None


# ============== FACTURA PRODUCTO SERVICE ==============
class FacturaProductoService:
    @staticmethod
    async def create(db: AsyncSession, data: FacturaProductoCreate) -> FacturaProductoRead:
        db_obj = await factura_producto_repo.create(db, obj_in=data)
        return FacturaProductoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> FacturaProductoRead:
        db_obj = await factura_producto_repo.get(db, id=id)
        return FacturaProductoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_by_factura(db: AsyncSession, factura_id: int) -> List[FacturaProductoRead]:
        result = await db.execute(select(FacturaProducto).where(FacturaProducto.id_factura == factura_id))
        db_objs = result.scalars().all()
        return [FacturaProductoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await factura_producto_repo.remove(db, id=id)
        return result is not None


# ============== PAGO SERVICE ==============
class PagoService:
    @staticmethod
    async def create(db: AsyncSession, data: PagoCreate) -> PagoRead:
        db_obj = await pago_repo.create(db, obj_in=data)
        return PagoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> PagoRead:
        db_obj = await pago_repo.get(db, id=id)
        return PagoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[PagoRead]:
        db_objs = await pago_repo.get_multi(db, skip=skip, limit=limit)
        return [PagoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def get_by_factura(db: AsyncSession, factura_id: int) -> List[PagoRead]:
        result = await db.execute(select(Pago).where(Pago.id_factura == factura_id))
        db_objs = result.scalars().all()
        return [PagoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: PagoUpdate) -> PagoRead:
        db_obj = await pago_repo.get(db, id=id)
        if db_obj:
            updated = await pago_repo.update(db, db_obj=db_obj, obj_in=data)
            return PagoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await pago_repo.remove(db, id=id)
        return result is not None


# ============== VENTA EFECTIVO SERVICE ==============
class VentaEfectivoService:
    @staticmethod
    async def create(db: AsyncSession, data: VentaEfectivoCreate) -> VentaEfectivoRead:
        db_obj = await venta_efectivo_repo.create(db, obj_in=data)
        return VentaEfectivoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> VentaEfectivoRead:
        db_obj = await venta_efectivo_repo.get(db, id=id)
        return VentaEfectivoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[VentaEfectivoRead]:
        db_objs = await venta_efectivo_repo.get_multi(db, skip=skip, limit=limit)
        return [VentaEfectivoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def get_by_dependencia(db: AsyncSession, dependencia_id: int) -> List[VentaEfectivoRead]:
        result = await db.execute(select(VentaEfectivo).where(VentaEfectivo.id_dependencia == dependencia_id))
        db_objs = result.scalars().all()
        return [VentaEfectivoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: VentaEfectivoUpdate) -> VentaEfectivoRead:
        db_obj = await venta_efectivo_repo.get(db, id=id)
        if db_obj:
            updated = await venta_efectivo_repo.update(db, db_obj=db_obj, obj_in=data)
            return VentaEfectivoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await venta_efectivo_repo.remove(db, id=id)
        return result is not None


# ============== VENTA EFECTIVO PRODUCTO SERVICE ==============
class VentaEfectivoProductoService:
    @staticmethod
    async def create(db: AsyncSession, data: VentaEfectivoProductoCreate) -> VentaEfectivoProductoRead:
        db_obj = await venta_efectivo_producto_repo.create(db, obj_in=data)
        return VentaEfectivoProductoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> VentaEfectivoProductoRead:
        db_obj = await venta_efectivo_producto_repo.get(db, id=id)
        return VentaEfectivoProductoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_by_venta(db: AsyncSession, venta_id: int) -> List[VentaEfectivoProductoRead]:
        result = await db.execute(select(VentaEfectivoProducto).where(VentaEfectivoProducto.id_venta_efectivo == venta_id))
        db_objs = result.scalars().all()
        return [VentaEfectivoProductoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await venta_efectivo_producto_repo.remove(db, id=id)
        return result is not None

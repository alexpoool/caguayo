from sqlmodel import select, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from decimal import Decimal

from src.repository.base import CRUDBase
from src.models.contrato import (
    Contrato,
    ContratoProducto,
    Suplemento,
    SuplementoProducto,
    Factura,
    FacturaProducto,
    VentaEfectivo,
    VentaEfectivoProducto,
)
from src.dto.contratos_dto import (
    ContratoCreate,
    ContratoUpdate,
    ContratoProductoCreate,
    SuplementoCreate,
    SuplementoUpdate,
    SuplementoProductoCreate,
    FacturaCreate,
    FacturaUpdate,
    FacturaProductoCreate,
    VentaEfectivoCreate,
    VentaEfectivoUpdate,
    VentaEfectivoProductoCreate,
)


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

    async def create_with_productos(
        self, db: AsyncSession, contrato_data: ContratoCreate
    ) -> Contrato:
        productos_data = contrato_data.model_dump().pop("productos", [])
        
        monto_total = Decimal("0.00")
        for prod in productos_data:
            producto = await db.get("src.models.producto.Productos", prod.id_producto)
            if producto:
                monto_total += producto.precio_venta * prod.cantidad
        
        contrato_dict = contrato_data.model_dump()
        contrato_dict["monto"] = monto_total
        
        contrato = Contrato(**contrato_dict)
        db.add(contrato)
        await db.flush()
        
        for prod in productos_data:
            cp = ContratoProducto(
                id_contrato=contrato.id_contrato,
                id_producto=prod.id_producto,
                cantidad=prod.cantidad,
            )
            db.add(cp)
        
        await db.commit()
        await db.refresh(contrato)
        return contrato

    async def update_with_productos(
        self, db: AsyncSession, id_contrato: int, update_data: ContratoUpdate
    ) -> Optional[Contrato]:
        contrato = await db.get(Contrato, id_contrato)
        if not contrato:
            return None
        
        productos_data = None
        if hasattr(update_data, "productos") and update_data.productos:
            productos_data = update_data.model_dump().pop("productos", [])
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if productos_data:
            monto_total = Decimal("0.00")
            for prod in productos_data:
                producto = await db.get("src.models.producto.Productos", prod.id_producto)
                if producto:
                    monto_total += producto.precio_venta * prod.cantidad
            update_dict["monto"] = monto_total
        
        for field, value in update_dict.items():
            setattr(contrato, field, value)
        
        if productos_data:
            existing_productos = await db.exec(
                select(ContratoProducto).where(ContratoProducto.id_contrato == id_contrato)
            )
            for cp in existing_productos.all():
                await db.delete(cp)
            
            for prod in productos_data:
                cp = ContratoProducto(
                    id_contrato=id_contrato,
                    id_producto=prod.id_producto,
                    cantidad=prod.cantidad,
                )
                db.add(cp)
        
        await db.commit()
        await db.refresh(contrato)
        return contrato


class ContratoProductoRepository(CRUDBase[ContratoProducto, ContratoProductoCreate, dict]):
    async def get_by_contrato(
        self, db: AsyncSession, id_contrato: int
    ) -> List[ContratoProducto]:
        statement = select(ContratoProducto).where(
            ContratoProducto.id_contrato == id_contrato
        )
        results = await db.exec(statement)
        return results.all()


class SuplementoRepository(CRUDBase[Suplemento, SuplementoCreate, SuplementoUpdate]):
    async def get_all_by_contrato(
        self, db: AsyncSession, id_contrato: int
    ) -> List[Suplemento]:
        statement = select(Suplemento).where(
            Suplemento.id_contrato == id_contrato
        ).order_by(Suplemento.id_suplemento.desc())
        results = await db.exec(statement)
        return results.all()

    async def get_by_id_with_details(
        self, db: AsyncSession, id_suplemento: int
    ) -> Optional[Suplemento]:
        return await db.get(Suplemento, id_suplemento)

    async def create_with_productos(
        self, db: AsyncSession, suplemento_data: SuplementoCreate
    ) -> Suplemento:
        productos_data = suplemento_data.model_dump().pop("productos", [])
        
        monto_total = Decimal("0.00")
        for prod in productos_data:
            producto = await db.get("src.models.producto.Productos", prod.id_producto)
            if producto:
                monto_total += producto.precio_venta * prod.cantidad
        
        suplemento_dict = suplemento_data.model_dump()
        suplemento_dict["monto"] = monto_total
        
        suplemento = Suplemento(**suplemento_dict)
        db.add(suplemento)
        await db.flush()
        
        for prod in productos_data:
            sp = SuplementoProducto(
                id_suplemento=suplemento.id_suplemento,
                id_producto=prod.id_producto,
                cantidad=prod.cantidad,
            )
            db.add(sp)
        
        await db.commit()
        await db.refresh(suplemento)
        return suplemento

    async def update_with_productos(
        self, db: AsyncSession, id_suplemento: int, update_data: SuplementoUpdate
    ) -> Optional[Suplemento]:
        suplemento = await db.get(Suplemento, id_suplemento)
        if not suplemento:
            return None
        
        productos_data = None
        if hasattr(update_data, "productos") and update_data.productos:
            productos_data = update_data.model_dump().pop("productos", [])
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if productos_data:
            monto_total = Decimal("0.00")
            for prod in productos_data:
                producto = await db.get("src.models.producto.Productos", prod.id_producto)
                if producto:
                    monto_total += producto.precio_venta * prod.cantidad
            update_dict["monto"] = monto_total
        
        for field, value in update_dict.items():
            setattr(suplemento, field, value)
        
        if productos_data:
            existing_productos = await db.exec(
                select(SuplementoProducto).where(SuplementoProducto.id_suplemento == id_suplemento)
            )
            for sp in existing_productos.all():
                await db.delete(sp)
            
            for prod in productos_data:
                sp = SuplementoProducto(
                    id_suplemento=id_suplemento,
                    id_producto=prod.id_producto,
                    cantidad=prod.cantidad,
                )
                db.add(sp)
        
        await db.commit()
        await db.refresh(suplemento)
        return suplemento


class SuplementoProductoRepository(CRUDBase[SuplementoProducto, SuplementoProductoCreate, dict]):
    async def get_by_suplemento(
        self, db: AsyncSession, id_suplemento: int
    ) -> List[SuplementoProducto]:
        statement = select(SuplementoProducto).where(
            SuplementoProducto.id_suplemento == id_suplemento
        )
        results = await db.exec(statement)
        return results.all()


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
        statement = select(Factura).where(
            Factura.id_contrato == id_contrato
        ).order_by(Factura.id_factura.desc())
        results = await db.exec(statement)
        return results.all()

    async def create_with_productos(
        self, db: AsyncSession, factura_data: FacturaCreate
    ) -> Factura:
        productos_data = factura_data.model_dump().pop("productos", [])
        
        monto_total = Decimal("0.00")
        for prod in productos_data:
            producto = await db.get("src.models.producto.Productos", prod.id_producto)
            if producto:
                monto_total += producto.precio_venta * prod.cantidad
        
        factura_dict = factura_data.model_dump()
        factura_dict["monto"] = monto_total
        
        factura = Factura(**factura_dict)
        db.add(factura)
        await db.flush()
        
        for prod in productos_data:
            fp = FacturaProducto(
                id_factura=factura.id_factura,
                id_producto=prod.id_producto,
                cantidad=prod.cantidad,
            )
            db.add(fp)
        
        await db.commit()
        await db.refresh(factura)
        return factura

    async def update_with_productos(
        self, db: AsyncSession, id_factura: int, update_data: FacturaUpdate
    ) -> Optional[Factura]:
        factura = await db.get(Factura, id_factura)
        if not factura:
            return None
        
        productos_data = None
        if hasattr(update_data, "productos") and update_data.productos:
            productos_data = update_data.model_dump().pop("productos", [])
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if productos_data:
            monto_total = Decimal("0.00")
            for prod in productos_data:
                producto = await db.get("src.models.producto.Productos", prod.id_producto)
                if producto:
                    monto_total += producto.precio_venta * prod.cantidad
            update_dict["monto"] = monto_total
        
        for field, value in update_dict.items():
            setattr(factura, field, value)
        
        if productos_data:
            existing_productos = await db.exec(
                select(FacturaProducto).where(FacturaProducto.id_factura == id_factura)
            )
            for fp in existing_productos.all():
                await db.delete(fp)
            
            for prod in productos_data:
                fp = FacturaProducto(
                    id_factura=id_factura,
                    id_producto=prod.id_producto,
                    cantidad=prod.cantidad,
                )
                db.add(fp)
        
        await db.commit()
        await db.refresh(factura)
        return factura


class FacturaProductoRepository(CRUDBase[FacturaProducto, FacturaProductoCreate, dict]):
    async def get_by_factura(
        self, db: AsyncSession, id_factura: int
    ) -> List[FacturaProducto]:
        statement = select(FacturaProducto).where(
            FacturaProducto.id_factura == id_factura
        )
        results = await db.exec(statement)
        return results.all()


class VentaEfectivoRepository(CRUDBase[VentaEfectivo, VentaEfectivoCreate, VentaEfectivoUpdate]):
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

    async def create_with_productos(
        self, db: AsyncSession, venta_data: VentaEfectivoCreate
    ) -> VentaEfectivo:
        productos_data = venta_data.model_dump().pop("productos", [])
        
        monto_total = Decimal("0.00")
        for prod in productos_data:
            producto = await db.get("src.models.producto.Productos", prod.id_producto)
            if producto:
                monto_total += producto.precio_venta * prod.cantidad
        
        venta_dict = venta_data.model_dump()
        venta_dict["monto"] = monto_total
        
        venta = VentaEfectivo(**venta_dict)
        db.add(venta)
        await db.flush()
        
        for prod in productos_data:
            vep = VentaEfectivoProducto(
                id_venta_efectivo=venta.id_venta_efectivo,
                id_producto=prod.id_producto,
                cantidad=prod.cantidad,
            )
            db.add(vep)
        
        await db.commit()
        await db.refresh(venta)
        return venta

    async def update_with_productos(
        self, db: AsyncSession, id_venta_efectivo: int, update_data: VentaEfectivoUpdate
    ) -> Optional[VentaEfectivo]:
        venta = await db.get(VentaEfectivo, id_venta_efectivo)
        if not venta:
            return None
        
        productos_data = None
        if hasattr(update_data, "productos") and update_data.productos:
            productos_data = update_data.model_dump().pop("productos", [])
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if productos_data:
            monto_total = Decimal("0.00")
            for prod in productos_data:
                producto = await db.get("src.models.producto.Productos", prod.id_producto)
                if producto:
                    monto_total += producto.precio_venta * prod.cantidad
            update_dict["monto"] = monto_total
        
        for field, value in update_dict.items():
            setattr(venta, field, value)
        
        if productos_data:
            existing_productos = await db.exec(
                select(VentaEfectivoProducto).where(
                    VentaEfectivoProducto.id_venta_efectivo == id_venta_efectivo
                )
            )
            for vep in existing_productos.all():
                await db.delete(vep)
            
            for prod in productos_data:
                vep = VentaEfectivoProducto(
                    id_venta_efectivo=id_venta_efectivo,
                    id_producto=prod.id_producto,
                    cantidad=prod.cantidad,
                )
                db.add(vep)
        
        await db.commit()
        await db.refresh(venta)
        return venta


class VentaEfectivoProductoRepository(CRUDBase[VentaEfectivoProducto, VentaEfectivoProductoCreate, dict]):
    async def get_by_venta(
        self, db: AsyncSession, id_venta_efectivo: int
    ) -> List[VentaEfectivoProducto]:
        statement = select(VentaEfectivoProducto).where(
            VentaEfectivoProducto.id_venta_efectivo == id_venta_efectivo
        )
        results = await db.exec(statement)
        return results.all()


contrato_repo = ContratoRepository(Contrato)
suplemento_repo = SuplementoRepository(Suplemento)
factura_repo = FacturaRepository(Factura)
venta_efectivo_repo = VentaEfectivoRepository(VentaEfectivo)

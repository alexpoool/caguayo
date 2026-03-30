from typing import List, Optional
from datetime import datetime
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.models import Ventas, DetalleVenta, Cliente, Productos, EstadoVenta
from src.repository.base import CRUDBase
from src.dto import VentaCreate, VentaUpdate


class ClienteRepository(CRUDBase[Cliente, "ClienteCreate", "ClienteUpdate"]):
    async def has_ventas(self, db: AsyncSession, id: int) -> bool:
        statement = select(Ventas).where(Ventas.id_cliente == id).limit(1)
        results = await db.exec(statement)
        return results.first() is not None


class VentasRepository(CRUDBase[Ventas, VentaCreate, VentaUpdate]):
    async def get_by_cliente(
        self, db: AsyncSession, id_cliente: int, skip: int = 0, limit: int = 100
    ) -> List[Ventas]:
        statement = (
            select(self.model)
            .options(
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            )
            .where(self.model.id_cliente == id_cliente)
            .order_by(self.model.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_mes(self, db: AsyncSession, year: int, month: int) -> List[Ventas]:
        statement = (
            select(self.model)
            .options(
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            )
            .where(
                func.extract("year", self.model.fecha) == year,
                func.extract("month", self.model.fecha) == month,
            )
            .order_by(self.model.fecha.desc())
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_estado(
        self, db: AsyncSession, estado: EstadoVenta, skip: int = 0, limit: int = 100
    ) -> List[Ventas]:
        statement = (
            select(self.model)
            .options(
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            )
            .where(self.model.estado == estado)
            .order_by(self.model.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_fecha_range(
        self, db: AsyncSession, fecha_inicio: datetime, fecha_fin: datetime
    ) -> List[Ventas]:
        statement = (
            select(self.model)
            .options(
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            )
            .where(self.model.fecha >= fecha_inicio, self.model.fecha <= fecha_fin)
            .order_by(self.model.fecha.desc())
        )
        results = await db.exec(statement)
        return list(results.all())


class DetalleVentaRepository(
    CRUDBase[DetalleVenta, "DetalleVentaCreate", "DetalleVentaUpdate"]
):
    async def get_by_venta(self, db: AsyncSession, id_venta: int) -> List[DetalleVenta]:
        statement = (
            select(self.model)
            .options(selectinload(DetalleVenta.producto))
            .where(self.model.id_venta == id_venta)
        )
        results = await db.exec(statement)
        return list(results.all())


# Instancias
cliente_repo = ClienteRepository(Cliente)
ventas_repo = VentasRepository(Ventas)
detalle_venta_repo = DetalleVentaRepository(DetalleVenta)

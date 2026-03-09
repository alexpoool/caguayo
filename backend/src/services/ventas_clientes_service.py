from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.ventas_clientes_repo import (
    cliente_repo,
    ventas_repo,
    detalle_venta_repo,
)
from src.models import Ventas, DetalleVenta, EstadoVenta, Productos
from src.dto import (
    VentaCreate,
    VentaRead,
    VentaUpdate,
    DetalleVentaCreate,
    ClienteCreate,
    ClienteRead,
    ClienteUpdate,
    ClienteReadWithVentas,
)


class ClienteService:
    @staticmethod
    async def create_cliente(db: AsyncSession, cliente: ClienteCreate) -> ClienteRead:
        db_cliente = await cliente_repo.create(db, obj_in=cliente)
        return ClienteRead.model_validate(db_cliente)

    @staticmethod
    async def get_cliente(db: AsyncSession, cliente_id: int) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(db, id=cliente_id)
        return ClienteRead.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_cliente_with_ventas(
        db: AsyncSession, cliente_id: int
    ) -> Optional[ClienteReadWithVentas]:
        db_cliente = await cliente_repo.get_with_ventas(db, id=cliente_id)
        return ClienteReadWithVentas.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_clientes(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ClienteRead]:
        db_clientes = await cliente_repo.get_multi(db, skip=skip, limit=limit)
        return [ClienteRead.model_validate(c) for c in db_clientes]

    @staticmethod
    async def update_cliente(
        db: AsyncSession, cliente_id: int, cliente_update: ClienteUpdate
    ) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(db, id=cliente_id)
        if not db_cliente:
            return None

        updated_cliente = await cliente_repo.update(
            db, db_obj=db_cliente, obj_in=cliente_update
        )
        return ClienteRead.model_validate(updated_cliente)

    @staticmethod
    async def delete_cliente(db: AsyncSession, cliente_id: int) -> bool:
        has_ventas = await cliente_repo.has_ventas(db, id=cliente_id)
        if has_ventas:
            raise ValueError(
                "No se puede eliminar el cliente porque tiene ventas asociadas"
            )

        db_cliente = await cliente_repo.remove(db, id=cliente_id)
        return db_cliente is not None

    @staticmethod
    async def get_cliente_by_cedula(
        db: AsyncSession, cedula_rif: str
    ) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get_by_cedula(db, cedula_rif=cedula_rif)
        return ClienteRead.model_validate(db_cliente) if db_cliente else None


class VentasService:
    @staticmethod
    async def create_venta(db: AsyncSession, venta: VentaCreate) -> VentaRead:
        # Calcular el total de la venta
        total = Decimal("0")
        for detalle in venta.detalles:
            detalle.subtotal = Decimal(str(detalle.cantidad)) * detalle.precio_unitario
            total += detalle.subtotal

        # Crear la venta
        fecha = venta.fecha or datetime.utcnow()
        db_venta = Ventas(
            id_cliente=venta.id_cliente,
            fecha=fecha,
            total=total,
            estado=EstadoVenta.PENDIENTE,
            observacion=venta.observacion,
        )
        db.add(db_venta)
        await db.commit()
        await db.refresh(db_venta)

        # Crear los detalles de la venta
        for detalle_data in venta.detalles:
            db_detalle = DetalleVenta(
                id_venta=db_venta.id_venta,
                id_producto=detalle_data.id_producto,
                cantidad=detalle_data.cantidad,
                precio_unitario=detalle_data.precio_unitario,
                subtotal=detalle_data.subtotal,
            )
            db.add(db_detalle)

            # Actualizar stock del producto
            producto = await db.get(Productos, detalle_data.id_producto)
            if producto:
                producto.stock -= detalle_data.cantidad

        await db.commit()

        # Recargar la venta con todas las relaciones
        db_venta = await ventas_repo.get_with_relations(db, id=db_venta.id_venta)
        return VentaRead.model_validate(db_venta)

    @staticmethod
    async def get_venta(db: AsyncSession, venta_id: int) -> Optional[VentaRead]:
        db_venta = await ventas_repo.get_with_relations(db, id=venta_id)
        return VentaRead.model_validate(db_venta) if db_venta else None

    @staticmethod
    async def get_ventas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[VentaRead]:
        db_ventas = await ventas_repo.get_multi_with_relations(
            db, skip=skip, limit=limit
        )
        return [VentaRead.model_validate(v) for v in db_ventas]

    @staticmethod
    async def get_ventas_by_cliente(
        db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[VentaRead]:
        db_ventas = await ventas_repo.get_by_cliente(
            db, id_cliente=cliente_id, skip=skip, limit=limit
        )
        return [VentaRead.model_validate(v) for v in db_ventas]

    @staticmethod
    async def get_ventas_mes_actual(db: AsyncSession) -> List[VentaRead]:
        now = datetime.now()
        db_ventas = await ventas_repo.get_by_mes(db, year=now.year, month=now.month)
        return [VentaRead.model_validate(v) for v in db_ventas]

    @staticmethod
    async def update_venta(
        db: AsyncSession, venta_id: int, venta_update: VentaUpdate
    ) -> Optional[VentaRead]:
        db_venta = await ventas_repo.get(db, id=venta_id)
        if not db_venta:
            return None

        # No permitir editar ventas completadas o anuladas
        if db_venta.estado != EstadoVenta.PENDIENTE:
            raise ValueError("Solo se pueden editar ventas en estado PENDIENTE")

        updated_venta = await ventas_repo.update(
            db, db_obj=db_venta, obj_in=venta_update
        )

        # Recargar con relaciones
        updated_venta = await ventas_repo.get_with_relations(
            db, id=updated_venta.id_venta
        )
        return VentaRead.model_validate(updated_venta)

    @staticmethod
    async def confirmar_venta(db: AsyncSession, venta_id: int) -> Optional[VentaRead]:
        db_venta = await ventas_repo.get(db, id=venta_id)
        if not db_venta:
            return None

        if db_venta.estado != EstadoVenta.PENDIENTE:
            raise ValueError("Solo se pueden confirmar ventas en estado PENDIENTE")

        db_venta.estado = EstadoVenta.COMPLETADA
        db_venta.fecha_actualizacion = datetime.utcnow()
        await db.commit()
        await db.refresh(db_venta)

        # Recargar con relaciones
        db_venta = await ventas_repo.get_with_relations(db, id=db_venta.id_venta)
        return VentaRead.model_validate(db_venta)

    @staticmethod
    async def anular_venta(db: AsyncSession, venta_id: int) -> Optional[VentaRead]:
        db_venta = await ventas_repo.get_with_relations(db, id=venta_id)
        if not db_venta:
            return None

        if db_venta.estado == EstadoVenta.ANULADA:
            raise ValueError("La venta ya está anulada")

        # Si la venta estaba completada, devolver el stock
        if db_venta.estado == EstadoVenta.COMPLETADA:
            for detalle in db_venta.detalles:
                producto = await db.get(Productos, detalle.id_producto)
                if producto:
                    producto.stock += detalle.cantidad

        db_venta.estado = EstadoVenta.ANULADA
        db_venta.fecha_actualizacion = datetime.utcnow()
        await db.commit()
        await db.refresh(db_venta)

        # Recargar con relaciones
        db_venta = await ventas_repo.get_with_relations(db, id=db_venta.id_venta)
        return VentaRead.model_validate(db_venta)

    @staticmethod
    async def delete_venta(db: AsyncSession, venta_id: int) -> bool:
        db_venta = await ventas_repo.get_with_relations(db, id=venta_id)
        if not db_venta:
            return False

        # Si la venta estaba completada, devolver el stock antes de eliminar
        if db_venta.estado == EstadoVenta.COMPLETADA:
            for detalle in db_venta.detalles:
                producto = await db.get(Productos, detalle.id_producto)
                if producto:
                    producto.stock += detalle.cantidad

        # Eliminar detalles primero
        for detalle in db_venta.detalles:
            await db.delete(detalle)

        # Eliminar la venta
        await db.delete(db_venta)
        await db.commit()
        return True

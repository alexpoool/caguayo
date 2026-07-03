import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models import Ventas, DetalleVenta, EstadoVenta
from src.dto.ventas_dto import (
    VentaCreate,
    VentaRead,
    VentaUpdate,
    DetalleVentaCreate,
    DetalleVentaRead,
)
from src.repository.ventas_clientes_repo import ventas_repo, detalle_venta_repo

logger = logging.getLogger(__name__)


class VentaService:
    """Lógica de negocio para operaciones de ventas."""

    @staticmethod
    async def create(
        db: AsyncSession,
        venta_data: VentaCreate,
        nit: Optional[str] = None,
    ) -> VentaRead:
        """Crear una venta con sus detalles, calculando subtotales y total."""
        try:
            fecha = venta_data.fecha or datetime.now(timezone.utc)

            # Crear la venta con total inicial 0
            venta = Ventas(
                id_cliente=venta_data.id_cliente,
                fecha=fecha,
                total=Decimal("0"),
                estado=EstadoVenta.PENDIENTE,
                observacion=venta_data.observacion,
            )
            db.add(venta)
            await db.flush()

            # Crear detalles y acumular total
            total = Decimal("0")
            for detalle_data in venta_data.detalles:
                subtotal = (
                    Decimal(str(detalle_data.cantidad)) * detalle_data.precio_unitario
                )
                total += subtotal
                detalle = DetalleVenta(
                    id_venta=venta.id_venta,
                    id_producto=detalle_data.id_producto,
                    cantidad=detalle_data.cantidad,
                    precio_unitario=detalle_data.precio_unitario,
                    subtotal=subtotal,
                )
                db.add(detalle)

            # Actualizar total
            venta.total = total
            db.add(venta)
            await db.commit()
            await db.refresh(venta)

            # Recargar con eager loading
            return await VentaService.get(db, venta.id_venta)
        except Exception as e:
            await db.rollback()
            logger.error("Error al crear venta", exc_info=True)
            raise

    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        id_cliente: Optional[int] = None,
        estado: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> List[VentaRead]:
        """Listar ventas con filtros opcionales y eager loading."""
        try:
            statement = select(Ventas).options(
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            )

            if id_cliente is not None:
                statement = statement.where(Ventas.id_cliente == id_cliente)
            if estado is not None:
                statement = statement.where(Ventas.estado == estado)
            if fecha_inicio is not None:
                statement = statement.where(Ventas.fecha >= fecha_inicio)
            if fecha_fin is not None:
                statement = statement.where(Ventas.fecha <= fecha_fin)

            statement = (
                statement.order_by(Ventas.fecha.desc()).offset(skip).limit(limit)
            )
            results = await db.exec(statement)
            ventas = list(results.all())
            return [VentaRead.model_validate(v) for v in ventas]
        except Exception as e:
            logger.error("Error al listar ventas", exc_info=True)
            raise

    @staticmethod
    async def get(db: AsyncSession, id_venta: int) -> VentaRead:
        """Obtener una venta por ID con eager loading de relaciones."""
        try:
            load_options = [
                selectinload(Ventas.cliente),
                selectinload(Ventas.detalles).selectinload(DetalleVenta.producto),
            ]
            venta = await ventas_repo.get(db, id_venta, load_options=load_options)
            if not venta:
                raise ValueError(f"Venta con ID {id_venta} no encontrada")
            return VentaRead.model_validate(venta)
        except ValueError:
            raise
        except Exception as e:
            logger.error("Error al obtener venta", exc_info=True)
            raise

    @staticmethod
    async def update(
        db: AsyncSession,
        id_venta: int,
        update_data: VentaUpdate,
    ) -> VentaRead:
        """Actualizar los campos de una venta existente."""
        try:
            venta = await ventas_repo.get(db, id_venta)
            if not venta:
                raise ValueError(f"Venta con ID {id_venta} no encontrada")

            update_dict = update_data.model_dump(exclude_unset=True)
            for field, value in update_dict.items():
                if value is not None and hasattr(venta, field):
                    setattr(venta, field, value)

            venta.fecha_actualizacion = datetime.now(timezone.utc)
            db.add(venta)
            await db.commit()
            await db.refresh(venta)

            return await VentaService.get(db, venta.id_venta)
        except ValueError:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("Error al actualizar venta", exc_info=True)
            raise

    @staticmethod
    async def delete(db: AsyncSession, id_venta: int) -> bool:
        """Eliminar una venta y sus detalles (hard delete con cascada manual)."""
        try:
            venta = await ventas_repo.get(db, id_venta)
            if not venta:
                raise ValueError(f"Venta con ID {id_venta} no encontrada")

            # Eliminar detalles primero
            detalles = await detalle_venta_repo.get_by_venta(db, id_venta)
            for detalle in detalles:
                await db.delete(detalle)
            await db.flush()

            # Eliminar la venta
            await db.delete(venta)
            await db.commit()
            return True
        except ValueError:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("Error al eliminar venta", exc_info=True)
            raise

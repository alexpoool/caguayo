import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models.cliente import Cliente
from src.models.compra import Compra
from src.models.detalle_compra import DetalleCompra
from src.dto.compras_dto import CompraCreate, CompraRead, CompraUpdate
from src.repository.compras_repo import compras_repo, detalle_compra_repo

logger = logging.getLogger(__name__)


class CompraService:
    """Lógica de negocio para operaciones de compras."""

    @staticmethod
    async def create(
        db: AsyncSession,
        compra_data: CompraCreate,
        nit: Optional[str] = None,
    ) -> CompraRead:
        """Crear una compra con sus detalles, calculando subtotales y total."""
        try:
            fecha = compra_data.fecha or datetime.now(timezone.utc).replace(tzinfo=None)

            # Crear la compra con total inicial 0
            compra = Compra(
                id_cliente=compra_data.id_cliente,
                fecha=fecha,
                total=Decimal("0"),
                estado="PENDIENTE",
                observacion=compra_data.observacion,
            )
            db.add(compra)
            await db.flush()

            # Crear detalles y acumular total
            total = Decimal("0")
            for detalle_data in compra_data.detalles:
                subtotal = (
                    Decimal(str(detalle_data.cantidad)) * detalle_data.precio_unitario
                )
                total += subtotal
                detalle = DetalleCompra(
                    id_compra=compra.id_compra,
                    id_producto=detalle_data.id_producto,
                    cantidad=detalle_data.cantidad,
                    precio_unitario=detalle_data.precio_unitario,
                    subtotal=subtotal,
                )
                db.add(detalle)

            # Actualizar total
            compra.total = total
            db.add(compra)
            await db.commit()
            await db.refresh(compra)

            # Recargar con eager loading
            return await CompraService.get(db, compra.id_compra)
        except Exception:
            await db.rollback()
            logger.error("Error al crear compra", exc_info=True)
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
    ) -> List[CompraRead]:
        """Listar compras con filtros opcionales y eager loading."""
        try:
            statement = select(Compra).options(
                selectinload(Compra.cliente).selectinload(Cliente.provincia),
                selectinload(Compra.cliente).selectinload(Cliente.municipio),
                selectinload(Compra.cliente).selectinload(Cliente.cuentas),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_natural),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_juridica),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_tcp),
                selectinload(Compra.detalles).selectinload(DetalleCompra.producto),
            )

            if id_cliente is not None:
                statement = statement.where(Compra.id_cliente == id_cliente)
            if estado is not None:
                statement = statement.where(Compra.estado == estado)
            if fecha_inicio is not None:
                statement = statement.where(Compra.fecha >= fecha_inicio)
            if fecha_fin is not None:
                statement = statement.where(Compra.fecha <= fecha_fin)

            statement = (
                statement.order_by(Compra.fecha.desc()).offset(skip).limit(limit)
            )
            results = await db.exec(statement)
            compras = list(results.all())
            return [CompraRead.model_validate(c) for c in compras]
        except Exception:
            logger.error("Error al listar compras", exc_info=True)
            raise

    @staticmethod
    async def get(db: AsyncSession, id_compra: int) -> CompraRead:
        """Obtener una compra por ID con eager loading de relaciones."""
        try:
            load_options = [
                selectinload(Compra.cliente).selectinload(Cliente.provincia),
                selectinload(Compra.cliente).selectinload(Cliente.municipio),
                selectinload(Compra.cliente).selectinload(Cliente.cuentas),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_natural),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_juridica),
                selectinload(Compra.cliente).selectinload(Cliente.cliente_tcp),
                selectinload(Compra.detalles).selectinload(DetalleCompra.producto),
            ]
            compra = await compras_repo.get(db, id_compra, load_options=load_options)
            if not compra:
                raise ValueError(f"Compra con ID {id_compra} no encontrada")
            return CompraRead.model_validate(compra)
        except ValueError:
            raise
        except Exception:
            logger.error("Error al obtener compra", exc_info=True)
            raise

    @staticmethod
    async def update(
        db: AsyncSession,
        id_compra: int,
        update_data: CompraUpdate,
    ) -> CompraRead:
        """Actualizar los campos de una compra existente."""
        try:
            compra = await compras_repo.get(db, id_compra)
            if not compra:
                raise ValueError(f"Compra con ID {id_compra} no encontrada")

            update_dict = update_data.model_dump(exclude_unset=True)
            for field, value in update_dict.items():
                if value is not None and hasattr(compra, field):
                    setattr(compra, field, value)

            compra.fecha_actualizacion = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(compra)
            await db.commit()
            await db.refresh(compra)

            return await CompraService.get(db, compra.id_compra)
        except ValueError:
            raise
        except Exception:
            await db.rollback()
            logger.error("Error al actualizar compra", exc_info=True)
            raise

    @staticmethod
    async def delete(db: AsyncSession, id_compra: int) -> bool:
        """Eliminar una compra y sus detalles (hard delete con cascada)."""
        try:
            compra = await compras_repo.get(db, id_compra)
            if not compra:
                raise ValueError(f"Compra con ID {id_compra} no encontrada")

            # Eliminar detalles primero
            detalles = await detalle_compra_repo.get_by_compra(db, id_compra)
            for detalle in detalles:
                await db.delete(detalle)
            await db.flush()

            # Eliminar la compra
            await db.delete(compra)
            await db.commit()
            return True
        except ValueError:
            raise
        except Exception:
            await db.rollback()
            logger.error("Error al eliminar compra", exc_info=True)
            raise

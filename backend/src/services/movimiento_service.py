from typing import List, Optional, cast
import logging
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.repository import movimiento_repo
from src.models import Movimiento, TipoMovimiento, Anexo, Productos
from src.dto import (
    MovimientoCreate,
    MovimientoRead,
)

logger = logging.getLogger(__name__)


class MovimientoService:
    @staticmethod
    async def create_movimiento(
        db: AsyncSession, movimiento: MovimientoCreate
    ) -> MovimientoRead:
        logger.info(f"Creando movimiento en servicio: {movimiento}")

        # Crear el movimiento
        db_movimiento = await movimiento_repo.create(db, obj_in=movimiento)
        logger.info(f"Movimiento creado en repo: {db_movimiento}")

        # Generar código autogenerado para TODOS los tipos de movimiento
        # Formato: año + id_movimiento + id_provedor + id_convenio + id_anexo + id_producto
        anio = datetime.utcnow().year
        id_movimiento = db_movimiento.id_movimiento
        id_provedor = db_movimiento.id_provedor or 0
        id_convenio = db_movimiento.id_convenio or 0
        id_anexo = db_movimiento.id_anexo or 0
        id_producto = db_movimiento.id_producto

        codigo = (
            f"{anio}{id_movimiento}{id_provedor}{id_convenio}{id_anexo}{id_producto}"
        )
        db_movimiento.codigo = codigo
        await db.commit()
        await db.refresh(db_movimiento)
        logger.info(f"Código generado para movimiento: {codigo}")

        try:
            # Recargar el movimiento con todas sus relaciones
            if db_movimiento.id_movimiento is None:
                raise ValueError("El movimiento no tiene ID asignado")
            db_movimiento_con_relaciones = await movimiento_repo.get(
                db, db_movimiento.id_movimiento
            )
            if db_movimiento_con_relaciones is None:
                raise ValueError("No se pudo recargar el movimiento con relaciones")

            result = MovimientoRead.from_orm(db_movimiento_con_relaciones)
            logger.info(f"Movimiento convertido a DTO exitosamente")
            return result
        except Exception as e:
            logger.error(
                f"Error al convertir movimiento a DTO: {str(e)}", exc_info=True
            )
            raise

    @staticmethod
    async def get_movimiento(
        db: AsyncSession, movimiento_id: int
    ) -> Optional[MovimientoRead]:
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        return MovimientoRead.from_orm(db_movimiento) if db_movimiento else None

    @staticmethod
    async def get_movimientos(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_multi(db, skip=skip, limit=limit)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    async def get_movimientos_pendientes(db: AsyncSession) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_pendientes(db)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    async def confirmar_movimiento(
        db: AsyncSession, movimiento_id: int
    ) -> MovimientoRead:
        """Confirmar un movimiento cambiando su estado a 'confirmado'.

        Args:
            db: Sesión de base de datos
            movimiento_id: ID del movimiento a confirmar

        Returns:
            MovimientoRead: El movimiento confirmado

        Raises:
            ValueError: Si el movimiento no existe
        """
        # Obtener el movimiento con sus relaciones
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        if not db_movimiento:
            raise ValueError("Movimiento no encontrado")

        # Si ya está confirmado, recargar y devolver
        if db_movimiento.estado == "confirmado":
            return MovimientoRead.from_orm(db_movimiento)

        # Cambiar el estado a confirmado
        db_movimiento.estado = "confirmado"

        # Guardar cambios
        await db.commit()

        # Recargar con relaciones
        db_movimiento_con_relaciones = await movimiento_repo.get(db, movimiento_id)
        if db_movimiento_con_relaciones is None:
            raise ValueError("No se pudo recargar el movimiento después de confirmar")

        return MovimientoRead.from_orm(db_movimiento_con_relaciones)

    @staticmethod
    async def cancelar_movimiento(
        db: AsyncSession, movimiento_id: int
    ) -> MovimientoRead:
        """Cancelar un movimiento cambiando su estado a 'cancelado'.

        Args:
            db: Sesión de base de datos
            movimiento_id: ID del movimiento a cancelar

        Returns:
            MovimientoRead: El movimiento cancelado

        Raises:
            ValueError: Si el movimiento no existe
        """
        # Obtener el movimiento
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        if not db_movimiento:
            raise ValueError("Movimiento no encontrado")

        # Si ya está cancelado, recargar y devolver
        if db_movimiento.estado == "cancelado":
            return MovimientoRead.from_orm(db_movimiento)

        # Cambiar el estado a cancelado
        db_movimiento.estado = "cancelado"

        # Guardar cambios
        await db.commit()

        # Recargar con relaciones
        db_movimiento_con_relaciones = await movimiento_repo.get(db, movimiento_id)
        if db_movimiento_con_relaciones is None:
            raise ValueError("No se pudo recargar el movimiento después de cancelar")

        return MovimientoRead.from_orm(db_movimiento_con_relaciones)

    @staticmethod
    async def eliminar_movimiento(
        db: AsyncSession, movimiento_id: int
    ) -> Optional[MovimientoRead]:
        """Eliminar un movimiento de la base de datos.

        Args:
            db: Sesión de base de datos
            movimiento_id: ID del movimiento a eliminar

        Returns:
            MovimientoRead: El movimiento eliminado, o None si no existía
        """
        # Obtener el movimiento
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        if not db_movimiento:
            return None

        # Eliminar el movimiento
        await movimiento_repo.remove(db, id=movimiento_id)

        return MovimientoRead.from_orm(db_movimiento)

    @staticmethod
    async def get_productos_by_anexo(db: AsyncSession, id_anexo: int) -> List[dict]:
        """Obtener productos únicos disponibles en un anexo específico.

        Returns lista de productos con su cantidad total disponible.
        """
        movimientos = await movimiento_repo.get_by_anexo(db, id_anexo)

        # Agrupar por producto y sumar cantidades
        productos_dict = {}
        for mov in movimientos:
            if mov.id_producto not in productos_dict:
                productos_dict[mov.id_producto] = {
                    "id_producto": mov.id_producto,
                    "nombre": mov.producto.nombre if mov.producto else "",
                    "descripcion": mov.producto.descripcion if mov.producto else None,
                    "cantidad": 0,
                    "codigo": mov.producto.codigo if mov.producto else None,
                }
            productos_dict[mov.id_producto]["cantidad"] += mov.cantidad

        # También verificar si el anexo tiene un producto directamente asignado
        anexo_statement = select(Anexo).where(Anexo.id_anexo == id_anexo)
        anexo_result = await db.exec(anexo_statement)
        anexo = anexo_result.first()

        if anexo and anexo.id_producto and anexo.id_producto not in productos_dict:
            # Consultar el producto directamente
            producto_statement = select(Productos).where(
                Productos.id_producto == anexo.id_producto
            )
            producto_result = await db.exec(producto_statement)
            producto = producto_result.first()

            if producto:
                productos_dict[anexo.id_producto] = {
                    "id_producto": anexo.id_producto,
                    "nombre": producto.nombre,
                    "descripcion": producto.descripcion,
                    "cantidad": 0,
                    "codigo": producto.codigo,
                }

        return list(productos_dict.values())

    @staticmethod
    async def get_productos_con_stock(db: AsyncSession) -> List[dict]:
        """Obtener productos que tienen stock disponible (movimientos confirmados).

        Returns lista de productos con su cantidad total disponible.
        """
        movimientos = await movimiento_repo.get_productos_con_stock(db)

        # Agrupar por producto y sumar cantidades
        productos_dict = {}
        for mov in movimientos:
            if mov.id_producto not in productos_dict:
                productos_dict[mov.id_producto] = {
                    "id_producto": mov.id_producto,
                    "nombre": mov.producto.nombre if mov.producto else "",
                    "descripcion": mov.producto.descripcion if mov.producto else None,
                    "cantidad": 0,
                    "codigo": mov.producto.codigo if mov.producto else None,
                }
            productos_dict[mov.id_producto]["cantidad"] += mov.cantidad

        # Filtrar solo los que tienen cantidad > 0
        return [p for p in productos_dict.values() if p["cantidad"] > 0]

    @staticmethod
    async def get_origen_recepcion(
        db: AsyncSession, id_producto: int
    ) -> Optional[dict]:
        """Obtener información del proveedor/convenio/anexo original de un producto.

        Busca la última recepción confirmada del producto y extrae la información
        del código autogenerado.
        """
        movimiento = await movimiento_repo.get_ultima_recepcion_by_producto(
            db, id_producto
        )

        if not movimiento or not movimiento.codigo:
            return None

        # Parsear el código: año + id_convenio + id_anexo + id_producto + id_movimiento
        # Ejemplo: 202651025100 -> año=2026, convenio=5, anexo=10, producto=25, movimiento=100
        codigo = movimiento.codigo

        # Intentar extraer las partes del código
        # El código tiene formato: YYYY + id_convenio + id_anexo + id_producto + id_movimiento
        # Necesitamos determinar dónde termina cada parte
        try:
            # Extraer año (primeros 4 caracteres)
            anio = int(codigo[:4])

            # Las demás partes dependen de los IDs, intentamos extraer la info de las relaciones
            return {
                "codigo": codigo,
                "anio": anio,
                "proveedor": {
                    "id_provedor": movimiento.id_provedor,
                    "nombre": movimiento.provedor.nombre
                    if movimiento.provedor
                    else None,
                }
                if movimiento.provedor
                else None,
                "convenio": {
                    "id_convenio": movimiento.id_convenio,
                    "nombre": movimiento.convenio.nombre_convenio
                    if movimiento.convenio
                    else None,
                }
                if movimiento.convenio
                else None,
                "anexo": {
                    "id_anexo": movimiento.id_anexo,
                    "nombre": movimiento.anexo.nombre_anexo
                    if movimiento.anexo
                    else None,
                    "numero": movimiento.anexo.numero_anexo
                    if movimiento.anexo
                    else None,
                }
                if movimiento.anexo
                else None,
            }
        except (ValueError, IndexError):
            # Si no se puede parsear, devolver la info básica
            return {
                "codigo": codigo,
                "proveedor": {
                    "id_provedor": movimiento.id_provedor,
                    "nombre": movimiento.provedor.nombre
                    if movimiento.provedor
                    else None,
                }
                if movimiento.provedor
                else None,
                "convenio": {
                    "id_convenio": movimiento.id_convenio,
                    "nombre": movimiento.convenio.nombre_convenio
                    if movimiento.convenio
                    else None,
                }
                if movimiento.convenio
                else None,
                "anexo": {
                    "id_anexo": movimiento.id_anexo,
                    "nombre": movimiento.anexo.nombre_anexo
                    if movimiento.anexo
                    else None,
                    "numero": movimiento.anexo.numero_anexo
                    if movimiento.anexo
                    else None,
                }
                if movimiento.anexo
                else None,
            }

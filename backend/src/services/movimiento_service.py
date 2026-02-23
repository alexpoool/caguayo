from typing import List, Optional, cast
import logging
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from src.repository import movimiento_repo
from src.models import Movimiento, TipoMovimiento, Anexo, Productos, Dependencia
from src.dto import (
    MovimientoCreate,
    MovimientoRead,
    AjusteCreate,
    MovimientoAjusteRead,
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
        db: AsyncSession, skip: int = 0, limit: int | None = None, tipo: str = None
    ) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_multi(
            db, skip=skip, limit=limit, tipo=tipo
        )
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

    @staticmethod
    async def get_recepciones_stock(db: AsyncSession) -> List[dict]:
        """Obtener movimientos de tipo RECEPCION.

        Returns lista de recepciones con información de producto, cantidad y dependencia.
        """
        from src.models import Provedor, Convenio, Anexo, TipoDependencia

        # Primero obtener los movimientos de tipo RECEPCION
        # Buscar el ID del tipo RECEPCION
        tipo_statement = select(TipoMovimiento).where(
            TipoMovimiento.tipo == "RECEPCION"
        )
        tipo_result = await db.exec(tipo_statement)
        tipo_recepcion = tipo_result.first()

        if not tipo_recepcion:
            return []

        # Obtener solo movimientos de tipo RECEPCION confirmados
        statement = (
            select(Movimiento)
            .where(Movimiento.id_tipo_movimiento == tipo_recepcion.id_tipo_movimiento)
            .where(Movimiento.estado == "confirmado")
            .order_by(Movimiento.fecha.desc())
        )
        results = await db.exec(statement)
        movimientos = results.all()

        recepciones = []
        for mov in movimientos:
            # Obtener producto
            producto = await db.get(Productos, mov.id_producto)
            if not producto:
                continue

            # Obtener dependencia
            dependencia = await db.get(Dependencia, mov.id_dependencia)
            dependencia_nombre = (
                dependencia.nombre if dependencia else "Sin dependencia"
            )

            # Obtener proveedor
            proveedor_nombre = None
            if mov.id_provedor:
                proveedor = await db.get(Provedor, mov.id_provedor)
                if proveedor:
                    proveedor_nombre = proveedor.nombre

            # Obtener anexo
            anexo_nombre = None
            anexo_numero = None
            if mov.id_anexo:
                anexo = await db.get(Anexo, mov.id_anexo)
                if anexo:
                    anexo_nombre = anexo.nombre_anexo
                    anexo_numero = anexo.numero_anexo

            # Obtener convento
            convenioconvenio_nombre = None
            if mov.id_convenio:
                convento = await db.get(Convenio, mov.id_convenio)
                if convento:
                    convenioconvenio_nombre = convento.nombre_convenio

            recepciones.append(
                {
                    "id_movimiento": mov.id_movimiento,
                    "id_producto": mov.id_producto,
                    "nombre_producto": producto.nombre,
                    "codigo_producto": producto.codigo,
                    "cantidad": mov.cantidad,
                    "id_dependencia": mov.id_dependencia,
                    "nombre_dependencia": dependencia_nombre,
                    "id_proveedor": mov.id_provedor,
                    "proveedor_nombre": proveedor_nombre,
                    "id_convenio": mov.id_convenio,
                    "convenio_nombre": convenioconvenio_nombre,
                    "id_anexo": mov.id_anexo,
                    "anexo_nombre": anexo_nombre,
                    "anexo_numero": anexo_numero,
                    "fecha": mov.fecha,
                    "codigo": mov.codigo,
                }
            )

        return recepciones

    @staticmethod
    async def crear_ajuste(
        db: AsyncSession, ajuste: AjusteCreate
    ) -> List[MovimientoAjusteRead]:
        """Crear movimientos de ajuste (quitar de origen, agregar a destinos).

        Args:
            db: Sesión de base de datos
            ajuste: Datos del ajuste

        Returns:
            Lista de movimientos creados (quitar + agregar)
        """
        # Obtener el movimiento origen para validar y copiar datos
        origen = await movimiento_repo.get(db, ajuste.id_movimiento_origen)
        if not origen:
            raise ValueError("Movimiento de origen no encontrado")

        if origen.estado != "confirmado":
            raise ValueError("El movimiento de origen debe estar confirmado")

        # Validar que la cantidad total en destinos no exceda la cantidad en origen
        cantidad_total_destinos = sum(d.cantidad for d in ajuste.destinos)
        if cantidad_total_destinos > origen.cantidad:
            raise ValueError(
                f"La cantidad total en destinos ({cantidad_total_destinos}) "
                f"no puede exceder la cantidad en origen ({origen.cantidad})"
            )

        # Obtener tipos de movimiento AJUSTE_QUITAR y AJUSTE_AGREGAR
        statement_tipo_quitar = select(TipoMovimiento).where(
            TipoMovimiento.tipo == "AJUSTE_QUITAR"
        )
        result_tipo_quitar = await db.exec(statement_tipo_quitar)
        tipo_quitar = result_tipo_quitar.first()

        if not tipo_quitar:
            raise ValueError("Tipo de movimiento AJUSTE_QUITAR no encontrado")

        statement_tipo_agregar = select(TipoMovimiento).where(
            TipoMovimiento.tipo == "AJUSTE_AGREGAR"
        )
        result_tipo_agregar = await db.exec(statement_tipo_agregar)
        tipo_agregar = result_tipo_agregar.first()

        if not tipo_agregar:
            raise ValueError("Tipo de movimiento AJUSTE_AGREGAR no encontrado")

        movimientos_creados = []
        fecha = (
            datetime.utcnow()
            if not ajuste.fecha
            else datetime.fromisoformat(ajuste.fecha)
        )

        # Crear movimiento de quitar (AJUSTE_QUITAR)
        movimiento_quitar = Movimiento(
            id_tipo_movimiento=tipo_quitar.id_tipo_movimiento,
            id_dependencia=origen.id_dependencia,
            id_anexo=origen.id_anexo,
            id_producto=origen.id_producto,
            cantidad=cantidad_total_destinos,
            fecha=fecha,
            observacion=ajuste.observacion,
            id_convenio=origen.id_convenio,
            id_provedor=origen.id_provedor,
            precio_compra=origen.precio_compra,
            id_moneda_compra=origen.id_moneda_compra,
            precio_venta=origen.precio_venta,
            id_moneda_venta=origen.id_moneda_venta,
            estado="pendiente",
        )
        db.add(movimiento_quitar)

        # Generar código para movimiento quitar
        anio = fecha.year
        id_mov_quitar = None  # Se asignará después de flush

        # Flush para obtener el ID
        await db.flush()
        id_mov_quitar = movimiento_quitar.id_movimiento
        if not id_mov_quitar:
            raise ValueError("No se pudo obtener ID para movimiento de quitar")

        codigo_quitar = f"{anio}{id_mov_quitar}{origen.id_provedor or 0}{origen.id_convenio or 0}{origen.id_anexo or 0}{origen.id_producto}"
        movimiento_quitar.codigo = codigo_quitar

        # Obtener nombre de dependencia origen
        dep_origen = await db.get(Dependencia, origen.id_dependencia)
        nombre_dep_origen = dep_origen.nombre if dep_origen else None

        movimientos_creados.append(
            MovimientoAjusteRead(
                id_movimiento=id_mov_quitar,
                tipo="AJUSTE_QUITAR",
                cantidad=cantidad_total_destinos,
                id_dependencia=origen.id_dependencia,
                dependencia_nombre=nombre_dep_origen,
            )
        )

        # Crear movimientos de agregar (AJUSTE_AGREGAR) para cada destino
        for destino in ajuste.destinos:
            movimiento_agregar = Movimiento(
                id_tipo_movimiento=tipo_agregar.id_tipo_movimiento,
                id_dependencia=destino.id_dependencia,
                id_anexo=origen.id_anexo,
                id_producto=origen.id_producto,
                cantidad=destino.cantidad,
                fecha=fecha,
                observacion=ajuste.observacion,
                id_convenio=origen.id_convenio,
                id_provedor=origen.id_provedor,
                precio_compra=origen.precio_compra,
                id_moneda_compra=origen.id_moneda_compra,
                precio_venta=origen.precio_venta,
                id_moneda_venta=origen.id_moneda_venta,
                estado="pendiente",
            )
            db.add(movimiento_agregar)

            # Flush para obtener el ID
            await db.flush()
            id_mov_agregar = movimiento_agregar.id_movimiento
            if not id_mov_agregar:
                raise ValueError("No se pudo obtener ID para movimiento de agregar")

            codigo_agregar = f"{anio}{id_mov_agregar}{origen.id_provedor or 0}{origen.id_convenio or 0}{origen.id_anexo or 0}{origen.id_producto}"
            movimiento_agregar.codigo = codigo_agregar

            # Obtener nombre de dependencia destino
            dep_destino = await db.get(Dependencia, destino.id_dependencia)
            nombre_dep_destino = dep_destino.nombre if dep_destino else None

            movimientos_creados.append(
                MovimientoAjusteRead(
                    id_movimiento=id_mov_agregar,
                    tipo="AJUSTE_AGREGAR",
                    cantidad=destino.cantidad,
                    id_dependencia=destino.id_dependencia,
                    dependencia_nombre=nombre_dep_destino,
                )
            )

        # Commit de todos los movimientos
        await db.commit()

        return movimientos_creados

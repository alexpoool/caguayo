from typing import List, Optional, cast
import logging
import os
from datetime import datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from sqlalchemy.orm import selectinload
import psycopg2
from src.repository import movimiento_repo
from src.models import (
    Movimiento,
    TipoMovimiento,
    Anexo,
    Productos,
    Dependencia,
    ItemAnexo,
)
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

        # Validar que la dependencia existe
        dep = await db.get(Dependencia, movimiento.id_dependencia)
        if not dep:
            raise ValueError(
                f"La dependencia con id {movimiento.id_dependencia} no existe"
            )

        # Validar que el producto existe
        prod = await db.get(Productos, movimiento.id_producto)
        if not prod:
            raise ValueError(f"El producto con id {movimiento.id_producto} no existe")

        # Crear el movimiento
        db_movimiento = await movimiento_repo.create(db, obj_in=movimiento)
        logger.info(f"Movimiento creado en repo: {db_movimiento}")

        # Si el código no viene del frontend, no se autogenera
        if not db_movimiento.codigo:
            logger.info("Código no proporcionado por frontend, se guardará sin código")

        try:
            # Recargar el movimiento con todas sus relaciones
            if db_movimiento.id_movimiento is None:
                raise ValueError("El movimiento no tiene ID asignado")
            db_movimiento_con_relaciones = await movimiento_repo.get(
                db, db_movimiento.id_movimiento
            )
            if db_movimiento_con_relaciones is None:
                raise ValueError("No se pudo recargar el movimiento con relaciones")

            result = MovimientoRead.model_validate(db_movimiento_con_relaciones)
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
        results = []
        for m in db_movimientos:
            try:
                results.append(MovimientoRead.model_validate(m, from_attributes=True))
            except Exception as e:
                logger.warning(f"Error validating movimiento {m.id_movimiento}: {e}")
                continue
        return results

    @staticmethod
    async def get_movimientos_pendientes(db: AsyncSession) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_pendientes(db)
        results = []
        for m in db_movimientos:
            try:
                results.append(MovimientoRead.model_validate(m, from_attributes=True))
            except Exception as e:
                logger.warning(f"Error validating movimiento {m.id_movimiento}: {e}")
                continue
        return results

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
        """Obtener productos únicos disponibles en un anexo específico desde item_anexo.

        Returns lista de productos con su cantidad, precios e info de convenio/anexo.
        """
        from src.models import Anexo

        statement = (
            select(ItemAnexo)
            .options(selectinload(ItemAnexo.producto))
            .where(ItemAnexo.id_anexo == id_anexo)
        )
        results = await db.exec(statement)
        items_anexo = results.all()

        anexo_statement = select(Anexo).where(Anexo.id_anexo == id_anexo)
        anexo_result = await db.exec(anexo_statement)
        anexo = anexo_result.first()
        id_convenio = anexo.id_convenio if anexo else None

        productos_list = []
        for item in items_anexo:
            if item.producto:
                productos_list.append(
                    {
                        "id_producto": item.id_producto,
                        "nombre": item.producto.nombre,
                        "descripcion": item.producto.descripcion,
                        "cantidad": item.cantidad,
                        "codigo": item.producto.codigo,
                        "precio_compra": float(item.precio_compra)
                        if item.precio_compra
                        else None,
                        "precio_venta": float(item.precio_venta)
                        if item.precio_venta
                        else None,
                        "id_anexo": item.id_anexo,
                        "id_convenio": id_convenio,
                    }
                )

        return productos_list

    @staticmethod
    async def get_productos_by_factura(db: AsyncSession, id_factura: int) -> List[dict]:
        """Obtener productos únicos disponibles en una factura específica.

        Returns lista de productos con su cantidad total disponible.
        """
        movimientos = await movimiento_repo.get_by_factura(db, id_factura)

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

        return list(productos_dict.values())

    @staticmethod
    async def get_productos_con_stock(db: AsyncSession) -> List[dict]:
        """Obtener productos que tienen stock disponible (movimientos confirmados).

        Returns lista de productos con su cantidad total disponible e info de anexo/convenio.
        Si el movimiento no tiene id_anexo/id_convenio, busca en item_anexo.
        """
        from src.models import Anexo

        movimientos = await movimiento_repo.get_productos_con_stock(db)

        productos_dict = {}
        for mov in movimientos:
            id_anexo = mov.id_anexo
            id_convenio = mov.id_convenio

            if not id_anexo or not id_convenio:
                item_stmt = (
                    select(ItemAnexo)
                    .where(ItemAnexo.id_producto == mov.id_producto)
                    .limit(1)
                )
                item_result = await db.exec(item_stmt)
                item = item_result.first()
                if item:
                    id_anexo = id_anexo or item.id_anexo
                    if not id_convenio:
                        anexo_stmt = select(Anexo).where(
                            Anexo.id_anexo == item.id_anexo
                        )
                        anexo_result = await db.exec(anexo_stmt)
                        anexo = anexo_result.first()
                        if anexo:
                            id_convenio = anexo.id_convenio

            cantidad_ajustada = mov.cantidad
            if mov.id_producto not in productos_dict:
                productos_dict[mov.id_producto] = {
                    "id_producto": mov.id_producto,
                    "nombre": mov.producto.nombre if mov.producto else "",
                    "descripcion": mov.producto.descripcion if mov.producto else None,
                    "cantidad": cantidad_ajustada,
                    "codigo": mov.producto.codigo if mov.producto else None,
                    "id_anexo": id_anexo,
                    "id_convenio": id_convenio,
                }
            else:
                productos_dict[mov.id_producto]["cantidad"] += cantidad_ajustada

        return [p for p in productos_dict.values() if p["cantidad"] > 0]

    @staticmethod
    async def get_productos_con_stock_por_dependencia(
        db: AsyncSession, id_dependencia: int
    ) -> List[dict]:
        """Obtener productos con movimientos de entrada en una dependencia específica.

        Returns lista de productos con cantidad del último movimiento RECEPCION/compra.
        """
        from src.models import Anexo

        movimientos = await movimiento_repo.get_productos_con_stock_por_dependencia(
            db, id_dependencia
        )

        productos_dict = {}
        for mov in movimientos:
            id_anexo = mov.id_anexo
            id_convenio = mov.id_convenio

            if not id_anexo or not id_convenio:
                item_stmt = (
                    select(ItemAnexo)
                    .where(ItemAnexo.id_producto == mov.id_producto)
                    .limit(1)
                )
                item_result = await db.exec(item_stmt)
                item = item_result.first()
                if item:
                    id_anexo = id_anexo or item.id_anexo
                    if not id_convenio:
                        anexo_stmt = select(Anexo).where(
                            Anexo.id_anexo == item.id_anexo
                        )
                        anexo_result = await db.exec(anexo_stmt)
                        anexo = anexo_result.first()
                        if anexo:
                            id_convenio = anexo.id_convenio

            if mov.id_producto not in productos_dict:
                productos_dict[mov.id_producto] = {
                    "id_producto": mov.id_producto,
                    "nombre": mov.producto.nombre if mov.producto else "",
                    "descripcion": mov.producto.descripcion if mov.producto else None,
                    "cantidad": mov.cantidad,
                    "codigo": mov.producto.codigo if mov.producto else None,
                    "id_anexo": id_anexo,
                    "id_convenio": id_convenio,
                }
            else:
                productos_dict[mov.id_producto]["cantidad"] += mov.cantidad

        return list(productos_dict.values())

    @staticmethod
    async def get_stock_producto_dependencia(
        db: AsyncSession, producto_id: int, dependencia_id: int
    ) -> int:
        """Obtener la suma de cantidades de movimientos de tipo RECEPCION/compra
        para un producto en una dependencia específica.
        """
        statement = (
            select(func.sum(Movimiento.cantidad))
            .join(TipoMovimiento)
            .where(
                Movimiento.id_producto == producto_id,
                Movimiento.id_dependencia == dependencia_id,
                Movimiento.estado == "confirmado",
                TipoMovimiento.tipo.in_(["RECEPCION", "compra"]),
            )
        )
        result = await db.exec(statement)
        total = result.one_or_none()
        return int(total) if total else 0

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
                    "id_cliente": movimiento.id_cliente,
                    "nombre": movimiento.cliente.nombre if movimiento.cliente else None,
                }
                if movimiento.cliente
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
                    "id_cliente": movimiento.id_cliente,
                    "nombre": movimiento.cliente.nombre if movimiento.cliente else None,
                }
                if movimiento.cliente
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
        from src.models import Cliente, Convenio, Anexo, TipoDependencia

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

            # Obtener cliente
            cliente_nombre = None
            if mov.id_cliente:
                from src.models import Cliente

                cliente = await db.get(Cliente, mov.id_cliente)
                if cliente:
                    cliente_nombre = cliente.nombre

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
                    "id_proveedor": mov.id_cliente,
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
            ajuste: Datos del ajuste (id_movimiento_origen O id_producto + id_dependencia_origen)

        Returns:
            Lista de movimientos creados (quitar + agregar)
        """
        cantidad_total_destinos = sum(d.cantidad for d in ajuste.destinos)

        if ajuste.id_movimiento_origen:
            origen = await movimiento_repo.get(db, ajuste.id_movimiento_origen)
            if not origen:
                raise ValueError("Movimiento de origen no encontrado")
            if origen.estado != "confirmado":
                raise ValueError("El movimiento de origen debe estar confirmado")
            if cantidad_total_destinos > origen.cantidad:
                raise ValueError(
                    f"La cantidad total en destinos ({cantidad_total_destinos}) "
                    f"no puede exceder la cantidad en origen ({origen.cantidad})"
                )
        elif ajuste.id_producto and ajuste.id_dependencia_origen:
            stmt = (
                select(Movimiento)
                .where(
                    Movimiento.id_producto == ajuste.id_producto,
                    Movimiento.id_dependencia == ajuste.id_dependencia_origen,
                    Movimiento.estado == "confirmado",
                )
                .order_by(Movimiento.fecha.desc())
                .limit(1)
            )
            result = await db.exec(stmt)
            origen = result.first()
            if not origen:
                stmt2 = (
                    select(Movimiento)
                    .where(
                        Movimiento.id_producto == ajuste.id_producto,
                        Movimiento.estado == "confirmado",
                    )
                    .order_by(Movimiento.fecha.desc())
                    .limit(1)
                )
                result2 = await db.exec(stmt2)
                origen = result2.first()
                if not origen:
                    raise ValueError(
                        "No se encontró movimiento de origen para el producto seleccionado"
                    )
        else:
            raise ValueError(
                "Debe proporcionar id_movimiento_origen o id_producto + id_dependencia_origen"
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
        codigo_ajuste = ajuste.codigo or ""

        # Crear movimiento de quitar (AJUSTE_QUITAR)
        movimiento_quitar = Movimiento(
            id_tipo_movimiento=tipo_quitar.id_tipo_movimiento,
            id_dependencia=origen.id_dependencia,
            id_anexo=origen.id_anexo,
            id_producto=origen.id_producto,
            cantidad=cantidad_total_destinos,
            fecha=fecha,
            observacion=ajuste.observacion,
            id_cliente=origen.id_cliente,
            precio_compra=origen.precio_compra,
            moneda_compra=origen.moneda_compra,
            precio_venta=origen.precio_venta,
            moneda_venta=origen.moneda_venta,
            id_convenio=origen.id_convenio,
            estado="pendiente",
            codigo=codigo_ajuste,
        )
        db.add(movimiento_quitar)

        # Flush para obtener el ID
        await db.flush()
        id_mov_quitar = movimiento_quitar.id_movimiento
        if not id_mov_quitar:
            raise ValueError("No se pudo obtener ID para movimiento de quitar")

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
                id_cliente=origen.id_cliente,
                precio_compra=origen.precio_compra,
                moneda_compra=origen.moneda_compra,
                precio_venta=origen.precio_venta,
                moneda_venta=origen.moneda_venta,
                id_convenio=origen.id_convenio,
                estado="pendiente",
                codigo=codigo_ajuste,
            )
            db.add(movimiento_agregar)

            # Flush para obtener el ID
            await db.flush()
            id_mov_agregar = movimiento_agregar.id_movimiento
            if not id_mov_agregar:
                raise ValueError("No se pudo obtener ID para movimiento de agregar")

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

    @staticmethod
    def crear_movimiento_en_otra_db(
        nombre_database: str,
        movimiento_data: dict,
    ) -> dict:
        """Crear un movimiento en otra base de datos.

        Args:
            nombre_database: Nombre de la base de datos destino
            movimiento_data: Datos del movimiento a crear

        Returns:
            Dictionary con los datos del movimiento creado
        """
        try:
            conn = psycopg2.connect(
                host=os.getenv("ADMIN_DB_HOST", "localhost"),
                port=int(os.getenv("ADMIN_DB_PORT", 5432)),
                user=os.getenv("ADMIN_DB_USER", "postgres"),
                password=os.getenv("ADMIN_DB_PASSWORD", "1234"),
                database=nombre_database,
                client_encoding="utf8",
            )
            conn.autocommit = True
            cur = conn.cursor()

            # Obtener tipo de movimiento AJUSTE_AGREGAR
            cur.execute(
                "SELECT id_tipo_movimiento FROM tipo_movimiento WHERE tipo = 'AJUSTE_AGREGAR' LIMIT 1"
            )
            result = cur.fetchone()
            if not result:
                cur.close()
                conn.close()
                raise ValueError(
                    f"Tipo de movimiento AJUSTE_AGREGAR no encontrado en {nombre_database}"
                )
            id_tipo_movimiento = result[0]

            # Insertar movimiento
            cur.execute(
                """INSERT INTO movimiento (
                    id_tipo_movimiento, id_dependencia, id_producto, cantidad,
                    fecha, observacion, id_cliente, precio_compra, moneda_compra,
                    precio_venta, moneda_venta, id_convenio, estado, codigo
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id_movimiento
            """,
                (
                    id_tipo_movimiento,
                    movimiento_data.get("id_dependencia"),
                    movimiento_data.get("id_producto"),
                    movimiento_data.get("cantidad"),
                    datetime.utcnow().isoformat(),
                    movimiento_data.get("observacion"),
                    movimiento_data.get("id_cliente"),
                    movimiento_data.get("precio_compra"),
                    movimiento_data.get("moneda_compra"),
                    movimiento_data.get("precio_venta"),
                    movimiento_data.get("moneda_venta"),
                    movimiento_data.get("id_convenio"),
                    "pendiente",
                    movimiento_data.get("codigo"),
                ),
            )

            id_movimiento = cur.fetchone()[0] if cur.fetchone() else None
            cur.close()
            conn.close()

            return {
                "id_movimiento": id_movimiento,
                "tipo": "AJUSTE_AGREGAR",
                "cantidad": movimiento_data.get("cantidad"),
                "id_dependencia": movimiento_data.get("id_dependencia"),
                "nombre_database": nombre_database,
            }
        except Exception as e:
            logger.error(f"Error al crear movimiento en {nombre_database}: {e}")
            raise

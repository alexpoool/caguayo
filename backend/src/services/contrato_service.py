from typing import List
from datetime import datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from src.repository.base import CRUDBase
from src.repository.contratos_repo import (
    ContratoRepository,
    contrato_repo,
    SuplementoRepository,
    suplemento_repo,
    FacturaRepository,
    factura_repo,
    VentaEfectivoRepository,
    venta_efectivo_repo,
    item_factura_repo,
    item_venta_efectivo_repo,
)
from src.models import (
    TipoContrato,
    EstadoContrato,
    Contrato,
    Suplemento,
    Factura,
    VentaEfectivo,
    Cliente,
    Moneda,
    Movimiento,
    TipoMovimiento,
    Anexo,
    Productos,
)
from src.dto import (
    TipoContratoCreate,
    TipoContratoUpdate,
    TipoContratoRead,
    EstadoContratoCreate,
    EstadoContratoUpdate,
    EstadoContratoRead,
    ContratoCreate,
    ContratoRead,
    ContratoReadWithDetails,
    ContratoUpdate,
    SuplementoCreate,
    SuplementoRead,
    SuplementoReadWithDetails,
    SuplementoUpdate,
    FacturaCreate,
    FacturaRead,
    FacturaReadWithDetails,
    FacturaUpdate,
    VentaEfectivoCreate,
    VentaEfectivoRead,
    VentaEfectivoReadWithDetails,
    VentaEfectivoUpdate,
    MonedaRead,
    ClienteSimpleRead,
    DependenciaSimpleRead,
    ItemFacturaCreate,
    ItemVentaEfectivoCreate,
)
from src.utils import generar_codigo_anio, generar_codigo_con_padre
from src.services.productos_en_liquidacion_service import (
    agregar_desde_factura,
    agregar_desde_venta_efectivo,
)

tipo_contrato_repo = CRUDBase[TipoContrato, TipoContratoCreate, TipoContratoUpdate](
    TipoContrato
)
estado_contrato_repo = CRUDBase[
    EstadoContrato, EstadoContratoCreate, EstadoContratoUpdate
](EstadoContrato)


class TipoContratoService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoContratoCreate) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.create(db, obj_in=data)
        return TipoContratoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.get(db, id=id)
        return TipoContratoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoContratoRead]:
        db_objs = await tipo_contrato_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoContratoUpdate
    ) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_contrato_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoContratoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_contrato_repo.remove(db, id=id)
        return result is not None


class EstadoContratoService:
    @staticmethod
    async def create(
        db: AsyncSession, data: EstadoContratoCreate
    ) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.create(db, obj_in=data)
        return EstadoContratoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.get(db, id=id)
        return EstadoContratoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[EstadoContratoRead]:
        db_objs = await estado_contrato_repo.get_multi(db, skip=skip, limit=limit)
        return [EstadoContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: EstadoContratoUpdate
    ) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.get(db, id=id)
        if db_obj:
            updated = await estado_contrato_repo.update(db, db_obj=db_obj, obj_in=data)
            return EstadoContratoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await estado_contrato_repo.remove(db, id=id)
        return result is not None


async def map_contrato_to_read(
    db: AsyncSession, contrato: Contrato
) -> ContratoReadWithDetails:
    estado = await db.get(EstadoContrato, contrato.id_estado)
    tipo_contrato = await db.get(TipoContrato, contrato.id_tipo_contrato)
    moneda = await db.get(Moneda, contrato.id_moneda)
    cliente = await db.get(Cliente, contrato.id_cliente)

    return ContratoReadWithDetails(
        id_contrato=contrato.id_contrato,
        id_cliente=contrato.id_cliente,
        nombre=contrato.nombre,
        proforma=contrato.proforma,
        id_estado=contrato.id_estado,
        fecha=contrato.fecha,
        vigencia=contrato.vigencia,
        id_tipo_contrato=contrato.id_tipo_contrato,
        id_moneda=contrato.id_moneda,
        monto=contrato.monto,
        documento_final=contrato.documento_final,
        codigo=contrato.codigo,
        estado=EstadoContratoRead(
            id_estado_contrato=estado.id_estado_contrato,
            nombre=estado.nombre,
        )
        if estado
        else None,
        tipo_contrato=TipoContratoRead(
            id_tipo_contrato=tipo_contrato.id_tipo_contrato,
            nombre=tipo_contrato.nombre,
        )
        if tipo_contrato
        else None,
        moneda=MonedaRead(
            id_moneda=moneda.id_moneda,
            nombre=moneda.nombre,
            denominacion=moneda.denominacion,
            simbolo=moneda.simbolo,
        )
        if moneda
        else None,
        cliente=ClienteSimpleRead(
            id_cliente=cliente.id_cliente,
            nombre=cliente.nombre,
            cedula_rif=cliente.cedula_rif,
        )
        if cliente
        else None,
    )


class ContratoService:
    @staticmethod
    async def create(db: AsyncSession, data: ContratoCreate) -> ContratoReadWithDetails:
        anio = data.fecha.year
        codigo = await generar_codigo_anio(db, "contrato", "fecha", anio)
        contrato = await contrato_repo.create(db, data, codigo=codigo)
        return await map_contrato_to_read(db, contrato)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> ContratoReadWithDetails:
        contrato = await contrato_repo.get_by_id_with_details(db, id)
        if not contrato:
            return None
        return await map_contrato_to_read(db, contrato)

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ContratoReadWithDetails]:
        contratos = await contrato_repo.get_all_with_details(db, skip, limit)
        result = []
        for contrato in contratos:
            result.append(await map_contrato_to_read(db, contrato))
        return result

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: ContratoUpdate
    ) -> ContratoReadWithDetails:
        contrato = await contrato_repo.update(db, id, data)
        if not contrato:
            return None
        return await map_contrato_to_read(db, contrato)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        contrato = await contrato_repo.get(db, id)
        if not contrato:
            return False
        await contrato_repo.remove(db, id=id)
        return True


async def map_suplemento_to_read(
    db: AsyncSession, suplemento: Suplemento
) -> SuplementoReadWithDetails:
    estado = await db.get(EstadoContrato, suplemento.id_estado)

    return SuplementoReadWithDetails(
        id_suplemento=suplemento.id_suplemento,
        id_contrato=suplemento.id_contrato,
        nombre=suplemento.nombre,
        id_estado=suplemento.id_estado,
        fecha=suplemento.fecha,
        monto=suplemento.monto,
        documento=suplemento.documento,
        codigo=suplemento.codigo,
        estado=EstadoContratoRead(
            id_estado_contrato=estado.id_estado_contrato,
            nombre=estado.nombre,
        )
        if estado
        else None,
    )


class SuplementoService:
    @staticmethod
    async def create(
        db: AsyncSession, data: SuplementoCreate
    ) -> SuplementoReadWithDetails:
        contrato = await db.get(Contrato, data.id_contrato)
        prefijo = (
            contrato.codigo if (contrato and contrato.codigo) else str(data.id_contrato)
        )
        anio = data.fecha.year
        codigo = await generar_codigo_con_padre(
            db, prefijo, "suplemento", "fecha", anio
        )
        suplemento = await suplemento_repo.create(db, data, codigo=codigo)
        return await map_suplemento_to_read(db, suplemento)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> SuplementoReadWithDetails:
        suplemento = await suplemento_repo.get_by_id_with_details(db, id)
        if not suplemento:
            return None
        return await map_suplemento_to_read(db, suplemento)

    @staticmethod
    async def get_all_by_contrato(
        db: AsyncSession, id_contrato: int
    ) -> List[SuplementoReadWithDetails]:
        suplementos = await suplemento_repo.get_all_by_contrato(db, id_contrato)
        result = []
        for suplemento in suplementos:
            result.append(await map_suplemento_to_read(db, suplemento))
        return result

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: SuplementoUpdate
    ) -> SuplementoReadWithDetails:
        suplemento = await suplemento_repo.update(db, id, data)
        if not suplemento:
            return None
        return await map_suplemento_to_read(db, suplemento)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        suplemento = await suplemento_repo.get(db, id)
        if not suplemento:
            return False
        await suplemento_repo.remove(db, id=id)
        return True


async def map_factura_to_read(
    db: AsyncSession, factura: Factura
) -> FacturaReadWithDetails:
    return FacturaReadWithDetails(
        id_factura=factura.id_factura,
        id_contrato=factura.id_contrato,
        codigo_factura=factura.codigo_factura,
        descripcion=factura.descripcion,
        observaciones=factura.observaciones,
        fecha=factura.fecha,
        monto=factura.monto,
        pago_actual=factura.pago_actual,
    )


class FacturaService:
    @staticmethod
    async def create(db: AsyncSession, data: FacturaCreate) -> FacturaReadWithDetails:
        data_dict = data.model_dump(exclude_none=True)
        items_data = data_dict.pop("items", [])

        if not data_dict.get("codigo_factura"):
            anio = data.fecha.year
            data_dict["codigo_factura"] = await generar_codigo_anio(
                db, "factura", "fecha", anio
            )

        data.codigo_factura = data_dict["codigo_factura"]
        factura = await factura_repo.create(db, data)

        contrato = await db.get(Contrato, factura.id_contrato)
        id_dependencia = data.id_dependencia or 4

        stmt_tipo_mov = select(TipoMovimiento).where(TipoMovimiento.tipo == "venta")
        result_tipo = await db.exec(stmt_tipo_mov)
        tipo_mov = result_tipo.first()

        if items_data and tipo_mov:
            await item_factura_repo.create_items(db, factura.id_factura, items_data)

            for item in items_data:
                producto = await db.get(Productos, item["id_producto"])
                if not producto:
                    continue

                producto.precio_venta = item["precio_venta"]
                producto.moneda_venta = item["id_moneda"]
                producto.precio_minimo = item["precio_venta"] * Decimal("0.8")

                db_movimiento = Movimiento(
                    id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                    id_dependencia=id_dependencia,
                    id_factura=factura.id_factura,
                    id_contrato=factura.id_contrato,
                    id_cliente=contrato.id_cliente if contrato else None,
                    id_producto=item["id_producto"],
                    cantidad=item["cantidad"],
                    fecha=datetime.utcnow(),
                    precio_compra=producto.precio_compra,
                    moneda_compra=producto.moneda_compra,
                    precio_venta=item["precio_venta"],
                    moneda_venta=item["id_moneda"],
                    estado="pendiente",
                )
                db.add(db_movimiento)
                await db.flush()

                if db_movimiento.id_movimiento:
                    anio = datetime.utcnow().year
                    codigo = f"{anio}.FAC{factura.id_factura}.{item['id_producto']}"
                    db_movimiento.codigo = codigo

        await agregar_desde_factura(db, factura.id_factura, items_data)

        await db.commit()
        await db.refresh(factura)

        return await map_factura_to_read(db, factura)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> FacturaReadWithDetails:
        factura = await factura_repo.get_by_id_with_details(db, id)
        if not factura:
            return None
        return await map_factura_to_read(db, factura)

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[FacturaReadWithDetails]:
        facturas = await factura_repo.get_all_with_details(db, skip, limit)
        result = []
        for factura in facturas:
            result.append(await map_factura_to_read(db, factura))
        return result

    @staticmethod
    async def get_by_contrato(
        db: AsyncSession, id_contrato: int
    ) -> List[FacturaReadWithDetails]:
        facturas = await factura_repo.get_by_contrato(db, id_contrato)
        result = []
        for factura in facturas:
            result.append(await map_factura_to_read(db, factura))
        return result

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: FacturaUpdate
    ) -> FacturaReadWithDetails:
        factura = await factura_repo.update(db, id, data)
        if not factura:
            return None
        return await map_factura_to_read(db, factura)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        factura = await factura_repo.get(db, id)
        if not factura:
            return False
        await factura_repo.remove(db, id=id)
        return True


async def map_venta_efectivo_to_read(
    db: AsyncSession, venta: VentaEfectivo
) -> VentaEfectivoReadWithDetails:
    from src.models import Dependencia

    dependencia = await db.get(Dependencia, venta.id_dependencia)

    return VentaEfectivoReadWithDetails(
        id_venta_efectivo=venta.id_venta_efectivo,
        slip=venta.slip,
        fecha=venta.fecha,
        id_dependencia=venta.id_dependencia,
        cajero=venta.cajero,
        monto=venta.monto,
        codigo=venta.codigo,
        dependencia=DependenciaSimpleRead(
            id_dependencia=dependencia.id_dependencia,
            nombre=dependencia.nombre,
        )
        if dependencia
        else None,
    )


class VentaEfectivoService:
    @staticmethod
    async def create(
        db: AsyncSession, data: VentaEfectivoCreate
    ) -> VentaEfectivoReadWithDetails:
        data_dict = data.model_dump(exclude_none=True)
        items_data = data_dict.pop("items", [])

        anio = data.fecha.year
        codigo = await generar_codigo_anio(db, "venta_efectivo", "fecha", anio)
        data_dict["codigo"] = codigo

        venta = await venta_efectivo_repo.create(db, data, codigo=codigo)

        stmt_tipo_mov = select(TipoMovimiento).where(TipoMovimiento.tipo == "venta")
        result_tipo = await db.exec(stmt_tipo_mov)
        tipo_mov = result_tipo.first()

        if items_data and tipo_mov:
            await item_venta_efectivo_repo.create_items(
                db, venta.id_venta_efectivo, items_data
            )

            for item in items_data:
                producto = await db.get(Productos, item["id_producto"])
                if not producto:
                    continue

                producto.precio_venta = item["precio_venta"]
                producto.moneda_venta = item["id_moneda"]
                producto.precio_minimo = item["precio_venta"] * Decimal("0.8")

                db_movimiento = Movimiento(
                    id_tipo_movimiento=tipo_mov.id_tipo_movimiento,
                    id_dependencia=venta.id_dependencia,
                    id_venta_efectivo=venta.id_venta_efectivo,
                    id_producto=item["id_producto"],
                    cantidad=item["cantidad"],
                    fecha=datetime.utcnow(),
                    precio_compra=producto.precio_compra,
                    moneda_compra=producto.moneda_compra,
                    precio_venta=item["precio_venta"],
                    moneda_venta=item["id_moneda"],
                    estado="pendiente",
                )
                db.add(db_movimiento)
                await db.flush()

                if db_movimiento.id_movimiento:
                    anio = datetime.utcnow().year
                    codigo = f"{anio}.VE{venta.id_venta_efectivo}.{item['id_producto']}"
                    db_movimiento.codigo = codigo

        await agregar_desde_venta_efectivo(db, venta.id_venta_efectivo, items_data)

        await db.commit()
        await db.refresh(venta)

        return await map_venta_efectivo_to_read(db, venta)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> VentaEfectivoReadWithDetails:
        venta = await venta_efectivo_repo.get_by_id_with_details(db, id)
        if not venta:
            return None
        return await map_venta_efectivo_to_read(db, venta)

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[VentaEfectivoReadWithDetails]:
        ventas = await venta_efectivo_repo.get_all_with_details(db, skip, limit)
        result = []
        for venta in ventas:
            result.append(await map_venta_efectivo_to_read(db, venta))
        return result

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: VentaEfectivoUpdate
    ) -> VentaEfectivoReadWithDetails:
        venta = await venta_efectivo_repo.update(db, id, data)
        if not venta:
            return None
        return await map_venta_efectivo_to_read(db, venta)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        venta = await venta_efectivo_repo.get(db, id)
        if not venta:
            return False
        await venta_efectivo_repo.remove(db, id=id)
        return True

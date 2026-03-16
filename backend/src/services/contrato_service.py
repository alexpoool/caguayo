from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
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
)
from src.models import (
    TipoContrato,
    EstadoContrato,
    Contrato,
    ContratoProducto,
    Suplemento,
    SuplementoProducto,
    Factura,
    FacturaProducto,
    VentaEfectivo,
    VentaEfectivoProducto,
    Productos,
    Cliente,
    Moneda,
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
    ContratoUpdateWithProductos,
    ContratoProductoCreate,
    ContratoProductoRead,
    SuplementoCreate,
    SuplementoRead,
    SuplementoReadWithDetails,
    SuplementoUpdate,
    SuplementoUpdateWithProductos,
    SuplementoProductoCreate,
    SuplementoProductoRead,
    FacturaCreate,
    FacturaRead,
    FacturaReadWithDetails,
    FacturaUpdate,
    FacturaUpdateWithProductos,
    FacturaProductoCreate,
    FacturaProductoRead,
    VentaEfectivoCreate,
    VentaEfectivoRead,
    VentaEfectivoReadWithDetails,
    VentaEfectivoUpdate,
    VentaEfectivoUpdateWithProductos,
    VentaEfectivoProductoCreate,
    VentaEfectivoProductoRead,
    ProductoSimpleRead,
    MonedaRead,
    ClienteSimpleRead,
    DependenciaSimpleRead,
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
    productos_stmt = select(ContratoProducto).where(
        ContratoProducto.id_contrato == contrato.id_contrato
    )
    productos_result = await db.exec(productos_stmt)
    productos_list = []
    for cp in productos_result.all():
        producto = await db.get(Productos, cp.id_producto)
        productos_list.append(
            ContratoProductoRead(
                id_contrato_producto=cp.id_contrato_producto,
                id_producto=cp.id_producto,
                cantidad=cp.cantidad,
                producto=ProductoSimpleRead(
                    id_producto=producto.id_producto,
                    nombre=producto.nombre,
                    precio_venta=producto.precio_venta,
                )
                if producto
                else None,
            )
        )

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
        productos=productos_list,
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
        contrato = await contrato_repo.create_with_productos(db, data)
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
        db: AsyncSession, id: int, data: ContratoUpdateWithProductos
    ) -> ContratoReadWithDetails:
        contrato = await contrato_repo.update_with_productos(db, id, data)
        if not contrato:
            return None
        return await map_contrato_to_read(db, contrato)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        contrato = await contrato_repo.get(db, id)
        if not contrato:
            return False

        productos_stmt = select(ContratoProducto).where(
            ContratoProducto.id_contrato == id
        )
        productos_result = await db.exec(productos_stmt)
        for cp in productos_result.all():
            await db.delete(cp)

        await contrato_repo.remove(db, id=id)
        return True


async def map_suplemento_to_read(
    db: AsyncSession, suplemento: Suplemento
) -> SuplementoReadWithDetails:
    productos_stmt = select(SuplementoProducto).where(
        SuplementoProducto.id_suplemento == suplemento.id_suplemento
    )
    productos_result = await db.exec(productos_stmt)
    productos_list = []
    for sp in productos_result.all():
        producto = await db.get(Productos, sp.id_producto)
        productos_list.append(
            SuplementoProductoRead(
                id_suplemento_producto=sp.id_suplemento_producto,
                id_producto=sp.id_producto,
                cantidad=sp.cantidad,
                producto=ProductoSimpleRead(
                    id_producto=producto.id_producto,
                    nombre=producto.nombre,
                    precio_venta=producto.precio_venta,
                )
                if producto
                else None,
            )
        )

    estado = await db.get(EstadoContrato, suplemento.id_estado)

    return SuplementoReadWithDetails(
        id_suplemento=suplemento.id_suplemento,
        id_contrato=suplemento.id_contrato,
        nombre=suplemento.nombre,
        id_estado=suplemento.id_estado,
        fecha=suplemento.fecha,
        monto=suplemento.monto,
        documento=suplemento.documento,
        productos=productos_list,
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
        suplemento = await suplemento_repo.create_with_productos(db, data)
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
        db: AsyncSession, id: int, data: SuplementoUpdateWithProductos
    ) -> SuplementoReadWithDetails:
        suplemento = await suplemento_repo.update_with_productos(db, id, data)
        if not suplemento:
            return None
        return await map_suplemento_to_read(db, suplemento)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        suplemento = await suplemento_repo.get(db, id)
        if not suplemento:
            return False

        productos_stmt = select(SuplementoProducto).where(
            SuplementoProducto.id_suplemento == id
        )
        productos_result = await db.exec(productos_stmt)
        for sp in productos_result.all():
            await db.delete(sp)

        await suplemento_repo.remove(db, id=id)
        return True


async def map_factura_to_read(
    db: AsyncSession, factura: Factura
) -> FacturaReadWithDetails:
    productos_stmt = select(FacturaProducto).where(
        FacturaProducto.id_factura == factura.id_factura
    )
    productos_result = await db.exec(productos_stmt)
    productos_list = []
    for fp in productos_result.all():
        producto = await db.get(Productos, fp.id_producto)
        productos_list.append(
            FacturaProductoRead(
                id_factura_producto=fp.id_factura_producto,
                id_producto=fp.id_producto,
                cantidad=fp.cantidad,
                producto=ProductoSimpleRead(
                    id_producto=producto.id_producto,
                    nombre=producto.nombre,
                    precio_venta=producto.precio_venta,
                )
                if producto
                else None,
            )
        )

    return FacturaReadWithDetails(
        id_factura=factura.id_factura,
        id_contrato=factura.id_contrato,
        codigo_factura=factura.codigo_factura,
        descripcion=factura.descripcion,
        observaciones=factura.observaciones,
        fecha=factura.fecha,
        monto=factura.monto,
        pago_actual=factura.pago_actual,
        productos=productos_list,
    )


class FacturaService:
    @staticmethod
    async def create(db: AsyncSession, data: FacturaCreate) -> FacturaReadWithDetails:
        factura = await factura_repo.create_with_productos(db, data)
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
        db: AsyncSession, id: int, data: FacturaUpdateWithProductos
    ) -> FacturaReadWithDetails:
        factura = await factura_repo.update_with_productos(db, id, data)
        if not factura:
            return None
        return await map_factura_to_read(db, factura)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        factura = await factura_repo.get(db, id)
        if not factura:
            return False

        productos_stmt = select(FacturaProducto).where(FacturaProducto.id_factura == id)
        productos_result = await db.exec(productos_stmt)
        for fp in productos_result.all():
            await db.delete(fp)

        await factura_repo.remove(db, id=id)
        return True


async def map_venta_efectivo_to_read(
    db: AsyncSession, venta: VentaEfectivo
) -> VentaEfectivoReadWithDetails:
    from src.models import Dependencia

    productos_stmt = select(VentaEfectivoProducto).where(
        VentaEfectivoProducto.id_venta_efectivo == venta.id_venta_efectivo
    )
    productos_result = await db.exec(productos_stmt)
    productos_list = []
    for vep in productos_result.all():
        producto = await db.get(Productos, vep.id_producto)
        productos_list.append(
            VentaEfectivoProductoRead(
                id_venta_efectivo_producto=vep.id_venta_efectivo_producto,
                id_producto=vep.id_producto,
                cantidad=vep.cantidad,
                producto=ProductoSimpleRead(
                    id_producto=producto.id_producto,
                    nombre=producto.nombre,
                    precio_venta=producto.precio_venta,
                )
                if producto
                else None,
            )
        )

    dependencia = await db.get(Dependencia, venta.id_dependencia)

    return VentaEfectivoReadWithDetails(
        id_venta_efectivo=venta.id_venta_efectivo,
        slip=venta.slip,
        fecha=venta.fecha,
        id_dependencia=venta.id_dependencia,
        cajero=venta.cajero,
        monto=venta.monto,
        productos=productos_list,
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
        venta = await venta_efectivo_repo.create_with_productos(db, data)
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
        db: AsyncSession, id: int, data: VentaEfectivoUpdateWithProductos
    ) -> VentaEfectivoReadWithDetails:
        venta = await venta_efectivo_repo.update_with_productos(db, id, data)
        if not venta:
            return None
        return await map_venta_efectivo_to_read(db, venta)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        venta = await venta_efectivo_repo.get(db, id)
        if not venta:
            return False

        productos_stmt = select(VentaEfectivoProducto).where(
            VentaEfectivoProducto.id_venta_efectivo == id
        )
        productos_result = await db.exec(productos_stmt)
        for vep in productos_result.all():
            await db.delete(vep)

        await venta_efectivo_repo.remove(db, id=id)
        return True

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from src.models.cliente import Cliente
from src.models.cliente_natural import ClienteNatural
from src.models.cliente_tcp import ClienteTCP
from src.models.cliente_juridica import ClienteJuridica
from src.models.dependencia import Dependencia
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.producto import Productos


async def get_proveedores_por_dependencia(
    db: AsyncSession, id_dependencia: int, tipo_entidad: str, id_provincia: int = None
):
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    query = select(Cliente).filter(Cliente.tipo_relacion.in_(["PROVEEDOR", "AMBAS"]))

    if id_provincia:
        query = query.filter(Cliente.id_provincia == id_provincia)

    if tipo_entidad == "NATURAL":
        query = query.join(
            ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente
        )
    elif tipo_entidad == "TCP":
        query = query.join(ClienteTCP, Cliente.id_cliente == ClienteTCP.id_cliente)
    elif tipo_entidad == "JURIDICA":
        query = query.join(
            ClienteJuridica, Cliente.id_cliente == ClienteJuridica.id_cliente
        )

    result = await db.execute(query)
    results = result.all()

    proveedores = []
    for row in results:
        cliente_obj = row[0]
        proveedor_data = {
            "nombre": cliente_obj.nombre,
            "direccion": cliente_obj.direccion,
            "provincia": "",
            "municipio": "",
        }

        if tipo_entidad == "NATURAL":
            proveedor_data["carnet_identidad"] = ""
            proveedor_data["vigencia"] = ""
        elif tipo_entidad == "JURIDICA":
            proveedor_data["codigo_reup"] = ""

        proveedores.append(proveedor_data)

    return proveedores, dependencia_info


async def get_existencias(db: AsyncSession, id_dependencia: int):
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    query = (
        select(
            Productos.codigo.label("codigo"),
            Productos.nombre.label("descripcion"),
            func.sum(Movimiento.cantidad * TipoMovimiento.factor).label("cantidad"),
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .filter(Movimiento.id_dependencia == id_dependencia)
        .group_by(Productos.codigo, Productos.nombre)
    )

    result = await db.execute(query)
    results = result.all()

    existencias = [
        {"codigo": r.codigo, "descripcion": r.descripcion, "cantidad": r.cantidad or 0}
        for r in results
    ]
    return existencias, dependencia_info


async def get_movimientos_dependencia(
    db: AsyncSession, id_dependencia: int, fecha_inicio, fecha_fin
):
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    query = (
        select(
            Movimiento.fecha,
            TipoMovimiento.tipo.label("operacion"),
            Productos.nombre.label("producto"),
            case(
                (TipoMovimiento.factor > 0, "Entrada"),
                (TipoMovimiento.factor < 0, "Salida"),
                else_="Neutro",
            ).label("tipo"),
            Movimiento.cantidad,
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .filter(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.fecha >= fecha_inicio,
            Movimiento.fecha <= fecha_fin,
        )
        .order_by(Movimiento.fecha.desc())
    )

    result = await db.execute(query)
    results = result.all()

    movimientos = [
        {
            "fecha": r.fecha,
            "operacion": r.operacion,
            "producto": r.producto,
            "tipo": r.tipo,
            "cantidad": r.cantidad,
        }
        for r in results
    ]

    return movimientos, dependencia_info


async def get_movimientos_producto(
    db: AsyncSession, id_dependencia: int, id_producto: int, fecha_inicio, fecha_fin
):
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    result = await db.execute(
        select(Productos).filter(Productos.id_producto == id_producto)
    )
    producto = result.scalar_one_or_none()
    producto_info = (
        {"codigo": producto.codigo, "nombre": producto.nombre} if producto else {}
    )

    query = (
        select(
            Movimiento.fecha,
            TipoMovimiento.tipo.label("operacion"),
            case(
                (TipoMovimiento.factor > 0, "Entrada"),
                (TipoMovimiento.factor < 0, "Salida"),
                else_="Neutro",
            ).label("tipo"),
            Movimiento.cantidad,
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .filter(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.id_producto == id_producto,
            Movimiento.fecha >= fecha_inicio,
            Movimiento.fecha <= fecha_fin,
        )
        .order_by(Movimiento.fecha.desc())
    )

    result = await db.execute(query)
    results = result.all()

    movimientos = [
        {
            "fecha": r.fecha,
            "operacion": r.operacion,
            "tipo": r.tipo,
            "cantidad": r.cantidad,
        }
        for r in results
    ]

    return movimientos, dependencia_info, producto_info


from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal, List, Dict

from sqlmodel import select, func, and_
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models import (
    Anexo,
    Cliente,
    ClienteJuridica,
    ClienteNatural,
    ClienteTCP,
    Convenio,
    Dependencia,
    Liquidacion,
    Moneda,
    Movimiento,
    Municipio,
    ProductosEnLiquidacion,
    Productos,
    Subcategorias,
    Provincia,
    TipoMovimiento,
)

TipoEntidadReporte = Literal["NATURAL", "TCP", "JURIDICA"]
ModoCodigoMovimiento = Literal["corto", "extenso"]


@dataclass(frozen=True)
class DependenciaInfo:
    nombre: str
    direccion: str


async def _get_dependencia_info(
    db: AsyncSession, id_dependencia: int
) -> DependenciaInfo:
    stmt = select(Dependencia).where(Dependencia.id_dependencia == id_dependencia)
    result = await db.exec(stmt)
    dependencia = result.first()
    if not dependencia:
        return DependenciaInfo(nombre="", direccion="")
    return DependenciaInfo(nombre=dependencia.nombre, direccion=dependencia.direccion)


def _nombre_completo(
    nombre: str | None,
    primer_apellido: str | None = None,
    segundo_apellido: str | None = None,
) -> str:
    parts = [p for p in [nombre, primer_apellido, segundo_apellido] if p]
    return " ".join(parts)


async def get_proveedores_por_dependencia(
    db: AsyncSession,
    id_dependencia: int,
    tipo_entidad: TipoEntidadReporte,
    id_provincia: int | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Retorna proveedores (creadores) asociados a una dependencia.

    Asociación implementada: Cliente -> Convenio -> Anexo, filtrando por Anexo.id_dependencia.
    """

    dependencia = await _get_dependencia_info(db, id_dependencia)
    dependencia_info = {
        "nombre": dependencia.nombre,
        "direccion": dependencia.direccion,
    }

    base_stmt = (
        select(
            Cliente,
            Provincia.nombre.label("provincia_nombre"),
            Municipio.nombre.label("municipio_nombre"),
        )
        .join(Convenio, Convenio.id_cliente == Cliente.id_cliente)
        .join(Anexo, Anexo.id_convenio == Convenio.id_convenio)
        .join(Provincia, Cliente.id_provincia == Provincia.id_provincia, isouter=True)
        .join(Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True)
        .where(Anexo.id_dependencia == id_dependencia)
        .where(Cliente.tipo_relacion.in_(["PROVEEDOR", "AMBAS"]))
        .where(Cliente.tipo_persona == tipo_entidad)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    query = select(Cliente).filter(Cliente.tipo_relacion.in_(["PROVEEDOR", "AMBAS"]))

    if id_provincia is not None:
        base_stmt = base_stmt.where(Cliente.id_provincia == id_provincia)

    if tipo_entidad == "NATURAL":

        stmt = base_stmt.add_columns(
            ClienteNatural.carnet_identidad,
            ClienteNatural.nombre,
            ClienteNatural.primer_apellido,
            ClienteNatural.segundo_apellido,
            ClienteNatural.vigencia,
        ).join(ClienteNatural, ClienteNatural.id_cliente == Cliente.id_cliente)
    elif tipo_entidad == "TCP":
        stmt = base_stmt.add_columns(
            ClienteTCP.nombre,
            ClienteTCP.primer_apellido,
            ClienteTCP.segundo_apellido,
        ).join(ClienteTCP, ClienteTCP.id_cliente == Cliente.id_cliente)
    else:  # JURIDICA
        stmt = base_stmt.add_columns(ClienteJuridica.codigo_reup).join(
            ClienteJuridica, ClienteJuridica.id_cliente == Cliente.id_cliente
        )

    results = (await db.exec(stmt)).all()

    proveedores: list[dict[str, Any]] = []
    for row in results:
        # row[0] is Cliente, rest are added columns
        cliente: Cliente = row[0]
        provincia_nombre = row[1]
        municipio_nombre = row[2]

        carnet_identidad = ""
        codigo_reup = ""
        vigencia: date | None = None
        nombre_y_apellidos = cliente.nombre

        if tipo_entidad == "NATURAL":
            carnet_identidad = row[3] or ""
            nombre_y_apellidos = _nombre_completo(row[4], row[5], row[6])
            vigencia = row[7]
        elif tipo_entidad == "TCP":
            nombre_y_apellidos = _nombre_completo(row[3], row[4], row[5])
        else:  # JURIDICA
            codigo_reup = row[3] or ""

        proveedores.append(
            {
                "ci": carnet_identidad,
                "nit": codigo_reup or cliente.cedula_rif,
                "nombre": nombre_y_apellidos,
                "direccion": cliente.direccion,
                "municipio": municipio_nombre or "",
                "provincia": provincia_nombre or "",
                "vigencia": vigencia,
            }
        )

    return proveedores, dependencia_info



async def get_existencias(
    db: AsyncSession, id_dependencia: int
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    dependencia = await _get_dependencia_info(db, id_dependencia)
    dependencia_info = {
        "nombre": dependencia.nombre,
        "direccion": dependencia.direccion,
    }

    stmt = (
        select(
            Productos.codigo.label("codigo"),
            Productos.nombre.label("descripcion"),
            func.coalesce(
                func.sum(Movimiento.cantidad * TipoMovimiento.factor), 0
            ).label("cantidad"),
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .where(Movimiento.id_dependencia == id_dependencia)
        .where(Movimiento.estado == "confirmado")
        .group_by(Productos.codigo, Productos.nombre)
        .order_by(Productos.codigo.asc())
    )

    results = (await db.exec(stmt)).all()
    existencias = [

        {
            "codigo": r.codigo or "",
            "descripcion": r.descripcion or "",
            "cantidad": int(r.cantidad or 0),
        }
        for r in results
    ]
    return existencias, dependencia_info


async def get_movimientos_dependencia(

    db: AsyncSession,
    id_dependencia: int,
    fecha_inicio: date,
    fecha_fin: date,
    *,
    modo_codigo: ModoCodigoMovimiento = "corto",
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    dependencia = await _get_dependencia_info(db, id_dependencia)
    dependencia_info = {
        "nombre": dependencia.nombre,
        "direccion": dependencia.direccion,
    }

    inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
    fin_dt = datetime.combine(fecha_fin, datetime.max.time())

    saldo_stmt = (
        select(
            Movimiento.id_producto,
            func.coalesce(
                func.sum(Movimiento.cantidad * TipoMovimiento.factor), 0
            ).label("saldo"),
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .where(Movimiento.id_dependencia == id_dependencia)
        .where(Movimiento.estado == "confirmado")
        .where(Movimiento.fecha < inicio_dt)
        .group_by(Movimiento.id_producto)
    )
    saldo_results = (await db.exec(saldo_stmt)).all()
    saldo_por_producto: dict[int, int] = {
        r.id_producto: int(r.saldo or 0) for r in saldo_results
    }

    mov_stmt = (
        select(
            Movimiento.id_movimiento,
            Movimiento.fecha,
            Movimiento.id_producto,
            Movimiento.codigo.label("codigo_movimiento"),
            Productos.codigo.label("codigo_producto"),
            Productos.nombre.label("descripcion"),
            TipoMovimiento.factor.label("factor"),
            Movimiento.cantidad,
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .where(Movimiento.id_dependencia == id_dependencia)
        .where(Movimiento.estado == "confirmado")
        .where(Movimiento.fecha >= inicio_dt)
        .where(Movimiento.fecha <= fin_dt)
        .order_by(Movimiento.fecha.asc(), Movimiento.id_movimiento.asc())
    )
    results = (await db.exec(mov_stmt)).all()

    movimientos: list[dict[str, Any]] = []
    for r in results:
        saldo_inicial = saldo_por_producto.get(r.id_producto, 0)
        delta = int((r.cantidad or 0) * (r.factor or 0))
        saldo_final = saldo_inicial + delta
        saldo_por_producto[r.id_producto] = saldo_final

        tipo = (
            "Entrada"
            if (r.factor or 0) > 0
            else "Salida"
            if (r.factor or 0) < 0
            else "Neutro"
        )
        codigo = (
            r.codigo_producto
            if modo_codigo == "corto"
            else (r.codigo_movimiento or r.codigo_producto)
        )

        movimientos.append(
            {
                "fecha": r.fecha,
                "codigo": codigo or "",
                "saldo_inicial": saldo_inicial,
                "tipo": tipo,
                "descripcion": r.descripcion or "",
                "cantidad": int(r.cantidad or 0),
                "saldo_final": saldo_final,
            }
        )

    return movimientos, dependencia_info


async def get_movimientos_producto(

    db: AsyncSession,
    id_dependencia: int,
    id_producto: int,
    fecha_inicio: date,
    fecha_fin: date,
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    dependencia = await _get_dependencia_info(db, id_dependencia)
    dependencia_info = {
        "nombre": dependencia.nombre,
        "direccion": dependencia.direccion,
    }

    producto_stmt = select(Productos).where(Productos.id_producto == id_producto)
    producto_result = await db.exec(producto_stmt)
    producto = producto_result.first()
    producto_info = {
        "codigo": (producto.codigo if producto else ""),
        "descripcion": (producto.nombre if producto else ""),
    }

    inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
    fin_dt = datetime.combine(fecha_fin, datetime.max.time())

    saldo_inicial_stmt = (
        select(func.coalesce(func.sum(Movimiento.cantidad * TipoMovimiento.factor), 0))
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .where(Movimiento.id_dependencia == id_dependencia)
        .where(Movimiento.id_producto == id_producto)
        .where(Movimiento.estado == "confirmado")
        .where(Movimiento.fecha < inicio_dt)
    )
    saldo_inicial_result = await db.exec(saldo_inicial_stmt)
    saldo_running = int(saldo_inicial_result.first() or 0)

    mov_stmt = (
        select(
            Movimiento.id_movimiento,
            Movimiento.fecha,
            Movimiento.codigo.label("codigo_movimiento"),
            TipoMovimiento.factor.label("factor"),
            Movimiento.cantidad,
            Productos.nombre.label("descripcion"),
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .where(Movimiento.id_dependencia == id_dependencia)
        .where(Movimiento.id_producto == id_producto)
        .where(Movimiento.estado == "confirmado")
        .where(Movimiento.fecha >= inicio_dt)
        .where(Movimiento.fecha <= fin_dt)
        .order_by(Movimiento.fecha.asc(), Movimiento.id_movimiento.asc())
    )
    results = (await db.exec(mov_stmt)).all()

    movimientos: list[dict[str, Any]] = []
    for r in results:
        saldo_inicial = saldo_running
        delta = int((r.cantidad or 0) * (r.factor or 0))
        saldo_final = saldo_inicial + delta
        saldo_running = saldo_final

        tipo = (
            "Entrada"
            if (r.factor or 0) > 0
            else "Salida"
            if (r.factor or 0) < 0
            else "Neutro"
        )

        movimientos.append(
            {
                "fecha": r.fecha,
                "saldo_inicial": saldo_inicial,
                "tipo": tipo,
                "descripcion": r.descripcion or "",
                "cantidad": int(r.cantidad or 0),
                "saldo_final": saldo_final,
            }
        )

    return movimientos, dependencia_info, producto_info


async def get_liquidacion_report_data(
    db: AsyncSession, id_liquidacion: int
) -> tuple[dict[str, Any] | None, list[dict[str, Any]], dict[str, Any]]:
    """Datos para el PDF de liquidación.

    Mantiene la firma usada por `routes/reportes_router.py`.
    """

    stmt = (
        select(Liquidacion, Cliente, Moneda)
        .join(Cliente, Liquidacion.id_cliente == Cliente.id_cliente)
        .join(Moneda, Liquidacion.id_moneda == Moneda.id_moneda)
        .where(Liquidacion.id_liquidacion == id_liquidacion)
    )
    result = await db.exec(stmt)
    row = result.first()
    if not row:
        return None, [], {"nombre": "", "direccion": ""}

    liquidacion, cliente, moneda = row

    # Dependencia inferida desde el anexo (si existe)
    dependencia_info = {"nombre": "", "direccion": ""}
    if liquidacion.id_anexo:
        anexo_stmt = select(Anexo).where(Anexo.id_anexo == liquidacion.id_anexo)
        anexo_result = await db.exec(anexo_stmt)
        anexo = anexo_result.first()
        if anexo and anexo.id_dependencia:
            dep = await _get_dependencia_info(db, int(anexo.id_dependencia))
            dependencia_info = {"nombre": dep.nombre, "direccion": dep.direccion}

    liquidacion_data: dict[str, Any] = {
        "codigo": liquidacion.codigo,
        "fecha_emision": liquidacion.fecha_emision,
        "cliente_nombre": cliente.nombre,
        "cliente_id": cliente.id_cliente,
        "moneda_nombre": moneda.nombre,
        "moneda_simbolo": moneda.simbolo,
        "tipo_pago": liquidacion.tipo_pago,
        "importe": liquidacion.importe,
        "gasto_empresa": liquidacion.gasto_empresa,
        "comision_bancaria": liquidacion.comision_bancaria,
        "devengado": liquidacion.devengado,
        "tributario": liquidacion.tributario,
        "neto_pagar": liquidacion.neto_pagar,
        "observaciones": liquidacion.observaciones,
    }

    items_stmt = (
        select(ProductosEnLiquidacion, Productos)
        .join(Productos, ProductosEnLiquidacion.id_producto == Productos.id_producto)
        .where(ProductosEnLiquidacion.id_liquidacion == id_liquidacion)
        .order_by(ProductosEnLiquidacion.id_producto_en_liquidacion.asc())
    )
    items_result = await db.exec(items_stmt)
    items_rows = items_result.all()

    items: list[dict[str, Any]] = []
    for item, producto in items_rows:
        total = (item.precio or 0) * (item.cantidad or 0)
        items.append(
            {
                "codigo": item.codigo,
                "nombre": producto.nombre,
                "cantidad": int(item.cantidad or 0),
                "precio": float(item.precio or 0),
                "total": float(total),
            }
        )

    return liquidacion_data, items, dependencia_info


async def get_alertas_reposicion(db: AsyncSession) -> Dict[str, Any]:
    """Genera datos para el reporte de Alertas de Reposición (ROP)."""
    # Consulta todos los productos con relaciones y calcula stock actual
    # Usaremos el modelo Productos completo para revisar ROP y clasificacion
    stmt = (
        select(
            Productos,
            Subcategorias,
            func.coalesce(
                func.sum(Movimiento.cantidad * TipoMovimiento.factor), 0
            ).label("stock_actual"),
        )
        .join(Subcategorias, Productos.id_subcategoria == Subcategorias.id_subcategoria)
        .outerjoin(Movimiento, Movimiento.id_producto == Productos.id_producto)
        .outerjoin(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .group_by(Productos.id_producto, Subcategorias.id_subcategoria)
    )

    result = await db.exec(stmt)
    rows = result.all()

    alertas = []
    for producto, subcategoria, stock_actual in rows:
        rop = producto.punto_pedido or 0

        # Generar alerta si el stock actual está por debajo o igual al ROP
        if stock_actual <= rop:
            alertas.append(
                {
                    "codigo": producto.codigo or "S/C",
                    "nombre": producto.nombre,
                    "subcategoria": subcategoria.nombre,
                    "clasificacion_abc": producto.clasificacion_abc or "-",
                    "stock_actual": int(stock_actual),
                    "punto_pedido": rop,
                    "stock_minimo": producto.stock_minimo or 0,
                    "lead_time_dias": producto.lead_time_dias or 0,
                    "diferencia": int(rop - stock_actual),
                }
            )

    # Ordenar por criticidad (Mayor diferencia respecto a ROP primero, luego por ABC)
    alertas.sort(
        key=lambda x: (
            x["clasificacion_abc"] if x["clasificacion_abc"] != "-" else "Z",
            -x["diferencia"],
        )
    )

    return {"alertas": alertas, "total_alertas": len(alertas)}

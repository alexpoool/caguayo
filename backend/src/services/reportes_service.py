from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.cliente import Cliente
from src.models.cliente_juridica import ClienteJuridica
from src.models.cliente_natural import ClienteNatural
from src.models.cliente_tcp import ClienteTCP
from src.models.contrato import Contrato
from src.models.dependencia import Dependencia, Municipio, Provincia
from src.models.liquidacion import Liquidacion
from src.models.moneda import Moneda
from src.models.item_anexo import ItemAnexo
from src.models.producto import Productos
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.saldo import Saldo
from src.models.productos_en_liquidacion import ProductosEnLiquidacion
from src.models.servicio import (
    Etapa,
    PersonaEtapa,
    PersonaLiquidacion,
    SolicitudServicio,
)
from src.utils.nombres import (
    componer_nombre_completo,
    nombres_completos_por_cliente,
)


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 1: REGISTRO DE CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════


async def get_registro_clientes(
    db: AsyncSession,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene todos los clientes con tipo_relacion 'CLIENTE' o 'AMBAS',
    incluyendo el código REEUP para personas jurídicas."""
    query = (
        select(
            Cliente,
            Provincia.nombre.label("provincia_nombre"),
            Municipio.nombre.label("municipio_nombre"),
        )
        .join(Provincia, Cliente.id_provincia == Provincia.id_provincia, isouter=True)
        .join(Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True)
        .filter(Cliente.tipo_relacion.in_(["CLIENTE", "AMBAS"]))
        .order_by(Cliente.nombre)
    )
    result = await db.execute(query)
    rows = result.all()

    # Obtener IDs de clientes jurídicos
    cliente_ids_juridicos = [
        r[0].id_cliente for r in rows if r[0].tipo_persona == "JURIDICA"
    ]
    reup_map: Dict[int, str] = {}
    if cliente_ids_juridicos:
        reup_query = select(ClienteJuridica).filter(
            ClienteJuridica.id_cliente.in_(cliente_ids_juridicos)
        )
        reup_result = await db.execute(reup_query)
        for rj in reup_result.scalars().all():
            reup_map[rj.id_cliente] = rj.codigo_reup

    nombres = await nombres_completos_por_cliente(
        db, [r[0].id_cliente for r in rows]
    )

    data = []
    for r in rows:
        cliente: Cliente = r[0]
        data.append(
            {
                "id_cliente": cliente.id_cliente,
                "nombre": cliente.nombre,
                "nombre_completo": nombres.get(cliente.id_cliente)
                or cliente.nombre,
                "reeup": reup_map.get(cliente.id_cliente, ""),
                "nit": cliente.nit or "",
                "direccion": cliente.direccion or "",
                "provincia": r.provincia_nombre or "",
                "municipio": r.municipio_nombre or "",
            }
        )

    return data, {"total": len(data)}


async def get_proveedores_por_dependencia(
    db: AsyncSession,
    id_dependencia: Optional[int] = None,
    id_provincia: Optional[int] = None,
):
    """Obtiene todos los proveedores (PROVEEDOR o AMBAS) sin filtrar por tipo de persona."""
    dependencia_info: Dict[str, Any] = {}
    if id_dependencia is not None:
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
            Cliente,
            Provincia.nombre.label("provincia_nombre"),
            Municipio.nombre.label("municipio_nombre"),
        )
        .join(Provincia, Cliente.id_provincia == Provincia.id_provincia, isouter=True)
        .join(Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True)
        .filter(Cliente.tipo_relacion.in_(["PROVEEDOR", "AMBAS"]))
    )

    if id_provincia:
        query = query.filter(Cliente.id_provincia == id_provincia)

    query = query.order_by(Cliente.nombre)
    result = await db.execute(query)
    results = result.all()

    # Cargar datos tipo-específicos para enriquecer la información
    cliente_ids = [row[0].id_cliente for row in results]
    naturales_map: Dict[int, Any] = {}
    juridicas_map: Dict[int, Any] = {}
    tcp_map: Dict[int, Any] = {}

    if cliente_ids:
        nat_result = await db.execute(
            select(ClienteNatural).filter(ClienteNatural.id_cliente.in_(cliente_ids))
        )
        for n in nat_result.scalars().all():
            naturales_map[n.id_cliente] = n

        jur_result = await db.execute(
            select(ClienteJuridica).filter(ClienteJuridica.id_cliente.in_(cliente_ids))
        )
        for j in jur_result.scalars().all():
            juridicas_map[j.id_cliente] = j

        tcp_result = await db.execute(
            select(ClienteTCP).filter(ClienteTCP.id_cliente.in_(cliente_ids))
        )
        for t in tcp_result.scalars().all():
            tcp_map[t.id_cliente] = t

    proveedores = []
    for row in results:
        cliente_obj: Cliente = row[0]
        proveedor_data: Dict[str, Any] = {
            "codigo": cliente_obj.codigo,
            "nombre": cliente_obj.nombre,
            "nombre_completo": cliente_obj.nombre,
            "direccion": cliente_obj.direccion or "",
            "provincia": row.provincia_nombre or "",
            "municipio": row.municipio_nombre or "",
            "tipo_persona": cliente_obj.tipo_persona or "",
            "carnet_identidad": "",
            "vigencia": "",
            "codigo_reup": "",
            "nit": cliente_obj.nit or "",
        }

        if cliente_obj.id_cliente in naturales_map:
            n = naturales_map[cliente_obj.id_cliente]
            proveedor_data["carnet_identidad"] = n.carnet_identidad or ""
            proveedor_data["vigencia"] = n.vigencia.isoformat() if n.vigencia else ""
            proveedor_data["nombre_completo"] = componer_nombre_completo(
                n.nombre or cliente_obj.nombre,
                n.primer_apellido,
                n.segundo_apellido,
            )
        elif cliente_obj.id_cliente in juridicas_map:
            j = juridicas_map[cliente_obj.id_cliente]
            proveedor_data["codigo_reup"] = j.codigo_reup or ""
        elif cliente_obj.id_cliente in tcp_map:
            t = tcp_map[cliente_obj.id_cliente]
            proveedor_data["carnet_identidad"] = t.numero_registro_proyecto or ""
            proveedor_data["nombre_completo"] = componer_nombre_completo(
                t.nombre or cliente_obj.nombre,
                t.primer_apellido,
                t.segundo_apellido,
            )

        proveedores.append(proveedor_data)

    return proveedores, dependencia_info


async def get_ids_dependencia_con_hijos(
    db: AsyncSession, id_dependencia: int
) -> List[int]:
    """IDs cubiertos por el reporte: la dependencia + sus HIJOS DIRECTOS.

    Los nietos NO se incluyen: el reporte de existencias solo baja un nivel
    en la jerarquía (el filtro, en cambio, sí muestra toda la descendencia).
    """
    hijos = await db.execute(
        select(Dependencia.id_dependencia).where(
            Dependencia.codigo_padre == id_dependencia
        )
    )
    return [id_dependencia, *list(hijos.scalars().all())]


async def get_existencias(db: AsyncSession, id_dependencia: int):
    """Stock por producto de la dependencia seleccionada + sus hijos directos.

    Una fila por dependencia: si el mismo producto tiene stock en el padre y
    en un hijo, salen dos filas con su nombre de dependencia correspondiente.
    """
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )
    if not dependencia:
        return [], dependencia_info

    ids_cubiertos = await get_ids_dependencia_con_hijos(db, id_dependencia)

    query = (
        select(
            Productos.codigo.label("codigo"),
            Productos.nombre.label("nombre"),
            Dependencia.nombre.label("dependencia"),
            func.sum(Movimiento.cantidad * TipoMovimiento.factor).label("cantidad"),
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .join(Dependencia, Movimiento.id_dependencia == Dependencia.id_dependencia)
        .filter(
            Movimiento.id_dependencia.in_(ids_cubiertos),
            # Solo los movimientos confirmados alteran el stock real.
            Movimiento.estado == "confirmado",
        )
        .group_by(
            Productos.codigo,
            Productos.nombre,
            Dependencia.id_dependencia,
            Dependencia.nombre,
        )
        .order_by(Dependencia.nombre.asc(), Productos.codigo.asc())
    )

    result = await db.execute(query)
    results = result.all()

    existencias = [
        {
            "codigo": r.codigo,
            "nombre": r.nombre,
            "cantidad": r.cantidad or 0,
            "dependencia": r.dependencia,
        }
        for r in results
    ]
    dependencia_info["alcance"] = len(ids_cubiertos)
    return existencias, dependencia_info


async def get_movimientos_dependencia(
    db: AsyncSession, id_dependencia: int, fecha_inicio, fecha_fin
):
    """Obtiene movimientos por dependencia agrupados por producto con saldo inicial y final.

    Solo considera movimientos confirmados. Las columnas de movimientos muestran
    la MAGNITUD (cantidad); el signo del factor del tipo solo define si es
    entrada (+) o salida (-).

    Los saldos son MONTOS valorados al precio_compra del producto (igual que el
    dashboard valoriza el inventario). El saldo inicial NO recorre el histórico:
    se lee de la tabla `saldos` (snapshot escrito al confirmar cada movimiento,
    en unidades) tomando la fila más reciente con fecha < fecha_inicio, y se
    valoriza con el precio_compra ACTUAL. Si un producto no tiene snapshot
    previo (dato que no pasó por SaldoService), se calcula desde `movimiento`
    (fuente de verdad) con Σ cantidad × factor de los confirmados anteriores
    al rango:
      saldo_inicial = saldos.saldo (último snapshot previo) × precio_compra
                      [o Σ movimientos previos × precio_compra, sin snapshot]
      saldo_final   = saldo_inicial
                      + (recepcion + compra) × precio_compra
                      − (venta + merma + donacion + devolucion) × precio_compra
                      + ajustes × precio_compra
    """
    result = await db.execute(
        select(Dependencia).filter(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = result.scalar_one_or_none()
    dependencia_info = (
        {"nombre": dependencia.nombre, "direccion": dependencia.direccion}
        if dependencia
        else {}
    )

    # ── 1. Obtener TODOS los productos con movimientos confirmados en la dependencia ──
    productos_base = (
        select(
            Productos.id_producto,
            Productos.codigo.label("codigo"),
            Productos.nombre.label("nombre"),
            Productos.precio_compra.label("precio_compra"),
        )
        .join(Movimiento, Movimiento.id_producto == Productos.id_producto)
        .filter(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.estado == "confirmado",
        )
        .group_by(
            Productos.id_producto,
            Productos.codigo,
            Productos.nombre,
            Productos.precio_compra,
        )
    )
    base_result = await db.execute(productos_base)
    productos_base_map = {
        r.id_producto: {
            "codigo": r.codigo,
            "nombre": r.nombre,
            "precio_compra": r.precio_compra,
        }
        for r in base_result.all()
    }

    # ── 2. Saldo inicial: último snapshot de `saldos` anterior al rango ────
    # `saldos.saldo` guarda unidades; se valoriza al leer (× precio_compra
    # actual), que es equivalente al cálculo histórico anterior:
    # Σ (cantidad × factor) × precio_compra.
    snapshot_subq = (
        select(
            Saldo.id_producto,
            Saldo.saldo,
            func.row_number()
            .over(
                partition_by=Saldo.id_producto,
                order_by=[Saldo.fecha.desc(), Saldo.id_saldo.desc()],
            )
            .label("rn"),
        )
        .filter(
            Saldo.id_dependencia == id_dependencia,
            # Límite estricto: un movimiento del propio día cae dentro de las
            # columnas del rango, no en el saldo inicial (misma regla que antes).
            Saldo.fecha < fecha_inicio,
        )
        .subquery()
    )
    saldo_result = await db.execute(
        select(snapshot_subq.c.id_producto, snapshot_subq.c.saldo).where(
            snapshot_subq.c.rn == 1
        )
    )
    saldos = {r[0]: float(r[1] or 0) for r in saldo_result.all()}

    # Fallback: producto con movimientos confirmados anteriores al rango pero
    # sin snapshot (dato importado/insertado sin pasar por SaldoService).
    # `movimiento` es la fuente de verdad; solo se consulta para los pares
    # que no quedaron cubiertos por `saldos`.
    sin_snapshot = [
        pid for pid in productos_base_map if pid not in saldos
    ]
    if sin_snapshot:
        fallback_q = (
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
            .filter(
                Movimiento.id_dependencia == id_dependencia,
                Movimiento.estado == "confirmado",
                Movimiento.id_producto.in_(sin_snapshot),
                Movimiento.fecha < fecha_inicio,
            )
            .group_by(Movimiento.id_producto)
        )
        for pid, saldo in (await db.execute(fallback_q)).all():
            saldos[pid] = float(saldo or 0)

    # ── 3. Movimientos en el rango, pivoteados por tipo (case-insensitive) ─
    TIPOS_MOVIMIENTO = ["recepcion", "compra", "venta", "merma", "donacion", "devolucion"]

    def _pivot(tipo: str):
        # Magnitud del movimiento: el signo del factor solo indica
        # entrada (+) o salida (-), nunca se descuenta dos veces.
        return func.coalesce(
            func.sum(
                case(
                    (
                        func.lower(TipoMovimiento.tipo) == tipo,
                        Movimiento.cantidad * func.abs(TipoMovimiento.factor),
                    ),
                    else_=0,
                )
            ),
            0,
        )

    mov_query = (
        select(
            Movimiento.id_producto,
            *[_pivot(tipo).label(tipo) for tipo in TIPOS_MOVIMIENTO],
            # Ajustes netos: AGREGAR suma, QUITAR resta
            func.coalesce(
                func.sum(
                    case(
                        (func.lower(TipoMovimiento.tipo) == "ajuste_agregar", Movimiento.cantidad),
                        (func.lower(TipoMovimiento.tipo) == "ajuste_quitar", -Movimiento.cantidad),
                        else_=0,
                    )
                ),
                0,
            ).label("ajustes"),
        )
        .join(TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento)
        .filter(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.estado == "confirmado",
            # fecha_fin es date: incluir todo el último día
            Movimiento.fecha >= fecha_inicio,
            Movimiento.fecha < fecha_fin + timedelta(days=1),
        )
        .group_by(Movimiento.id_producto)
    )
    mov_result = await db.execute(mov_query)
    movimientos_rows = mov_result.all()

    # ── 4. Combinar: base + saldo (monto) + movimientos (cantidades) ──────
    mov_by_pid = {row.id_producto: row for row in movimientos_rows}

    movimientos = []
    for pid, info in sorted(productos_base_map.items(), key=lambda x: x[1]["codigo"] or ""):
        # Monto: unidades del snapshot valorizadas al precio de compra actual
        precio = float(info.get("precio_compra") or 0)
        saldo_inicial_unidades = float(saldos.get(pid, 0.0))
        saldo_inicial = round(saldo_inicial_unidades * precio, 2)
        row = mov_by_pid.get(pid)
        mov_data = {
            tipo: float(getattr(row, tipo) or 0) if row is not None else 0.0
            for tipo in TIPOS_MOVIMIENTO
        }
        ajustes = float(getattr(row, "ajustes") or 0) if row is not None else 0.0

        # DEVOLUCION es salida (factor -1 en tipo_movimiento)
        entradas = (mov_data["recepcion"] + mov_data["compra"]) * precio
        salidas = (mov_data["venta"] + mov_data["merma"] + mov_data["donacion"] + mov_data["devolucion"]) * precio
        saldo_final_unidades = (
            saldo_inicial_unidades
            + mov_data["recepcion"]
            + mov_data["compra"]
            - mov_data["venta"]
            - mov_data["merma"]
            - mov_data["donacion"]
            - mov_data["devolucion"]
            + ajustes
        )
        saldo_final = round(saldo_final_unidades * precio, 2)

        movimientos.append({
            "codigo": info["codigo"],
            "nombre": info["nombre"],
            "saldo_inicial_unidades": round(saldo_inicial_unidades, 3),
            "saldo_inicial": saldo_inicial,
            "recepcion": mov_data["recepcion"],
            "compra": mov_data["compra"],
            "venta": mov_data["venta"],
            "merma": mov_data["merma"],
            "donacion": mov_data["donacion"],
            "devolucion": mov_data["devolucion"],
            "ajustes": ajustes,
            "saldo_final_unidades": round(saldo_final_unidades, 3),
            "saldo_final": saldo_final,
        })

    return movimientos, dependencia_info


async def get_movimientos_producto(
    db: AsyncSession, id_dependencia: int, id_producto: int, fecha_inicio, fecha_fin
):
    """Movimientos confirmados con saldos monetarios históricos por coste promedio ponderado.

    Las entradas de compra/recepción incorporan el coste y moneda guardados en
    el propio movimiento. Las salidas se valoran al coste promedio vigente
    inmediatamente antes de salir. Los ajustes positivos heredan ese coste
    promedio; si no existe coste previo no se inventa una valoración.

    No se mezclan monedas ni se usa el precio actual del catálogo como sustituto
    de un coste histórico ausente: en esos casos se informa el dato que falta.
    """
    dependencia_result = await db.execute(
        select(Dependencia).where(Dependencia.id_dependencia == id_dependencia)
    )
    dependencia = dependencia_result.scalar_one_or_none()
    if dependencia is None:
        raise LookupError("La dependencia indicada no existe")

    dependencia_info = {
        "nombre": dependencia.nombre,
        "direccion": dependencia.direccion,
    }

    producto_result = await db.execute(
        select(Productos).where(Productos.id_producto == id_producto)
    )
    producto = producto_result.scalar_one_or_none()
    if producto is None:
        raise LookupError("El producto indicado no existe")

    movimientos_result = await db.execute(
        select(
            Movimiento.id_movimiento,
            Movimiento.fecha,
            TipoMovimiento.tipo.label("operacion"),
            TipoMovimiento.factor.label("factor"),
            Movimiento.cantidad,
            Movimiento.precio_compra,
            Movimiento.moneda_compra,
            Productos.codigo.label("codigo_producto"),
            Productos.nombre.label("producto"),
        )
        .join(
            TipoMovimiento,
            Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento,
        )
        .join(Productos, Movimiento.id_producto == Productos.id_producto)
        .where(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.id_producto == id_producto,
            Movimiento.estado == "confirmado",
            Movimiento.fecha < fecha_fin + timedelta(days=1),
        )
        .order_by(Movimiento.fecha.asc(), Movimiento.id_movimiento.asc())
    )
    historico = movimientos_result.all()
    if not historico:
        raise ValueError("El producto no pertenece a la dependencia seleccionada: no tiene movimientos confirmados")

    unidades = Decimal("0")
    valor_inventario = Decimal("0")
    moneda_id = None
    movimientos = []
    resumen_normalizado: Dict[str, Dict[str, Any]] = {}

    for row in historico:
        cantidad = Decimal(str(row.cantidad or 0))
        factor = Decimal(str(row.factor or 0))
        variacion = cantidad * factor
        saldo_inicial_unidades = unidades
        saldo_inicial_valor = valor_inventario

        tipo = (row.operacion or "").strip()
        tipo_normalizado = tipo.casefold()

        if variacion > 0:
            if tipo_normalizado in ("compra", "recepcion"):
                if row.precio_compra is None or row.moneda_compra is None:
                    raise ValueError(
                        f"No se puede valorar históricamente el movimiento #{row.id_movimiento}: "
                        "la entrada no tiene precio de compra o moneda registrados. "
                        "Completa esos datos para generar el reporte."
                    )
                if moneda_id is None:
                    moneda_id = row.moneda_compra
                elif moneda_id != row.moneda_compra:
                    raise ValueError(
                        "El historial del producto contiene varias monedas de compra. "
                        "No es correcto sumar esos importes sin una tasa de conversión histórica."
                    )
                coste_unitario = Decimal(str(row.precio_compra))
            else:
                if unidades <= 0:
                    raise ValueError(
                        f"No se puede valorar el ajuste positivo del movimiento "
                        f"#{row.id_movimiento}: no existe un coste promedio anterior."
                    )
                coste_unitario = valor_inventario / unidades

            valor_inventario += variacion * coste_unitario
            unidades += variacion

        elif variacion < 0:
            if unidades <= 0 or unidades + variacion < 0:
                raise ValueError(
                    f"El movimiento #{row.id_movimiento} deja el inventario en negativo; "
                    "no se puede calcular un coste promedio fiable."
                )
            coste_promedio = valor_inventario / unidades
            valor_inventario += variacion * coste_promedio
            unidades += variacion
            if unidades == 0:
                valor_inventario = Decimal("0")

        # Los movimientos anteriores al rango construyen el saldo inicial,
        # pero no aparecen como filas del período.
        if row.fecha.date() < fecha_inicio:
            continue

        movimientos.append({
            "fecha": row.fecha,
            "saldo_inicial": round(float(saldo_inicial_valor), 2),
            "operacion": tipo,
            "tipo_movimiento": tipo,
            "cantidad": row.cantidad,
            "saldo_final": round(float(valor_inventario), 2),
            "saldo_inicial_unidades": round(float(saldo_inicial_unidades), 3),
            "saldo_final_unidades": round(float(unidades), 3),
            "codigo_producto": row.codigo_producto,
            "producto": row.producto,
        })

        clave_tipo = tipo.casefold()
        if clave_tipo not in resumen_normalizado:
            resumen_normalizado[clave_tipo] = {
                "tipo": tipo,
                "cantidad_total": 0.0,
            }
        resumen_normalizado[clave_tipo]["cantidad_total"] += float(cantidad)

    if moneda_id is None:
        raise ValueError(
            "No existe una moneda histórica de compra para valorar las existencias "
            "de este producto."
        )

    moneda_result = await db.execute(
        select(Moneda).where(Moneda.id_moneda == moneda_id)
    )
    moneda = moneda_result.scalar_one_or_none()
    if moneda is None:
        raise ValueError("No se encontró la moneda histórica de compra del producto.")

    producto_info = {
        "codigo": producto.codigo,
        "nombre": producto.nombre,
        "moneda": moneda.nombre,
        "moneda_simbolo": moneda.simbolo,
    }
    resumen = sorted(
        resumen_normalizado.values(),
        key=lambda item: item["tipo"].casefold(),
    )
    return movimientos, dependencia_info, producto_info, resumen

async def buscar_productos_item_anexo(
    db: AsyncSession, id_dependencia: int, q: Optional[str] = None, limite: int = 100
) -> List[Dict[str, Any]]:
    """Productos del catálogo item_anexo con movimientos confirmados en la dependencia."""
    query = (
        select(Productos.id_producto, Productos.nombre, Productos.codigo)
        .join(ItemAnexo, ItemAnexo.id_producto == Productos.id_producto)
        .join(Movimiento, Movimiento.id_producto == Productos.id_producto)
        .where(
            Movimiento.id_dependencia == id_dependencia,
            Movimiento.estado == "confirmado",
        )
        .distinct()
    )
    texto = (q or "").strip()
    if texto:
        patron = f"%{texto}%"
        query = query.where(
            or_(
                Productos.nombre.ilike(patron),
                Productos.codigo.ilike(patron),
                ItemAnexo.codigo.ilike(patron),
            )
        )
    query = query.order_by(Productos.nombre, Productos.id_producto).limit(limite)
    result = await db.execute(query)
    return [
        {"id_producto": row.id_producto, "nombre": row.nombre, "codigo": row.codigo}
        for row in result.all()
    ]


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 2: REGISTRO DE PROYECTOS / CONTRATOS
# ═══════════════════════════════════════════════════════════════════════════════


async def get_registro_proyectos(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene solicitudes de servicio (proyectos) con datos de cliente y moneda."""
    query = (
        select(
            SolicitudServicio,
            Contrato.nombre.label("contrato_nombre"),
            Cliente.nombre.label("cliente_nombre"),
            Moneda.nombre.label("moneda_nombre"),
            Moneda.simbolo.label("moneda_simbolo"),
        )
        .join(Cliente, SolicitudServicio.id_cliente == Cliente.id_cliente, isouter=True)
        .outerjoin(Contrato, SolicitudServicio.id_contrato == Contrato.id_contrato)
        .join(Moneda, Moneda.id_moneda == Contrato.id_moneda, isouter=True)
        .order_by(
            SolicitudServicio.fecha_solicitud.desc(),
            SolicitudServicio.codigo_solicitud,
        )
    )

    if fecha_inicio:
        query = query.filter(SolicitudServicio.fecha_solicitud >= fecha_inicio)
    if fecha_fin:
        query = query.filter(SolicitudServicio.fecha_solicitud <= fecha_fin)

    result = await db.execute(query)
    rows = result.all()

    nombres = await nombres_completos_por_cliente(
        db, [r[0].id_cliente for r in rows]
    )

    data = []
    for r in rows:
        solicitud: SolicitudServicio = r[0]
        moneda_str = ""
        if r.moneda_simbolo and r.moneda_nombre:
            moneda_str = f"{r.moneda_simbolo} ({r.moneda_nombre})"
        elif r.moneda_nombre:
            moneda_str = r.moneda_nombre
        data.append(
            {
                "id_solicitud": solicitud.id_solicitud_servicio,
                "codigo": solicitud.codigo_solicitud or solicitud.codigo_proyecto or "",
                "nombre": solicitud.descripcion or solicitud.codigo_solicitud or "",
                "contrato": r.contrato_nombre or "",
                "cliente": nombres.get(solicitud.id_cliente)
                or r.cliente_nombre
                or "",
                "fecha": solicitud.fecha_solicitud,
                "valor": float(0),
                "moneda": moneda_str,
            }
        )

    meta = {
        "total": len(data),
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 3: REGISTRO DE CREADORES
# ═══════════════════════════════════════════════════════════════════════════════


async def get_registro_creadores(
    db: AsyncSession,
    id_provincia: Optional[int] = None,
    id_municipio: Optional[int] = None,
    vigencia: Optional[str] = None,
    texto_busqueda: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene realizadores desde persona_etapa, con datos del cliente."""
    # Subquery: clientes únicos que aparecen en persona_etapa
    subq = (
        select(PersonaEtapa.id_persona)
        .group_by(PersonaEtapa.id_persona)
        .subquery()
    )

    query = (
        select(
            Cliente,
            Municipio.nombre.label("municipio_nombre"),
            Provincia.nombre.label("provincia_nombre"),
        )
        .join(subq, Cliente.id_cliente == subq.c.id_persona)
        .join(Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True)
        .join(
            Provincia,
            Cliente.id_provincia == Provincia.id_provincia,
            isouter=True,
        )
    )

    if id_provincia is not None:
        query = query.filter(Cliente.id_provincia == id_provincia)
    if id_municipio is not None:
        query = query.filter(Cliente.id_municipio == id_municipio)
    if vigencia == "activo":
        query = query.filter(Cliente.estado == "ACTIVO")
    elif vigencia == "inactivo":
        query = query.filter(Cliente.estado == "INACTIVO")
    if texto_busqueda:
        pattern = f"%{texto_busqueda}%"
        query = query.filter(
            Cliente.nombre.ilike(pattern)
            | Cliente.nit.ilike(pattern)
            | Cliente.codigo.ilike(pattern)
        )

    query = query.order_by(Cliente.nombre)
    result = await db.execute(query)
    rows = result.all()

    nombres = await nombres_completos_por_cliente(
        db, [r[0].id_cliente for r in rows]
    )

    data = []
    for r in rows:
        cliente: Cliente = r[0]
        data.append(
            {
                "id_cliente": cliente.id_cliente,
                "nombre_completo": nombres.get(cliente.id_cliente)
                or cliente.nombre,
                "direccion": cliente.direccion or "",
                "municipio": r.municipio_nombre or "",
                "provincia": r.provincia_nombre or "",
                "codigo": cliente.codigo,
                "nit": cliente.nit or "",
                "tipo_persona": cliente.tipo_persona or "",
                "estado": cliente.estado or "",
            }
        )

    # Agrupar por municipio para metadata
    grupos: Dict[str, int] = {}
    for d in data:
        mun = d["municipio"] or "(Sin municipio)"
        grupos[mun] = grupos.get(mun, 0) + 1

    meta = {"total": len(data), "grupos_municipio": grupos}
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 4: INFORME DE DESEMPEÑO — PROYECTOS POR CREADOR
# ═══════════════════════════════════════════════════════════════════════════════


async def get_informe_desempeno(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    tipo_tercero: str = "ambos",
    id_tercero: Optional[int] = None,
    id_moneda: Optional[int] = None,
    estado: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Informe financiero de liquidaciones de proveedores y realizadores.

    Las dos fuentes se consultan por separado y se normalizan después. Los
    identificadores de liquidación nunca se cruzan entre tablas y los totales
    se agrupan por moneda para no sumar importes incompatibles.
    """
    tipo = (tipo_tercero or "ambos").strip().lower()
    if tipo not in {"proveedores", "realizadores", "ambos"}:
        raise ValueError("tipo_tercero debe ser proveedores, realizadores o ambos")

    registros: List[Dict[str, Any]] = []
    ids_personas: set[int] = set()

    if tipo in {"proveedores", "ambos"}:
        query_proveedores = (
            select(
                Liquidacion,
                Cliente.nombre.label("tercero_nombre"),
                Moneda.nombre.label("moneda_nombre"),
                Moneda.simbolo.label("moneda_simbolo"),
            )
            .join(Cliente, Liquidacion.id_cliente == Cliente.id_cliente)
            .join(Moneda, Liquidacion.id_moneda == Moneda.id_moneda, isouter=True)
        )
        if fecha_inicio:
            query_proveedores = query_proveedores.where(Liquidacion.fecha_emision >= fecha_inicio)
        if fecha_fin:
            query_proveedores = query_proveedores.where(Liquidacion.fecha_emision <= fecha_fin)
        if id_tercero is not None:
            query_proveedores = query_proveedores.where(Liquidacion.id_cliente == id_tercero)
        if id_moneda is not None:
            query_proveedores = query_proveedores.where(Liquidacion.id_moneda == id_moneda)
        if estado == "pagada":
            query_proveedores = query_proveedores.where(Liquidacion.liquidada.is_(True))
        elif estado == "pendiente":
            query_proveedores = query_proveedores.where(Liquidacion.liquidada.is_(False))
        query_proveedores = query_proveedores.order_by(Liquidacion.fecha_emision.desc(), Liquidacion.id_liquidacion.desc())

        for liquidacion, nombre, moneda_nombre, moneda_simbolo in (await db.execute(query_proveedores)).all():
            ids_personas.add(liquidacion.id_cliente)
            registros.append({
                "_id_tercero": liquidacion.id_cliente,
                "_id_moneda": liquidacion.id_moneda,
                "tipo_tercero": "Proveedor",
                "tercero_nombre": nombre or "",
                "documento": liquidacion.codigo or "",
                "fecha_emision": liquidacion.fecha_emision,
                "fecha_liquidacion": liquidacion.fecha_liquidacion,
                "moneda_nombre": moneda_nombre or "",
                "moneda_simbolo": moneda_simbolo or "",
                "importe": Decimal(liquidacion.importe or 0),
                "devengado": Decimal(liquidacion.devengado or 0),
                "importe_agencia": Decimal(liquidacion.importe_agencia or 0),
                "tributario_monto": Decimal(liquidacion.tributario_monto or 0),
                "comision_bancaria": Decimal(liquidacion.comision_bancaria or 0),
                "gasto_empresa": Decimal(liquidacion.gasto_empresa or 0),
                "neto_pagar": Decimal(liquidacion.neto_pagar or 0),
                "tipo_pago": liquidacion.tipo_pago or "",
                "estado": "Liquidada" if liquidacion.liquidada else "Pendiente",
            })

    if tipo in {"realizadores", "ambos"}:
        # No seleccionar la entidad ORM completa: el esquema de algunas
        # instalaciones aún no contiene columnas opcionales recientes del
        # modelo (p. ej. referencia_bancaria), y este informe no las necesita.
        query_realizadores = (
            select(
                PersonaLiquidacion.id_liquidacion.label("pl_id_liquidacion"),
                PersonaLiquidacion.id_persona.label("pl_id_persona"),
                PersonaLiquidacion.id_moneda.label("pl_id_moneda"),
                PersonaLiquidacion.numero.label("pl_numero"),
                PersonaLiquidacion.fecha_emision.label("pl_fecha_emision"),
                PersonaLiquidacion.fecha_liquidacion.label("pl_fecha_liquidacion"),
                PersonaLiquidacion.importe.label("pl_importe"),
                PersonaLiquidacion.devengado.label("pl_devengado"),
                PersonaLiquidacion.tributario_monto.label("pl_tributario_monto"),
                PersonaLiquidacion.comision_bancaria.label("pl_comision_bancaria"),
                PersonaLiquidacion.gasto_empresa.label("pl_gasto_empresa"),
                PersonaLiquidacion.neto_pagar.label("pl_neto_pagar"),
                PersonaLiquidacion.tipo_pago.label("pl_tipo_pago"),
                PersonaLiquidacion.confirmado.label("pl_confirmado"),
                Cliente.nombre.label("tercero_nombre"),
                Moneda.nombre.label("moneda_nombre"),
                Moneda.simbolo.label("moneda_simbolo"),
            )
            .select_from(PersonaLiquidacion)
            .join(Cliente, PersonaLiquidacion.id_persona == Cliente.id_cliente, isouter=True)
            .join(Moneda, PersonaLiquidacion.id_moneda == Moneda.id_moneda, isouter=True)
        )
        if fecha_inicio:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.fecha_emision >= fecha_inicio)
        if fecha_fin:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.fecha_emision <= fecha_fin)
        if id_tercero is not None:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.id_persona == id_tercero)
        if id_moneda is not None:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.id_moneda == id_moneda)
        if estado == "pagada":
            query_realizadores = query_realizadores.where(PersonaLiquidacion.confirmado.is_(True))
        elif estado == "pendiente":
            query_realizadores = query_realizadores.where(PersonaLiquidacion.confirmado.is_(False))
        query_realizadores = query_realizadores.order_by(
            PersonaLiquidacion.fecha_emision.desc(),
            PersonaLiquidacion.id_liquidacion.desc(),
        )

        for liquidacion in (await db.execute(query_realizadores)).all():
            id_persona = liquidacion.pl_id_persona
            if id_persona is not None:
                ids_personas.add(id_persona)
            registros.append({
                "_id_tercero": id_persona,
                "_id_moneda": liquidacion.pl_id_moneda,
                "tipo_tercero": "Realizador",
                "tercero_nombre": liquidacion.tercero_nombre or "",
                "documento": liquidacion.pl_numero or "",
                "fecha_emision": liquidacion.pl_fecha_emision,
                "fecha_liquidacion": liquidacion.pl_fecha_liquidacion,
                "moneda_nombre": liquidacion.moneda_nombre or "",
                "moneda_simbolo": liquidacion.moneda_simbolo or "",
                "importe": Decimal(liquidacion.pl_importe or 0),
                "devengado": Decimal(liquidacion.pl_devengado or 0),
                "importe_agencia": Decimal(liquidacion.pl_importe or 0) - Decimal(liquidacion.pl_devengado or 0),
                "tributario_monto": Decimal(liquidacion.pl_tributario_monto or 0),
                "comision_bancaria": Decimal(liquidacion.pl_comision_bancaria or 0),
                "gasto_empresa": Decimal(liquidacion.pl_gasto_empresa or 0),
                "neto_pagar": Decimal(liquidacion.pl_neto_pagar or 0),
                "tipo_pago": liquidacion.pl_tipo_pago or "",
                "estado": "Confirmada" if liquidacion.pl_confirmado else "Pendiente",
            })

    nombres = await nombres_completos_por_cliente(db, list(ids_personas)) if ids_personas else {}
    registros.sort(key=lambda item: (item["fecha_emision"] or date.min, item["tipo_tercero"], item["tercero_nombre"]), reverse=True)

    campos_monetarios = (
        "importe", "devengado", "importe_agencia", "tributario_monto",
        "comision_bancaria", "gasto_empresa", "neto_pagar",
    )
    totales_por_moneda: Dict[str, Dict[str, Any]] = {}
    terceros_unicos: set[tuple[str, int]] = set()
    for item in registros:
        if item.get("_id_tercero") is not None:
            terceros_unicos.add((item["tipo_tercero"], item["_id_tercero"]))
        item["tercero_nombre"] = nombres.get(item.get("_id_tercero")) or item["tercero_nombre"] or ""
        key = str(item.get("_id_moneda") or "sin_moneda")
        if key not in totales_por_moneda:
            totales_por_moneda[key] = {
                "id_moneda": item.get("_id_moneda"),
                "moneda": item["moneda_simbolo"] or item["moneda_nombre"] or "Sin moneda",
                "total_liquidaciones": 0,
                **{f"total_{campo}": Decimal("0") for campo in campos_monetarios},
            }
        total = totales_por_moneda[key]
        total["total_liquidaciones"] += 1
        for campo in campos_monetarios:
            total[f"total_{campo}"] += item[campo]

    data = []
    for item in registros:
        fila = {key: value for key, value in item.items() if not key.startswith("_")}
        fila["moneda"] = item["moneda_simbolo"] or item["moneda_nombre"] or ""
        fila["id_tercero"] = item["_id_tercero"]
        fila["id_moneda"] = item["_id_moneda"]
        for campo in campos_monetarios:
            fila[campo] = float(item[campo])
        data.append(fila)

    for total in totales_por_moneda.values():
        for campo in campos_monetarios:
            total[f"total_{campo}"] = float(total[f"total_{campo}"])

    meta = {
        "total_items": len(data),
        "total_terceros": len(terceros_unicos),
        "totales_por_moneda": list(totales_por_moneda.values()),
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
        "tipo_tercero": tipo,
    }
    return data, meta


async def get_terceros_con_liquidaciones(
    db: AsyncSession, tipo_tercero: str = "ambos"
) -> List[Dict[str, Any]]:
    """Lista únicamente terceros que tienen liquidaciones para el filtro del informe."""
    tipo = (tipo_tercero or "ambos").strip().lower()
    resultados: Dict[int, Dict[str, Any]] = {}
    if tipo in {"proveedores", "ambos"}:
        q = (
            select(Cliente.id_cliente, Cliente.nombre)
            .join(Liquidacion, Liquidacion.id_cliente == Cliente.id_cliente)
            .distinct()
            .order_by(Cliente.nombre)
        )
        for ident, nombre in (await db.execute(q)).all():
            resultados[ident] = {"id_tercero": ident, "nombre": nombre or "", "tipo_tercero": "Proveedor"}
    if tipo in {"realizadores", "ambos"}:
        q = (
            select(Cliente.id_cliente, Cliente.nombre)
            .join(PersonaLiquidacion, PersonaLiquidacion.id_persona == Cliente.id_cliente)
            .distinct()
            .order_by(Cliente.nombre)
        )
        for ident, nombre in (await db.execute(q)).all():
            actual = resultados.get(ident)
            if actual:
                actual["tipo_tercero"] = "Proveedor / Realizador"
            else:
                resultados[ident] = {"id_tercero": ident, "nombre": nombre or "", "tipo_tercero": "Realizador"}
    nombres = await nombres_completos_por_cliente(db, list(resultados)) if resultados else {}
    for ident, item in resultados.items():
        item["nombre"] = nombres.get(ident) or item["nombre"]
    return sorted(resultados.values(), key=lambda item: (item["nombre"].casefold(), item["tipo_tercero"]))


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 5: INGRESOS Y RETENCIONES (ONAT)
# ═══════════════════════════════════════════════════════════════════════════════


def _decimal_onat(value: Any) -> Decimal:
    return Decimal(str(value if value is not None else 0))


def _agrupar_liquidaciones_onat(
    registros: List[Dict[str, Any]],
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Agrupa liquidaciones confirmadas por tercero, tipo y moneda.

    Los importes se suman una sola vez. Los porcentajes se recalculan como
    tasas ponderadas sobre sus bases (agencia/importe y tributario/devengado).
    El valor económico principal es el importe bruto acumulado, no la suma
    de sus componentes derivados.
    """
    campos = (
        "importe", "devengado", "importe_agencia", "tributario_monto",
        "comision_bancaria", "gasto_empresa", "neto_pagar",
    )
    grupos: Dict[tuple, Dict[str, Any]] = {}
    for registro in registros:
        key = (
            registro["tipo_tercero"],
            registro["id_tercero"],
            registro.get("id_moneda"),
        )
        grupo = grupos.get(key)
        if grupo is None:
            grupo = {
                "id_tercero": registro["id_tercero"],
                "tipo_tercero": registro["tipo_tercero"],
                "persona_nombre": registro.get("persona_nombre") or "",
                "carnet_identidad": registro.get("carnet_identidad") or "",
                "numero_registro": registro.get("numero_registro") or "",
                "nit": registro.get("nit") or "",
                "direccion": registro.get("direccion") or "",
                "id_moneda": registro.get("id_moneda"),
                "moneda": registro.get("moneda") or "Sin moneda",
                "total_liquidaciones": 0,
                **{campo: Decimal("0") for campo in campos},
            }
            grupos[key] = grupo
        grupo["total_liquidaciones"] += 1
        for campo in campos:
            grupo[campo] += _decimal_onat(registro.get(campo))

    data: List[Dict[str, Any]] = []
    for grupo in grupos.values():
        importe = grupo["importe"]
        devengado = grupo["devengado"]
        grupo["valor_total"] = importe
        grupo["porcentaje_agencia"] = (
            grupo["importe_agencia"] * Decimal("100") / importe
            if importe else Decimal("0")
        )
        grupo["tributario"] = (
            grupo["tributario_monto"] * Decimal("100") / devengado
            if devengado else Decimal("0")
        )
        fila = dict(grupo)
        for campo in (*campos, "valor_total", "porcentaje_agencia", "tributario"):
            fila[campo] = round(float(fila[campo]), 2)
        data.append(fila)

    data.sort(key=lambda item: (
        item["tipo_tercero"], item["persona_nombre"].casefold(),
        item["moneda"], item["id_tercero"],
    ))

    totales_por_moneda: Dict[Any, Dict[str, Any]] = {}
    terceros: set[tuple[str, int]] = set()
    total_liquidaciones = 0
    for fila in data:
        terceros.add((fila["tipo_tercero"], fila["id_tercero"]))
        total_liquidaciones += fila["total_liquidaciones"]
        key = fila.get("id_moneda") if fila.get("id_moneda") is not None else "sin_moneda"
        total = totales_por_moneda.setdefault(key, {
            "id_moneda": fila.get("id_moneda"),
            "moneda": fila["moneda"],
            "total_terceros": 0,
            "total_liquidaciones": 0,
            **{f"total_{campo}": Decimal("0") for campo in campos},
        })
        total["total_liquidaciones"] += fila["total_liquidaciones"]
        for campo in campos:
            total[f"total_{campo}"] += _decimal_onat(fila[campo])

    for total in totales_por_moneda.values():
        total["total_terceros"] = sum(
            1 for fila in data if fila.get("id_moneda") == total["id_moneda"]
        )
        for campo in campos:
            total[f"total_{campo}"] = round(float(total[f"total_{campo}"]), 2)
        total["valor_total"] = total["total_importe"]
        total["porcentaje_agencia"] = (
            round(total["total_importe_agencia"] * 100 / total["total_importe"], 2)
            if total["total_importe"] else 0.0
        )
        total["tributario"] = (
            round(total["total_tributario_monto"] * 100 / total["total_devengado"], 2)
            if total["total_devengado"] else 0.0
        )

    meta = {
        "total_items": len(data),
        "total_terceros": len(terceros),
        "total_liquidaciones": total_liquidaciones,
        "totales_por_moneda": list(totales_por_moneda.values()),
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
    # Compatibilidad con consumidores antiguos: solo se expone un total simple
    # cuando el resultado contiene una única moneda.
    meta["totales"] = {}
    if len(meta["totales_por_moneda"]) == 1:
        unico_total = meta["totales_por_moneda"][0]
        meta["totales"] = {
            f"total_{campo}": unico_total[f"total_{campo}"]
            for campo in campos
        }
    return data, meta


async def get_reporte_onat(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_moneda: Optional[int] = None,
    id_persona: Optional[int] = None,
    tipo_tercero: str = "ambos",
    id_tercero: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Valoración consolidada ONAT de proveedores y realizadores confirmados."""
    tipo = (tipo_tercero or "ambos").strip().lower()
    if tipo not in {"proveedores", "realizadores", "ambos"}:
        raise ValueError("tipo_tercero debe ser proveedores, realizadores o ambos")
    tercero_id = id_tercero if id_tercero is not None else id_persona
    registros: List[Dict[str, Any]] = []

    if tipo in {"proveedores", "ambos"}:
        query_proveedores = (
            select(
                Liquidacion.id_cliente.label("id_tercero"),
                Liquidacion.id_moneda.label("id_moneda"),
                Liquidacion.fecha_emision.label("fecha_emision"),
                Liquidacion.importe.label("importe"),
                Liquidacion.devengado.label("devengado"),
                Liquidacion.importe_agencia.label("importe_agencia"),
                Liquidacion.tributario_monto.label("tributario_monto"),
                Liquidacion.comision_bancaria.label("comision_bancaria"),
                Liquidacion.gasto_empresa.label("gasto_empresa"),
                Liquidacion.neto_pagar.label("neto_pagar"),
                Cliente.nombre.label("persona_nombre"),
                Cliente.nit.label("nit"),
                Cliente.direccion.label("direccion"),
                ClienteNatural.carnet_identidad.label("carnet_identidad"),
                ClienteNatural.numero_registro.label("numero_registro"),
                Moneda.nombre.label("moneda_nombre"),
                Moneda.simbolo.label("moneda_simbolo"),
            )
            .select_from(Liquidacion)
            .join(Cliente, Liquidacion.id_cliente == Cliente.id_cliente)
            .join(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente, isouter=True)
            .join(Moneda, Liquidacion.id_moneda == Moneda.id_moneda, isouter=True)
            .where(Liquidacion.liquidada.is_(True))
        )
        if fecha_inicio:
            query_proveedores = query_proveedores.where(Liquidacion.fecha_emision >= fecha_inicio)
        if fecha_fin:
            query_proveedores = query_proveedores.where(Liquidacion.fecha_emision <= fecha_fin)
        if id_moneda is not None:
            query_proveedores = query_proveedores.where(Liquidacion.id_moneda == id_moneda)
        if tercero_id is not None:
            query_proveedores = query_proveedores.where(Liquidacion.id_cliente == tercero_id)

        for row in (await db.execute(query_proveedores)).all():
            registros.append({
                "id_tercero": row.id_tercero,
                "tipo_tercero": "Proveedor",
                "persona_nombre": row.persona_nombre or "",
                "carnet_identidad": row.carnet_identidad or "",
                "numero_registro": row.numero_registro or "",
                "nit": row.nit or "",
                "direccion": row.direccion or "",
                "id_moneda": row.id_moneda,
                "moneda": f"{row.moneda_simbolo} ({row.moneda_nombre})" if row.moneda_nombre else (row.moneda_simbolo or ""),
                "importe": row.importe,
                "devengado": row.devengado,
                "importe_agencia": row.importe_agencia,
                "tributario_monto": row.tributario_monto,
                "comision_bancaria": row.comision_bancaria,
                "gasto_empresa": row.gasto_empresa,
                "neto_pagar": row.neto_pagar,
            })

    if tipo in {"realizadores", "ambos"}:
        # Selección explícita: evita columnas del modelo que aún no existen en
        # algunas bases desplegadas (referencia_bancaria, factura, importe_agencia).
        query_realizadores = (
            select(
                PersonaLiquidacion.id_persona.label("id_tercero"),
                PersonaLiquidacion.id_moneda.label("id_moneda"),
                PersonaLiquidacion.fecha_emision.label("fecha_emision"),
                PersonaLiquidacion.importe.label("importe"),
                PersonaLiquidacion.devengado.label("devengado"),
                PersonaLiquidacion.tributario_monto.label("tributario_monto"),
                PersonaLiquidacion.comision_bancaria.label("comision_bancaria"),
                PersonaLiquidacion.gasto_empresa.label("gasto_empresa"),
                PersonaLiquidacion.neto_pagar.label("neto_pagar"),
                Cliente.nombre.label("persona_nombre"),
                Cliente.nit.label("nit"),
                Cliente.direccion.label("direccion"),
                ClienteNatural.carnet_identidad.label("carnet_identidad"),
                ClienteNatural.numero_registro.label("numero_registro"),
                Moneda.nombre.label("moneda_nombre"),
                Moneda.simbolo.label("moneda_simbolo"),
            )
            .select_from(PersonaLiquidacion)
            .join(Cliente, PersonaLiquidacion.id_persona == Cliente.id_cliente)
            .join(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente, isouter=True)
            .join(Moneda, PersonaLiquidacion.id_moneda == Moneda.id_moneda, isouter=True)
            .where(PersonaLiquidacion.confirmado.is_(True))
        )
        if fecha_inicio:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.fecha_emision >= fecha_inicio)
        if fecha_fin:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.fecha_emision <= fecha_fin)
        if id_moneda is not None:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.id_moneda == id_moneda)
        if tercero_id is not None:
            query_realizadores = query_realizadores.where(PersonaLiquidacion.id_persona == tercero_id)

        for row in (await db.execute(query_realizadores)).all():
            importe = _decimal_onat(row.importe)
            devengado = _decimal_onat(row.devengado)
            registros.append({
                "id_tercero": row.id_tercero,
                "tipo_tercero": "Realizador",
                "persona_nombre": row.persona_nombre or "",
                "carnet_identidad": row.carnet_identidad or "",
                "numero_registro": row.numero_registro or "",
                "nit": row.nit or "",
                "direccion": row.direccion or "",
                "id_moneda": row.id_moneda,
                "moneda": f"{row.moneda_simbolo} ({row.moneda_nombre})" if row.moneda_nombre else (row.moneda_simbolo or ""),
                "importe": importe,
                "devengado": devengado,
                "importe_agencia": importe - devengado,
                "tributario_monto": row.tributario_monto,
                "comision_bancaria": row.comision_bancaria,
                "gasto_empresa": row.gasto_empresa,
                "neto_pagar": row.neto_pagar,
            })

    nombres_ids = list({r["id_tercero"] for r in registros if r.get("id_tercero") is not None})
    nombres = await nombres_completos_por_cliente(db, nombres_ids) if nombres_ids else {}
    for registro in registros:
        registro["persona_nombre"] = nombres.get(registro["id_tercero"]) or registro["persona_nombre"]
    data, meta = _agrupar_liquidaciones_onat(registros, fecha_inicio, fecha_fin)
    meta["tipo_tercero"] = tipo
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 6: RETRIBUCIÓN POR ESCALA DE INGRESOS (MINCULT)
# ═══════════════════════════════════════════════════════════════════════════════


async def get_reporte_mincult(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene distribución por escalas de ingresos para MINCULT."""
    # Definir los brackets
    brackets = [
        ("Hasta 100", 0, 100),
        ("De 101 a 500", 101, 500),
        ("De 501 a 1000", 501, 1000),
        ("De 1001 a 2000", 1001, 2000),
        ("De 2001 a 3000", 2001, 3000),
        ("De 3001 a 5000", 3001, 5000),
        ("De 5001 a 10000", 5001, 10000),
        ("De 10001 a 15000", 10001, 15000),
        ("De 15001 a 20000", 15001, 20000),
        ("Más de 20000", 20001, 99999999),
    ]

    # Query base: obtener todas las liquidaciones de personas en el período
    query = select(PersonaLiquidacion)

    if fecha_inicio:
        query = query.filter(PersonaLiquidacion.fecha_emision >= fecha_inicio)
    if fecha_fin:
        query = query.filter(PersonaLiquidacion.fecha_emision <= fecha_fin)

    result = await db.execute(query)
    liquidaciones = result.scalars().all()

    # Clasificar en brackets
    bracket_counts: Dict[str, int] = {}
    bracket_sums: Dict[str, float] = {}
    bracket_artists: Dict[str, set] = {}

    for label, lo, hi in brackets:
        bracket_counts[label] = 0
        bracket_sums[label] = 0.0
        bracket_artists[label] = set()

    for pl in liquidaciones:
        dev = float(pl.devengado)
        for label, lo, hi in brackets:
            if lo <= dev <= hi:
                bracket_counts[label] += 1
                bracket_sums[label] += dev
                if pl.id_persona:
                    bracket_artists[label].add(pl.id_persona)
                break
        else:
            # Si no encaja en ningún bracket (devengado = 0 o negativo)
            bracket_counts["Hasta 100"] += 1
            bracket_sums["Hasta 100"] += dev
            if pl.id_persona:
                bracket_artists["Hasta 100"].add(pl.id_persona)

    data = []
    for label, lo, hi in brackets:
        data.append(
            {
                "bracket": label,
                "desde": lo,
                "hasta": hi if hi != 99999999 else None,
                "cantidad": bracket_counts[label],
                "total_devengado": round(bracket_sums[label], 2),
                "cantidad_artistas": len(bracket_artists[label]),
            }
        )

    # También incluir fila "Sin ingresos" (devengado = 0)
    # ya está incluida en "Hasta 100"

    meta = {
        "total_liquidaciones": len(liquidaciones),
        "total_devengado_general": round(
            sum(float(pl.devengado) for pl in liquidaciones), 2
        ),
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 7: RESUMEN DE LIQUIDACIONES
# ═══════════════════════════════════════════════════════════════════════════════


async def get_resumen_liquidaciones(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_cliente: Optional[int] = None,
    id_moneda: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene resumen de liquidaciones con cliente, moneda, productos.

    Los productos de todas las liquidaciones se traen en una sola consulta y se
    agrupan en memoria: antes se hacía una consulta por liquidación (N+1).
    """
    query = (
        select(
            Liquidacion,
            Cliente.nombre.label("cliente_nombre"),
            Cliente.nit.label("cliente_nit"),
            Cliente.codigo.label("cliente_codigo"),
            Moneda.nombre.label("moneda_nombre"),
            Moneda.simbolo.label("moneda_simbolo"),
        )
        .join(Cliente, Liquidacion.id_cliente == Cliente.id_cliente)
        .join(Moneda, Liquidacion.id_moneda == Moneda.id_moneda)
    )

    if fecha_inicio:
        query = query.filter(Liquidacion.fecha_emision >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Liquidacion.fecha_emision <= fecha_fin)
    if id_cliente is not None:
        query = query.filter(Liquidacion.id_cliente == id_cliente)
    if id_moneda is not None:
        query = query.filter(Liquidacion.id_moneda == id_moneda)

    query = query.order_by(Liquidacion.fecha_emision.desc())
    result = await db.execute(query)
    rows = result.all()

    nombres = await nombres_completos_por_cliente(
        db, [r[0].id_cliente for r in rows]
    )

    # ── Productos de TODAS las liquidaciones en una sola consulta ────────────
    liquidacion_ids = [r[0].id_liquidacion for r in rows]
    productos_por_liquidacion: Dict[int, List[Dict[str, Any]]] = {}
    if liquidacion_ids:
        prod_result = await db.execute(
            select(
                ProductosEnLiquidacion,
                Productos.nombre.label("producto_nombre"),
                Productos.codigo.label("producto_codigo"),
            )
            .join(
                Productos,
                ProductosEnLiquidacion.id_producto == Productos.id_producto,
                isouter=True,
            )
            .filter(ProductosEnLiquidacion.id_liquidacion.in_(liquidacion_ids))
            .order_by(ProductosEnLiquidacion.id_producto_en_liquidacion)
        )
        for pr in prod_result.all():
            pel: ProductosEnLiquidacion = pr[0]
            productos_por_liquidacion.setdefault(pel.id_liquidacion, []).append(
                {
                    "codigo": pr.producto_codigo or "",
                    "nombre": pr.producto_nombre or "",
                    "cantidad": pel.cantidad,
                    "precio": float(pel.precio),
                }
            )

    data = []
    totales_acum = {
        "total_devengado": 0.0,
        "total_tributario": 0.0,
        "total_comision_bancaria": 0.0,
        "total_gasto_empresa": 0.0,
        "total_importe": 0.0,
        "total_neto_pagar": 0.0,
        "total_importe_agencia": 0.0,
        "total_tributario_monto": 0.0,
    }

    for r in rows:
        liq: Liquidacion = r[0]
        productos = productos_por_liquidacion.get(liq.id_liquidacion, [])

        item = {
            "id_liquidacion": liq.id_liquidacion,
            "codigo": liq.codigo,
            "fecha_emision": liq.fecha_emision,
            "fecha_liquidacion": liq.fecha_liquidacion,
            "cliente_nombre": nombres.get(liq.id_cliente)
            or r.cliente_nombre
            or "",
            "cliente_nit": r.cliente_nit or "",
            "cliente_codigo": r.cliente_codigo,
            "moneda": f"{r.moneda_simbolo} ({r.moneda_nombre})"
            if r.moneda_nombre
            else "",
            "devengado": float(liq.devengado),
            "tributario": float(liq.tributario),
            "comision_bancaria": float(liq.comision_bancaria),
            "gasto_empresa": float(liq.gasto_empresa),
            "importe": float(liq.importe),
            "neto_pagar": float(liq.neto_pagar),
            "porcentaje_agencia": float(liq.porcentaje_agencia),
            "importe_agencia": float(liq.importe_agencia),
            "tributario_monto": float(liq.tributario_monto),
            "tipo_pago": liq.tipo_pago,
            "liquidada": liq.liquidada,
            "productos": productos,
        }
        data.append(item)

        totales_acum["total_devengado"] += item["devengado"]
        totales_acum["total_tributario"] += item["tributario"]
        totales_acum["total_comision_bancaria"] += item["comision_bancaria"]
        totales_acum["total_gasto_empresa"] += item["gasto_empresa"]
        totales_acum["total_importe"] += item["importe"]
        totales_acum["total_neto_pagar"] += item["neto_pagar"]
        totales_acum["total_importe_agencia"] += item["importe_agencia"]
        totales_acum["total_tributario_monto"] += item["tributario_monto"]

    meta = {
        "total_items": len(data),
        "totales": totales_acum,
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  LISTADO DE PERSONAS (para dropdowns en el frontend)
# ═══════════════════════════════════════════════════════════════════════════════


async def get_personas_list(db: AsyncSession) -> List[Dict[str, Any]]:
    """Retorna personas naturales y TCP para usar en filtros."""
    query = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            Cliente.tipo_persona,
            ClienteNatural.nombre.label("natural_nombre"),
            ClienteNatural.primer_apellido.label("natural_primer_apellido"),
            ClienteNatural.segundo_apellido.label("natural_segundo_apellido"),
            ClienteNatural.carnet_identidad,
            ClienteTCP.nombre.label("tcp_nombre"),
            ClienteTCP.primer_apellido.label("tcp_primer_apellido"),
            ClienteTCP.segundo_apellido.label("tcp_segundo_apellido"),
            ClienteTCP.numero_registro_proyecto,
        )
        .outerjoin(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente)
        .outerjoin(ClienteTCP, Cliente.id_cliente == ClienteTCP.id_cliente)
        .where(
            Cliente.tipo_persona.in_(["NATURAL", "TCP"]),
            Cliente.tipo_relacion.in_(["CLIENTE", "AMBAS"]),
        )
        .order_by(Cliente.nombre)
    )
    result = await db.execute(query)
    rows = result.all()

    personas: List[Dict[str, Any]] = []
    for row in rows:
        if row.tipo_persona == "TCP":
            nombre = row.tcp_nombre or row.nombre
            apellidos = componer_nombre_completo(
                None, row.tcp_primer_apellido, row.tcp_segundo_apellido
            )
            carnet = row.numero_registro_proyecto or ""
        else:
            nombre = row.natural_nombre or row.nombre
            apellidos = componer_nombre_completo(
                None, row.natural_primer_apellido, row.natural_segundo_apellido
            )
            carnet = row.carnet_identidad or ""

        personas.append(
            {
                "id_persona": row.id_cliente,
                "nombre": nombre,
                "apellidos": apellidos,
                "carnet_identidad": carnet,
            }
        )

    return personas

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.cliente import Cliente
from src.models.cliente_juridica import ClienteJuridica
from src.models.cliente_natural import ClienteNatural
from src.models.cliente_tcp import ClienteTCP
from src.models.contrato import Contrato, EstadoContrato, TipoContrato
from src.models.dependencia import Dependencia, Municipio, Provincia
from src.models.liquidacion import Liquidacion
from src.models.moneda import Moneda
from src.models.producto import Productos
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.productos_en_liquidacion import ProductosEnLiquidacion
from src.models.servicio import (
    Etapa,
    PersonaEtapa,
    PersonaLiquidacion,
    SolicitudServicio,
)


async def get_proveedores_por_dependencia(
    db: AsyncSession, id_dependencia: int, tipo_entidad: str, id_provincia: Optional[int] = None
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
            "codigo": cliente_obj.codigo,
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


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 1: REGISTRO DE CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════


async def get_registro_clientes(
    db: AsyncSession,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene todos los clientes con tipo_relacion 'CLIENTE' o 'AMBAS',
    incluyendo el código REEUP para personas jurídicas."""
    query = (
        select(Cliente)
        .filter(Cliente.tipo_relacion.in_(["CLIENTE", "AMBAS"]))
        .order_by(Cliente.nombre)
    )
    result = await db.execute(query)
    clientes = result.scalars().all()

    # Obtener REEUP para jurídicos en un solo query
    cliente_ids_juridicos = [
        c.id_cliente for c in clientes if c.tipo_persona == "JURIDICA"
    ]
    reup_map: Dict[int, str] = {}
    if cliente_ids_juridicos:
        reup_query = select(ClienteJuridica).filter(
            ClienteJuridica.id_cliente.in_(cliente_ids_juridicos)
        )
        reup_result = await db.execute(reup_query)
        for rj in reup_result.scalars().all():
            reup_map[rj.id_cliente] = rj.codigo_reup

    data = []
    for c in clientes:
        data.append(
            {
                "id_cliente": c.id_cliente,
                "nombre": c.nombre,
                "reeup": reup_map.get(c.id_cliente, ""),
                "nit": c.nit or "",
                "direccion": c.direccion or "",
            }
        )

    return data, {"total": len(data)}


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 2: REGISTRO DE PROYECTOS / CONTRATOS
# ═══════════════════════════════════════════════════════════════════════════════


async def get_registro_proyectos(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene contratos/proyectos con datos de cliente, moneda, tipo y estado."""
    query = (
        select(
            Contrato,
            Cliente.nombre.label("cliente_nombre"),
            Moneda.nombre.label("moneda_nombre"),
            Moneda.simbolo.label("moneda_simbolo"),
            TipoContrato.nombre.label("tipo_contrato_nombre"),
            EstadoContrato.nombre.label("estado_contrato_nombre"),
        )
        .join(Cliente, Contrato.id_cliente == Cliente.id_cliente)
        .join(Moneda, Contrato.id_moneda == Moneda.id_moneda)
        .join(TipoContrato, Contrato.id_tipo_contrato == TipoContrato.id_tipo_contrato)
        .join(
            EstadoContrato,
            Contrato.id_estado == EstadoContrato.id_estado_contrato,
        )
        .order_by(Contrato.fecha.desc(), Contrato.nombre)
    )

    if fecha_inicio:
        query = query.filter(Contrato.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Contrato.fecha <= fecha_fin)

    result = await db.execute(query)
    rows = result.all()

    data = []
    for r in rows:
        contrato: Contrato = r[0]
        data.append(
            {
                "id_contrato": contrato.id_contrato,
                "codigo": contrato.codigo or "",
                "nombre": contrato.nombre,
                "cliente": r.cliente_nombre,
                "fecha": contrato.fecha,
                "valor": float(contrato.monto),
                "moneda": f"{r.moneda_simbolo} ({r.moneda_nombre})",
                "tipo_contrato": r.tipo_contrato_nombre,
                "estado": r.estado_contrato_nombre,
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
    """Obtiene creadores (ClienteNatural + Cliente) con filtros."""
    query = (
        select(
            Cliente,
            ClienteNatural,
            Municipio.nombre.label("municipio_nombre"),
            Provincia.nombre.label("provincia_nombre"),
        )
        .join(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente)
        .join(Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True)
        .join(
            Provincia,
            Cliente.id_provincia == Provincia.id_provincia,
            isouter=True,
        )
        .filter(Cliente.tipo_persona == "NATURAL")
    )

    if id_provincia is not None:
        query = query.filter(Cliente.id_provincia == id_provincia)
    if id_municipio is not None:
        query = query.filter(Cliente.id_municipio == id_municipio)
    if vigencia == "activo":
        query = query.filter(
            (ClienteNatural.vigencia >= date.today())
            | (ClienteNatural.vigencia.is_(None))
        )
    elif vigencia == "inactivo":
        query = query.filter(ClienteNatural.vigencia < date.today())
    if texto_busqueda:
        pattern = f"%{texto_busqueda}%"
        query = query.filter(
            (ClienteNatural.nombre.ilike(pattern))
            | (ClienteNatural.primer_apellido.ilike(pattern))
            | (ClienteNatural.segundo_apellido.ilike(pattern))
            | (ClienteNatural.carnet_identidad.ilike(pattern))
            | (Cliente.nombre.ilike(pattern))
        )

    query = query.order_by(
        Municipio.nombre, ClienteNatural.primer_apellido, ClienteNatural.nombre
    )
    result = await db.execute(query)
    rows = result.all()

    data = []
    for r in rows:
        cliente: Cliente = r[0]
        natural: ClienteNatural = r[1]
        nombre_completo = (
            f"{natural.nombre} {natural.primer_apellido}"
            f"{' ' + natural.segundo_apellido if natural.segundo_apellido else ''}"
        )
        vigente = (
            "SÍ"
            if (natural.vigencia is None or natural.vigencia >= date.today())
            else "NO"
        )
        data.append(
            {
                "id_cliente": cliente.id_cliente,
                "carnet_identidad": natural.carnet_identidad,
                "nombre_completo": nombre_completo,
                "direccion": cliente.direccion or "",
                "municipio": r.municipio_nombre or "",
                "provincia": r.provincia_nombre or "",
                "numero_registro": natural.numero_registro or "",
                "codigo": cliente.codigo,
                "vigencia": vigente,
                "vigencia_fecha": natural.vigencia.isoformat()
                if natural.vigencia
                else "",
                "fecha_baja": natural.fecha_baja.isoformat()
                if natural.fecha_baja
                else "",
                "en_baja": natural.en_baja,
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
    id_persona: Optional[int] = None,
    estado: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene desempeño de creadores por proyecto/etapa."""
    # Subquery base desde PersonaEtapa
    query = (
        select(
            PersonaEtapa,
            Cliente.nombre.label("persona_nombre"),
            Cliente.codigo.label("persona_codigo"),
            Etapa.nombre_etapa,
            Etapa.numero_etapa,
            Etapa.valor.label("etapa_valor"),
            Etapa.fecha_pago,
            Etapa.pagada,
            SolicitudServicio.codigo_proyecto,
            SolicitudServicio.descripcion.label("proyecto_descripcion"),
            SolicitudServicio.fecha_solicitud,
        )
        .join(Etapa, PersonaEtapa.id_etapa == Etapa.id_etapa)
        .join(
            SolicitudServicio,
            Etapa.id_solicitud_servicio == SolicitudServicio.id_solicitud_servicio,
        )
        .join(
            Cliente,
            PersonaEtapa.id_persona == Cliente.id_cliente,
        )
    )

    if fecha_inicio:
        query = query.filter(Etapa.fecha_pago >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Etapa.fecha_pago <= fecha_fin)
    if id_persona is not None:
        query = query.filter(PersonaEtapa.id_persona == id_persona)
    if estado == "pagada":
        query = query.filter(Etapa.pagada.is_(True))
    elif estado == "pendiente":
        query = query.filter(Etapa.pagada.is_(False))

    query = query.order_by(
        Cliente.nombre, SolicitudServicio.codigo_proyecto, Etapa.numero_etapa
    )
    result = await db.execute(query)
    rows = result.all()

    data = []
    for r in rows:
        pe: PersonaEtapa = r[0]
        data.append(
            {
                "id_persona": pe.id_persona,
                "persona_nombre": r.persona_nombre,
                "persona_codigo": r.persona_codigo,
                "codigo_proyecto": r.codigo_proyecto or "",
                "proyecto_descripcion": r.proyecto_descripcion or "",
                "nombre_etapa": r.nombre_etapa or "",
                "numero_etapa": r.numero_etapa,
                "etapa_valor": float(r.etapa_valor),
                "cobro": float(pe.cobro),
                "por_cobrar": float(pe.por_cobrar),
                "fecha_pago": r.fecha_pago,
                "pagada": r.pagada,
                "fecha_solicitud": r.fecha_solicitud,
            }
        )

    # Calcular totales por persona y gran total
    totales_por_persona: Dict[str, Dict[str, Any]] = {}
    gran_total_cobro = 0.0
    gran_total_valor = 0.0
    for d in data:
        key = d["persona_nombre"]
        if key not in totales_por_persona:
            totales_por_persona[key] = {
                "total_cobro": 0.0,
                "total_valor": 0.0,
                "id_persona": d["id_persona"],
            }
        totales_por_persona[key]["total_cobro"] += d["cobro"]
        totales_por_persona[key]["total_valor"] += d["etapa_valor"]
        gran_total_cobro += d["cobro"]
        gran_total_valor += d["etapa_valor"]

    meta = {
        "total_items": len(data),
        "total_personas": len(totales_por_persona),
        "totales_por_persona": totales_por_persona,
        "gran_total_cobro": gran_total_cobro,
        "gran_total_valor": gran_total_valor,
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
    return data, meta


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTE 5: INGRESOS Y RETENCIONES (ONAT)
# ═══════════════════════════════════════════════════════════════════════════════


async def get_reporte_onat(
    db: AsyncSession,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_moneda: Optional[int] = None,
    id_persona: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene ingresos y retenciones de artistas para reporte ONAT."""
    query = (
        select(
            PersonaLiquidacion,
            Cliente.nombre.label("persona_nombre"),
            Cliente.nit.label("persona_nit"),
            Cliente.direccion.label("persona_direccion"),
            ClienteNatural.carnet_identidad,
            ClienteNatural.numero_registro,
            Moneda.nombre.label("moneda_nombre"),
            Moneda.simbolo.label("moneda_simbolo"),
        )
        .join(
            Cliente,
            PersonaLiquidacion.id_persona == Cliente.id_cliente,
            isouter=True,
        )
        .join(
            ClienteNatural,
            Cliente.id_cliente == ClienteNatural.id_cliente,
            isouter=True,
        )
        .join(
            Moneda,
            PersonaLiquidacion.id_moneda == Moneda.id_moneda,
            isouter=True,
        )
    )

    if fecha_inicio:
        query = query.filter(PersonaLiquidacion.fecha_emision >= fecha_inicio)
    if fecha_fin:
        query = query.filter(PersonaLiquidacion.fecha_emision <= fecha_fin)
    if id_moneda is not None:
        query = query.filter(PersonaLiquidacion.id_moneda == id_moneda)
    if id_persona is not None:
        query = query.filter(PersonaLiquidacion.id_persona == id_persona)

    query = query.order_by(PersonaLiquidacion.fecha_emision.desc())
    result = await db.execute(query)
    rows = result.all()

    data = []
    for r in rows:
        pl: PersonaLiquidacion = r[0]
        data.append(
            {
                "id_liquidacion": pl.id_liquidacion,
                "numero": pl.numero or "",
                "fecha_emision": pl.fecha_emision,
                "fecha_liquidacion": pl.fecha_liquidacion,
                "persona_nombre": r.persona_nombre or "",
                "carnet_identidad": r.carnet_identidad or "",
                "numero_registro": r.numero_registro or "",
                "nit": r.persona_nit or "",
                "direccion": r.persona_direccion or "",
                "moneda": f"{r.moneda_simbolo} ({r.moneda_nombre})"
                if r.moneda_nombre
                else "",
                "importe": float(pl.importe),
                "devengado": float(pl.devengado),
                "porcentaje_caguayo": float(pl.porcentaje_caguayo),
                "importe_caguayo": float(pl.importe_caguayo),
                "porciento_gestion": float(pl.porciento_gestion),
                "porciento_empresa": float(pl.porciento_empresa),
                "tributario": float(pl.tributario),
                "tributario_monto": float(pl.tributario_monto),
                "comision_bancaria": float(pl.comision_bancaria),
                "gasto_empresa": float(pl.gasto_empresa),
                "neto_pagar": float(pl.neto_pagar),
                "tipo_pago": pl.tipo_pago,
                "confirmado": pl.confirmado,
            }
        )

    totales = {
        "total_importe": sum(d["importe"] for d in data),
        "total_devengado": sum(d["devengado"] for d in data),
        "total_importe_caguayo": sum(d["importe_caguayo"] for d in data),
        "total_tributario_monto": sum(d["tributario_monto"] for d in data),
        "total_comision_bancaria": sum(d["comision_bancaria"] for d in data),
        "total_gasto_empresa": sum(d["gasto_empresa"] for d in data),
        "total_neto_pagar": sum(d["neto_pagar"] for d in data),
    }

    meta = {
        "total_items": len(data),
        "totales": totales,
        "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
        "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
    }
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
    tipo_concepto: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Obtiene resumen de liquidaciones con cliente, moneda, productos."""
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

    query = query.order_by(Liquidacion.fecha_emision.desc())
    result = await db.execute(query)
    rows = result.all()

    data = []
    totales_acum = {
        "total_devengado": 0.0,
        "total_tributario": 0.0,
        "total_comision_bancaria": 0.0,
        "total_gasto_empresa": 0.0,
        "total_importe": 0.0,
        "total_neto_pagar": 0.0,
        "total_importe_caguayo": 0.0,
        "total_tributario_monto": 0.0,
    }

    for r in rows:
        liq: Liquidacion = r[0]

        # Obtener productos asociados
        prod_query = (
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
            .filter(ProductosEnLiquidacion.id_liquidacion == liq.id_liquidacion)
        )
        prod_result = await db.execute(prod_query)
        prod_rows = prod_result.all()

        productos = []
        for pr in prod_rows:
            pel: ProductosEnLiquidacion = pr[0]
            productos.append(
                {
                    "codigo": pr.producto_codigo or "",
                    "nombre": pr.producto_nombre or "",
                    "cantidad": pel.cantidad,
                    "precio": float(pel.precio),
                }
            )

        item = {
            "id_liquidacion": liq.id_liquidacion,
            "codigo": liq.codigo,
            "fecha_emision": liq.fecha_emision,
            "fecha_liquidacion": liq.fecha_liquidacion,
            "cliente_nombre": r.cliente_nombre,
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
            "porcentaje_caguayo": float(liq.porcentaje_caguayo),
            "importe_caguayo": float(liq.importe_caguayo),
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
        totales_acum["total_importe_caguayo"] += item["importe_caguayo"]
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
    """Retorna lista de clientes de tipo NATURAL para usar en filtros."""
    query = (
        select(
            Cliente.id_cliente,
            Cliente.nombre,
            ClienteNatural.carnet_identidad,
        )
        .join(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente)
        .where(
            Cliente.tipo_persona == "NATURAL",
            Cliente.tipo_relacion.in_(["CLIENTE", "AMBAS"]),
        )
        .order_by(Cliente.nombre)
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "id_persona": row.id_cliente,
            "nombre": row.nombre,
            "apellidos": "",  # Cliente.nombre es el nombre completo
            "carnet_identidad": row.carnet_identidad or "",
        }
        for row in rows
    ]

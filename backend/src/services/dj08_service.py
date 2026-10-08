"""Cálculo de la DJ-08 (Impuesto sobre Ingresos Personales - CUP).

Convierte los datos del sistema (dependencia, usuario, actividades
económicas y tributos) más la entrada del usuario en las secciones A-G
del formulario oficial. Es la fuente única de verdad: los endpoints de
exportación recalculan server-side antes de pintar el PDF.
"""

import logging
from decimal import Decimal
from typing import Optional, List, Tuple

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto.dj08_dto import DJ08Input, DJ08Calculado, EscalaFila
from src.models import (
    ActividadEconomica,
    Tributo,
    DeclaracionJurada,
    DeclaracionActividad,
    DeclaracionTributo,
    Usuario,
    Dependencia,
)

logger = logging.getLogger(__name__)

# Escala progresiva del impuesto (Sección G, filas 45-54): (desde, hasta, pct)
ESCALA: List[Tuple[Decimal, Optional[Decimal], int]] = [
    (Decimal("0"), Decimal("25000"), 5),
    (Decimal("25000"), Decimal("50000"), 10),
    (Decimal("50000"), Decimal("100000"), 15),
    (Decimal("100000"), Decimal("200000"), 20),
    (Decimal("200000"), Decimal("350000"), 25),
    (Decimal("350000"), Decimal("500000"), 30),
    (Decimal("500000"), Decimal("650000"), 35),
    (Decimal("650000"), Decimal("800000"), 40),
    (Decimal("800000"), Decimal("1000000"), 45),
    (Decimal("1000000"), None, 50),
]

ZERO = Decimal("0")


def calcular_escala(
    base_imponible: Decimal,
) -> Tuple[List[EscalaFila], Decimal, Decimal]:
    """Calcula las filas 45-54 y los totales de la fila 55."""
    bi = max(base_imponible, ZERO)
    filas: List[EscalaFila] = []
    total_base = ZERO
    total_importe = ZERO
    for i, (desde, hasta, pct) in enumerate(ESCALA):
        base_tramo = ZERO
        if hasta is None:
            if bi > desde:
                base_tramo = bi - desde
        else:
            if bi > desde:
                base_tramo = min(bi, hasta) - desde
        importe = (base_tramo * Decimal(pct) / Decimal("100")).quantize(Decimal("0.01"))
        filas.append(
            EscalaFila(
                desde=desde,
                hasta=hasta,
                base_imponible=base_tramo,
                tipo=pct,
                importe=importe,
                fila=45 + i,
            )
        )
        total_base += base_tramo
        total_importe += importe
    return filas, total_base, total_importe


def calcular_base_imponible(
    total_ingresos: Decimal,
    minimo_exento: Decimal,
    total_gastos: Decimal,
    total_tributos: Decimal,
    entrada: DJ08Input,
) -> Decimal:
    """Sección B, fila 20: ingresos - mínimo exento - gastos - tributos - resto."""
    bi = (
        total_ingresos
        - minimo_exento
        - total_gastos
        - total_tributos
        - entrada.contribucion_restauracion
        - entrada.pagos_arrendamiento
        - entrada.importe_exonerado_reparaciones
        - entrada.otros_descuentos
        - entrada.bonificacion_mfp
    )
    return max(bi, ZERO)


async def _dependencia_del_usuario(
    db: AsyncSession, usuario: Usuario
) -> Dependencia:
    if not usuario.id_dependencia:
        raise HTTPException(
            status_code=400,
            detail="El usuario no tiene una dependencia asignada",
        )
    dep = await db.get(Dependencia, usuario.id_dependencia)
    if not dep:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    return dep


async def construir_datos(
    db: AsyncSession, id_usuario: int, entrada: DJ08Input
) -> DJ08Calculado:
    """Lee dependencia/usuario/actividades/tributos y devuelve el modelo calculado."""
    usuario = await db.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    dep = await _dependencia_del_usuario(db, usuario)

    # Cargar nombres de provincia/municipio de la dependencia
    provincia = ""
    municipio = ""
    if dep.id_provincia:
        from src.models import Provincia

        prov = await db.get(Provincia, dep.id_provincia)
        if prov:
            provincia = prov.nombre
    if dep.id_municipio:
        from src.models import Municipio

        mun = await db.get(Municipio, dep.id_municipio)
        if mun:
            municipio = mun.nombre

    actividades = (
        await db.exec(
            select(ActividadEconomica).order_by(
                ActividadEconomica.orden, ActividadEconomica.id_actividad
            )
        )
    ).all()
    tributos = (await db.exec(select(Tributo).order_by(Tributo.id_tributo))).all()

    total_ingresos = sum((a.ingresos for a in actividades), ZERO)
    total_gastos = sum((a.gastos for a in actividades), ZERO)
    total_tributos = sum((t.importe for t in tributos), ZERO)

    base_imponible = calcular_base_imponible(
        total_ingresos=total_ingresos,
        minimo_exento=entrada.minimo_exento,
        total_gastos=total_gastos,
        total_tributos=total_tributos,
        entrada=entrada,
    )

    escala, escala_total_base, impuesto_escala = calcular_escala(base_imponible)

    # Sección C: fila 26 = 21 - 22 - 23 - 24 - 25 (si > 0); fila 27 = devolución
    bruto = (
        impuesto_escala
        - entrada.cuotas_mensuales
        - entrada.otros_pagos_anticipados
        - entrada.total_retenciones
        - entrada.bonificaciones_autorizadas
    )
    impuesto_pagar = max(bruto, ZERO)
    total_devolver = max(-bruto, ZERO)

    # Sección D (rectificada)
    dif = entrada.impuesto_declaracion_rectificada - entrada.pago_declaracion_anterior
    diferencia_pagar = max(dif, ZERO) if dif > 0 else ZERO
    diferencia_devolver = max(-dif, ZERO) if dif < 0 else ZERO

    # Sección E: fila 32 viene de fila 26 o 30 (rectificada); 36 = 32 - 33 - 34 + 35
    base_e = (
        impuesto_pagar if entrada.impuesto_declaracion_rectificada == 0 else diferencia_pagar
    )
    total_pagar = (
        base_e
        - entrada.bonificacion_pronto_pago
        - entrada.impuesto_pagado_dj_ano
        + entrada.recargo_mora
    )
    total_pagar = max(total_pagar, ZERO)

    from src.dto.dj08_dto import ActividadEconomicaRead, TributoRead

    return DJ08Calculado(
        nit=dep.nit or "",
        nombre=" ".join(
            p
            for p in [usuario.nombre, usuario.primer_apellido, usuario.segundo_apellido]
            if p
        ),
        direccion=dep.direccion or "",
        municipio=municipio,
        provincia=provincia,
        codigo_postal=dep.codigo_postal or "",
        telefono=dep.telefono or "",
        email=dep.email or "",
        entrada=entrada,
        actividades=[
            ActividadEconomicaRead.model_validate(a, from_attributes=True)
            for a in actividades
        ],
        total_ingresos=total_ingresos,
        total_gastos=total_gastos,
        total_tributos=total_tributos,
        base_imponible=base_imponible,
        impuesto_escala=impuesto_escala,
        impuesto_pagar=impuesto_pagar,
        total_devolver=total_devolver,
        diferencia_pagar=diferencia_pagar,
        diferencia_devolver=diferencia_devolver,
        total_pagar=total_pagar,
        tributos=[TributoRead.model_validate(t, from_attributes=True) for t in tributos],
        escala=escala,
        escala_total_base=escala_total_base,
        escala_total_importe=impuesto_escala,
    )


async def _generar_codigo(db: AsyncSession, ano_fiscal: int) -> str:
    """Código correlativo por año: DJ08-2025-0001."""
    stmt = select(DeclaracionJurada.codigo).where(
        DeclaracionJurada.ano_fiscal == ano_fiscal
    )
    codigos = (await db.exec(stmt)).all()
    max_seq = 0
    prefijo = f"DJ08-{ano_fiscal}-"
    for c in codigos:
        if c and c.startswith(prefijo):
            try:
                max_seq = max(max_seq, int(c[len(prefijo):]))
            except ValueError:
                continue
    return f"{prefijo}{max_seq + 1:04d}"


async def guardar_declaracion(
    db: AsyncSession, id_usuario: int, entrada: DJ08Input
) -> DeclaracionJurada:
    """Calcula y persiste la declaración con snapshot de actividades/tributos."""
    datos = await construir_datos(db, id_usuario, entrada)
    usuario = await db.get(Usuario, id_usuario)

    dj = DeclaracionJurada(
        codigo=await _generar_codigo(db, entrada.ano_fiscal),
        id_usuario=id_usuario,
        id_dependencia=usuario.id_dependencia if usuario else None,
        estado="BORRADOR",
        # Cabecera snapshot
        nit=datos.nit,
        nombre=datos.nombre,
        direccion=datos.direccion,
        municipio=datos.municipio,
        provincia=datos.provincia,
        codigo_postal=datos.codigo_postal,
        telefono=datos.telefono,
        email=datos.email,
        # Formulario
        ano_fiscal=entrada.ano_fiscal,
        opera_en_municipio=entrada.opera_en_municipio,
        municipio_donde_opera=entrada.municipio_donde_opera,
        codigo_tributo=entrada.codigo_tributo,
        codigo_banco=entrada.codigo_banco,
        minimo_exento=entrada.minimo_exento,
        contribucion_restauracion=entrada.contribucion_restauracion,
        pagos_arrendamiento=entrada.pagos_arrendamiento,
        importe_exonerado_reparaciones=entrada.importe_exonerado_reparaciones,
        otros_descuentos=entrada.otros_descuentos,
        bonificacion_mfp=entrada.bonificacion_mfp,
        cuotas_mensuales=entrada.cuotas_mensuales,
        otros_pagos_anticipados=entrada.otros_pagos_anticipados,
        total_retenciones=entrada.total_retenciones,
        bonificaciones_autorizadas=entrada.bonificaciones_autorizadas,
        impuesto_declaracion_rectificada=entrada.impuesto_declaracion_rectificada,
        pago_declaracion_anterior=entrada.pago_declaracion_anterior,
        bonificacion_pronto_pago=entrada.bonificacion_pronto_pago,
        impuesto_pagado_dj_ano=entrada.impuesto_pagado_dj_ano,
        recargo_mora=entrada.recargo_mora,
        fecha_declaracion=entrada.fecha_declaracion,
        observaciones=entrada.observaciones,
        # Resultados calculados
        total_ingresos=datos.total_ingresos,
        total_gastos=datos.total_gastos,
        total_tributos=datos.total_tributos,
        base_imponible=datos.base_imponible,
        impuesto_escala=datos.impuesto_escala,
        impuesto_pagar=datos.impuesto_pagar,
        total_devolver=datos.total_devolver,
        diferencia_pagar=datos.diferencia_pagar,
        diferencia_devolver=datos.diferencia_devolver,
        total_pagar=datos.total_pagar,
    )
    db.add(dj)
    await db.flush()  # asigna dj.id_declaracion

    for a in datos.actividades:
        db.add(
            DeclaracionActividad(
                id_declaracion=dj.id_declaracion,
                codigo=a.codigo,
                nombre=a.nombre,
                fecha_inicio=a.fecha_inicio,
                fecha_fin=a.fecha_fin,
                ingresos=a.ingresos,
                gastos=a.gastos,
                orden=a.orden,
            )
        )
    for t in datos.tributos:
        db.add(
            DeclaracionTributo(
                id_declaracion=dj.id_declaracion,
                nombre=t.nombre,
                importe=t.importe,
            )
        )
    await db.commit()
    await db.refresh(dj)
    return dj


async def construir_datos_desde_declaracion(
    db: AsyncSession, declaracion: DeclaracionJurada
) -> DJ08Calculado:
    """Reconstruye el modelo calculado desde el snapshot guardado.

    La escala se recalcula (es determinista a partir de base_imponible);
    todo lo demás sale de las columnas guardadas.
    """
    acts = (
        await db.exec(
            select(DeclaracionActividad)
            .where(DeclaracionActividad.id_declaracion == declaracion.id_declaracion)
            .order_by(DeclaracionActividad.orden)
        )
    ).all()
    tribs = (
        await db.exec(
            select(DeclaracionTributo).where(
                DeclaracionTributo.id_declaracion == declaracion.id_declaracion
            )
        )
    ).all()

    entrada = DJ08Input(
        ano_fiscal=declaracion.ano_fiscal,
        opera_en_municipio=declaracion.opera_en_municipio,
        municipio_donde_opera=declaracion.municipio_donde_opera,
        codigo_tributo=declaracion.codigo_tributo,
        codigo_banco=declaracion.codigo_banco,
        minimo_exento=declaracion.minimo_exento,
        contribucion_restauracion=declaracion.contribucion_restauracion,
        pagos_arrendamiento=declaracion.pagos_arrendamiento,
        importe_exonerado_reparaciones=declaracion.importe_exonerado_reparaciones,
        otros_descuentos=declaracion.otros_descuentos,
        bonificacion_mfp=declaracion.bonificacion_mfp,
        cuotas_mensuales=declaracion.cuotas_mensuales,
        otros_pagos_anticipados=declaracion.otros_pagos_anticipados,
        total_retenciones=declaracion.total_retenciones,
        bonificaciones_autorizadas=declaracion.bonificaciones_autorizadas,
        impuesto_declaracion_rectificada=declaracion.impuesto_declaracion_rectificada,
        pago_declaracion_anterior=declaracion.pago_declaracion_anterior,
        bonificacion_pronto_pago=declaracion.bonificacion_pronto_pago,
        impuesto_pagado_dj_ano=declaracion.impuesto_pagado_dj_ano,
        recargo_mora=declaracion.recargo_mora,
        fecha_declaracion=declaracion.fecha_declaracion,
        observaciones=declaracion.observaciones,
    )

    escala, escala_total_base, impuesto_escala = calcular_escala(
        declaracion.base_imponible
    )

    # Los snapshots no tienen id_actividad/id_tributo: se construyen a mano
    from src.dto.dj08_dto import ActividadEconomicaRead, TributoRead

    actividades_read = [
        ActividadEconomicaRead(
            id_actividad=i,
            codigo=a.codigo,
            nombre=a.nombre,
            fecha_inicio=a.fecha_inicio,
            fecha_fin=a.fecha_fin,
            ingresos=a.ingresos,
            gastos=a.gastos,
            orden=a.orden,
        )
        for i, a in enumerate(acts)
    ]
    tributos_read = [
        TributoRead(id_tributo=i, nombre=t.nombre, importe=t.importe)
        for i, t in enumerate(tribs)
    ]

    return DJ08Calculado(
        nit=declaracion.nit or "",
        nombre=declaracion.nombre or "",
        direccion=declaracion.direccion or "",
        municipio=declaracion.municipio or "",
        provincia=declaracion.provincia or "",
        codigo_postal=declaracion.codigo_postal or "",
        telefono=declaracion.telefono or "",
        email=declaracion.email or "",
        entrada=entrada,
        actividades=actividades_read,
        total_ingresos=declaracion.total_ingresos,
        total_gastos=declaracion.total_gastos,
        total_tributos=declaracion.total_tributos,
        base_imponible=declaracion.base_imponible,
        impuesto_escala=declaracion.impuesto_escala,
        impuesto_pagar=declaracion.impuesto_pagar,
        total_devolver=declaracion.total_devolver,
        diferencia_pagar=declaracion.diferencia_pagar,
        diferencia_devolver=declaracion.diferencia_devolver,
        total_pagar=declaracion.total_pagar,
        tributos=tributos_read,
        escala=escala,
        escala_total_base=escala_total_base,
        escala_total_importe=impuesto_escala,
    )

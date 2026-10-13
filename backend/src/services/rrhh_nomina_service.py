"""Servicio del submódulo RRHH — Nómina y pagos (Fase 6).

La nómina es el punto donde convergen todo lo anterior: el salario del
empleado, las horas extras derivadas de la asistencia y las deducciones y
bonificaciones registradas en la Fase 5. Al generarla se **congela** todo en
los importes de `nomina` y en las tablas puente (`nomina_deducciones` /
`nomina_bonificaciones`, con `monto_aplicado`), de modo que un cambio futuro
del salario o de un tipo no altere una nómina ya emitida.

Ciclo de vida (decidido):

    pendiente ──pagar──▶ pagada ──anular──▶ anulada
        └──────────────anular──────────────▶ anulada

- `pagar` exige el neto exacto y deja la nómina **inmutable** en sus importes.
- `anular` es la única vía de salida de `pagada`; si la nómina ya estaba
  pagada, deja rastro en la tabla `log`.
- No hay edición de importes: para corregir algo se anula y se vuelve a
  generar.

Regla de solvencia: las deducciones se **cotan al bruto** en la generación, de
manera que el salario neto nunca es negativo (un préstamo grande no puede dejar
al empleado con la nómina en negativo).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_asistencia_calc import calcular_horas_extras
from src.domain.rrhh_nomina_calc import (
    cota_deducciones,
    monto_aplicado,
    monto_horas_extras,
    neto as calcular_neto,
    tarifa_hora,
)
from src.dto import (
    RrhhNominaGenerar,
    RrhhNominaGenerada,
    RrhhNominaListado,
    RrhhNominaDetalle,
    RrhhDetalleNomina,
    RrhhPagoRead,
    RrhhCostoDepartamento,
    RrhhReporteCosto,
)
from src.models import (
    RrhhNomina,
    RrhhNominaDeduccion,
    RrhhNominaBonificacion,
    RrhhPago,
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhDeduccion,
    RrhhBonificacion,
    RrhhTipoDeduccion,
    RrhhTipoBonificacion,
    RrhhTipoPago,
    RrhhAsistencia,
    LogEntry,
)

CERO = Decimal("0.00")


class RrhhNominaService:
    """Generación, pago y anulación de nóminas, más su recibo y costo."""

    # ── Resolución en lote ─────────────────────────────────────────────────

    async def _empleados_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(ids)))
        return {e.id: e for e in res.all()}

    async def _departamentos_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(
            select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                RrhhDepartamento.id_departamento.in_(ids)
            )
        )
        return {row[0]: row[1] for row in res.all()}

    @staticmethod
    def _nombre_completo(empleado) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    async def _resolucion_listado(self, db: AsyncSession, filas: List) -> dict:
        """Carga empleados, departamentos y totales de pago en lote."""
        empleados = await self._empleados_por_id(db, {f.empleado_id for f in filas})
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )

        nomina_ids = [f.id for f in filas]
        pagos_por_nomina: dict[int, tuple] = {}
        if nomina_ids:
            res = await db.exec(
                select(
                    RrhhPago.nomina_id,
                    func.count().label("cantidad"),
                    func.coalesce(func.sum(RrhhPago.monto), 0).label("total"),
                )
                .where(RrhhPago.nomina_id.in_(nomina_ids))
                .group_by(RrhhPago.nomina_id)
            )
            pagos_por_nomina = {row[0]: (row[1], row[2]) for row in res.all()}

        return {
            "empleados": empleados,
            "departamentos": departamentos,
            "pagos": pagos_por_nomina,
        }

    def _construir_listado(self, fila, resolucion: dict) -> RrhhNominaListado:
        empleado = resolucion["empleados"].get(fila.empleado_id)
        cantidad, total = resolucion["pagos"].get(fila.id, (0, CERO))
        return RrhhNominaListado(
            id=fila.id,
            empleado_id=fila.empleado_id,
            periodo=fila.periodo,
            inicio_periodo=fila.inicio_periodo,
            fin_periodo=fila.fin_periodo,
            salario_base=fila.salario_base,
            horas_extras=fila.horas_extras,
            deducciones=fila.deducciones,
            bonificaciones=fila.bonificaciones,
            salario_neto=fila.salario_neto,
            estado=fila.estado,
            empleado_codigo=empleado.codigo_empleado if empleado else None,
            empleado_nombre=self._nombre_completo(empleado),
            departamento_nombre=(
                resolucion["departamentos"].get(empleado.departamento_id)
                if empleado and empleado.departamento_id
                else None
            ),
            total_pagado=Decimal(str(total)),
            cantidad_pagos=int(cantidad),
            created_at=fila.created_at,
            updated_at=fila.updated_at,
        )

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        empleado_id: Optional[int] = None,
        estado: Optional[str] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[RrhhNominaListado]:
        statement = select(RrhhNomina)
        if empleado_id is not None:
            statement = statement.where(RrhhNomina.empleado_id == empleado_id)
        if estado:
            statement = statement.where(RrhhNomina.estado == estado)
        if desde is not None:
            statement = statement.where(RrhhNomina.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhNomina.inicio_periodo <= hasta)

        statement = statement.order_by(
            RrhhNomina.periodo.desc(), RrhhNomina.id
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []
        resolucion = await self._resolucion_listado(db, filas)
        return [self._construir_listado(f, resolucion) for f in filas]

    async def get(self, db: AsyncSession, id: int) -> RrhhNominaDetalle:
        fila = await db.get(RrhhNomina, id)
        if not fila:
            raise HTTPException(status_code=404, detail="Nómina no encontrada")

        resolucion = await self._resolucion_listado(db, [fila])
        base = self._construir_listado(fila, resolucion)

        deducciones = await self._detalle_movimientos(
            db, RrhhNominaDeduccion, RrhhNominaDeduccion.deduccion_id, id, "deduccion"
        )
        bonificaciones = await self._detalle_movimientos(
            db,
            RrhhNominaBonificacion,
            RrhhNominaBonificacion.bonificacion_id,
            id,
            "bonificacion",
        )
        pagos = await self._pagos_de(db, id)

        return RrhhNominaDetalle(
            **base.model_dump(),
            deducciones_aplicadas=deducciones,
            bonificaciones_aplicadas=bonificaciones,
            pagos=pagos,
        )

    async def _detalle_movimientos(
        self, db: AsyncSession, modelo_puente, campo_puente, nomina_id: int, clase: str
    ) -> List[RrhhDetalleNomina]:
        """Detalle congelado de deducciones/bonificaciones de una nómina."""
        res = await db.exec(
            select(modelo_puente).where(modelo_puente.nomina_id == nomina_id)
        )
        puentes = list(res.all())
        if not puentes:
            return []

        if clase == "deduccion":
            ids = {p.deduccion_id for p in puentes}
            res = await db.exec(select(RrhhDeduccion).where(RrhhDeduccion.id_deducciones.in_(ids)))
            movimientos = {m.id_deducciones: m for m in res.all()}
            tipo_ids = {m.tipo_deducciones_id for m in movimientos.values()}
            res = await db.exec(
                select(RrhhTipoDeduccion).where(RrhhTipoDeduccion.id_tipos_deducciones.in_(tipo_ids))
            )
            tipos = {t.id_tipos_deducciones: t for t in res.all()}
            campo_tipo = "tipo_deducciones_id"
        else:
            ids = {p.bonificacion_id for p in puentes}
            res = await db.exec(
                select(RrhhBonificacion).where(RrhhBonificacion.id_bonificaciones.in_(ids))
            )
            movimientos = {m.id_bonificaciones: m for m in res.all()}
            tipo_ids = {m.tipo_bonificaciones_id for m in movimientos.values()}
            res = await db.exec(
                select(RrhhTipoBonificacion).where(
                    RrhhTipoBonificacion.id_tipos_bonificaciones.in_(tipo_ids)
                )
            )
            tipos = {t.id_tipos_bonificaciones: t for t in res.all()}
            campo_tipo = "tipo_bonificaciones_id"

        salida = []
        for p in puentes:
            clave = p.deduccion_id if clase == "deduccion" else p.bonificacion_id
            movimiento = movimientos.get(clave)
            tipo = tipos.get(getattr(movimiento, campo_tipo)) if movimiento else None
            salida.append(
                RrhhDetalleNomina(
                    tipo_nombre=tipo.nombre if tipo else None,
                    es_porcentaje=bool(tipo.es_porcentaje) if tipo else False,
                    valor_original=movimiento.valor if movimiento else None,
                    monto_aplicado=p.monto_aplicado,
                )
            )
        return salida

    async def _pagos_de(self, db: AsyncSession, nomina_id: int) -> List[RrhhPagoRead]:
        res = await db.exec(
            select(RrhhPago).where(RrhhPago.nomina_id == nomina_id).order_by(RrhhPago.id)
        )
        pagos = list(res.all())
        if not pagos:
            return []
        tipos = await self._tipos_pago(db, {p.metodo_id for p in pagos})
        return [
            RrhhPagoRead(
                id=p.id,
                nomina_id=p.nomina_id,
                metodo_id=p.metodo_id,
                monto=p.monto,
                fecha_pago=p.fecha_pago,
                referencia=p.referencia,
                observaciones=p.observaciones,
                metodo_nombre=tipos.get(p.metodo_id),
                created_at=p.created_at,
            )
            for p in pagos
        ]

    async def _tipos_pago(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(select(RrhhTipoPago).where(RrhhTipoPago.id_tipo_pago.in_(ids)))
        return {t.id_tipo_pago: t.nombre for t in res.all()}

    # ── Generación ──────────────────────────────────────────────────────────

    async def generar(self, db: AsyncSession, entrada: RrhhNominaGenerar) -> RrhhNominaGenerada:
        """Genera las nóminas de un periodo, individual o masivamente."""
        empleados = await self._empleados_a_generar(db, entrada)
        if not empleados:
            return RrhhNominaGenerada(creadas=0, omitidas=0, detalle=["No hay empleados activos que cumplan los criterios."])

        periodo = entrada.periodo or entrada.fin_periodo
        extras = await self._extras_por_empleado(db, empleados, entrada)
        movimientos = await self._movimientos_por_empleado(db, empleados, entrada)

        creadas, omitidas, detalle = 0, 0, []
        for empleado in empleados:
            ya_existe = await self._nomina_existente(
                db, empleado.id, entrada.inicio_periodo, entrada.fin_periodo
            )
            if ya_existe:
                omitidas += 1
                detalle.append(f"{self._nombre_completo(empleado)}: ya tiene nómina para ese periodo.")
                continue

            nomina = await self._construir_y_persistir(
                db, empleado, periodo, entrada, extras.get(empleado.id, 0), movimientos.get(empleado.id, ([], []))
            )
            creadas += 1
            detalle.append(f"{self._nombre_completo(empleado)}: nómina #{nomina.id} por {nomina.salario_neto}.")

        return RrhhNominaGenerada(creadas=creadas, omitidas=omitidas, detalle=detalle)

    async def _empleados_a_generar(self, db: AsyncSession, entrada: RrhhNominaGenerar) -> List:
        statement = select(RrhhEmpleado).where(RrhhEmpleado.activo == True)  # noqa: E712
        if entrada.empleado_id is not None:
            statement = statement.where(RrhhEmpleado.id == entrada.empleado_id)
        if entrada.departamento_id is not None:
            statement = statement.where(RrhhEmpleado.departamento_id == entrada.departamento_id)
        statement = statement.order_by(RrhhEmpleado.id)
        result = await db.exec(statement)
        return list(result.all())

    async def _nomina_existente(
        self, db: AsyncSession, empleado_id: int, inicio: date, fin: date
    ) -> Optional[RrhhNomina]:
        result = await db.exec(
            select(RrhhNomina).where(
                RrhhNomina.empleado_id == empleado_id,
                RrhhNomina.inicio_periodo == inicio,
                RrhhNomina.fin_periodo == fin,
            )
        )
        return result.first()

    async def _extras_por_empleado(
        self, db: AsyncSession, empleados: List, entrada: RrhhNominaGenerar
    ) -> dict:
        """Minutos extras del periodo por empleado, con su tarifa aplicada."""
        ids = {e.id for e in empleados}
        por_empleado = {e.id: e for e in empleados}
        res = await db.exec(
            select(RrhhAsistencia).where(
                RrhhAsistencia.empleado_id.in_(ids),
                RrhhAsistencia.fecha >= entrada.inicio_periodo,
                RrhhAsistencia.fecha <= entrada.fin_periodo,
            )
        )
        acumulado: dict[int, int] = {}
        for marcacion in res.all():
            empleado = por_empleado.get(marcacion.empleado_id)
            pactadas = empleado.horas_a_trabajar if empleado else None
            extra = calcular_horas_extras(
                marcacion.hora_entrada, marcacion.hora_salida, pactadas
            )
            if extra:
                acumulado[marcacion.empleado_id] = acumulado.get(marcacion.empleado_id, 0) + extra

        montos: dict[int, Decimal] = {}
        for empleado in empleados:
            tarifa = tarifa_hora(
                empleado.salario, empleado.horas_a_trabajar, empleado.dias_a_trabajar
            )
            montos[empleado.id] = monto_horas_extras(acumulado.get(empleado.id, 0), tarifa)
        return montos

    async def _movimientos_por_empleado(
        self, db: AsyncSession, empleados: List, entrada: RrhhNominaGenerar
    ) -> dict:
        """Deducciones y bonificaciones que cubren el periodo, por empleado."""
        salida: dict[int, tuple] = {}
        for empleado in empleados:
            res_d = await db.exec(
                select(RrhhDeduccion).where(
                    RrhhDeduccion.empleados_id == empleado.id,
                    RrhhDeduccion.fin_periodo >= entrada.inicio_periodo,
                    RrhhDeduccion.inicio_periodo <= entrada.fin_periodo,
                )
            )
            deducciones = list(res_d.all())
            res_b = await db.exec(
                select(RrhhBonificacion).where(
                    RrhhBonificacion.empleados_id == empleado.id,
                    RrhhBonificacion.fin_periodo >= entrada.inicio_periodo,
                    RrhhBonificacion.inicio_periodo <= entrada.fin_periodo,
                )
            )
            bonificaciones = list(res_b.all())

            monto_d = await self._montos_movimientos(db, deducciones, "deduccion", empleado)
            monto_b = await self._montos_movimientos(db, bonificaciones, "bonificacion", empleado)
            salida[empleado.id] = (deducciones, bonificaciones, monto_d, monto_b)
        return salida

    async def _montos_movimientos(
        self, db: AsyncSession, movimientos: List, clase: str, empleado
    ) -> dict:
        """Monto efectivo de cada movimiento, con su tipo resuelto en lote."""
        if not movimientos:
            return {}
        if clase == "deduccion":
            tipo_ids = {m.tipo_deducciones_id for m in movimientos}
            res = await db.exec(
                select(RrhhTipoDeduccion).where(RrhhTipoDeduccion.id_tipos_deducciones.in_(tipo_ids))
            )
            tipos = {t.id_tipos_deducciones: t for t in res.all()}
            campo_tipo = "tipo_deducciones_id"
        else:
            tipo_ids = {m.tipo_bonificaciones_id for m in movimientos}
            res = await db.exec(
                select(RrhhTipoBonificacion).where(
                    RrhhTipoBonificacion.id_tipos_bonificaciones.in_(tipo_ids)
                )
            )
            tipos = {t.id_tipos_bonificaciones: t for t in res.all()}
            campo_tipo = "tipo_bonificaciones_id"

        montos = {}
        for m in movimientos:
            tipo = tipos.get(getattr(m, campo_tipo))
            es_porcentaje = bool(tipo.es_porcentaje) if tipo else False
            montos[id(m)] = monto_aplicado(m.valor, es_porcentaje, empleado.salario)
        return montos

    async def _construir_y_persistir(
        self,
        db: AsyncSession,
        empleado,
        periodo: date,
        entrada: RrhhNominaGenerar,
        extras: Decimal,
        movimientos: tuple,
    ) -> RrhhNomina:
        deducciones, bonificaciones, monto_d, monto_b = movimientos

        salario_base = empleado.salario if empleado.salario is not None else CERO
        salario_base = Decimal(salario_base)
        total_bonificaciones = sum(monto_b.values(), CERO)
        bruto = salario_base + extras + total_bonificaciones

        # Cota las deducciones al bruto para que el neto no baje de 0.
        montos_d = [monto_d[id(m)] for m in deducciones] if deducciones else []
        montos_cotados = cota_deducciones(montos_d, bruto)
        total_deducciones = sum(montos_cotados, CERO)
        neto = calcular_neto(bruto, total_deducciones)

        nomina = RrhhNomina(
            empleado_id=empleado.id,
            periodo=periodo,
            inicio_periodo=entrada.inicio_periodo,
            fin_periodo=entrada.fin_periodo,
            salario_base=salario_base,
            horas_extras=extras,
            deducciones=total_deducciones,
            bonificaciones=total_bonificaciones,
            salario_neto=neto,
            estado="pendiente",
        )
        db.add(nomina)
        await db.flush()

        for movimiento, monto_cotado in zip(deducciones, montos_cotados):
            db.add(
                RrhhNominaDeduccion(
                    nomina_id=nomina.id,
                    deduccion_id=movimiento.id_deducciones,
                    monto_aplicado=monto_cotado,
                )
            )
        for movimiento in bonificaciones:
            db.add(
                RrhhNominaBonificacion(
                    nomina_id=nomina.id,
                    bonificacion_id=movimiento.id_bonificaciones,
                    monto_aplicado=monto_b[id(movimiento)],
                )
            )
        await db.commit()
        await db.refresh(nomina)
        return nomina

    # ── Pagos ───────────────────────────────────────────────────────────────

    async def pagar(
        self,
        db: AsyncSession,
        nomina_id: int,
        metodo_id: int,
        monto: Decimal,
        fecha_pago: Optional[date] = None,
        referencia: Optional[str] = None,
        observaciones: Optional[str] = None,
    ) -> RrhhNominaDetalle:
        """Registra el pago completo de una nómina y la marca como pagada."""
        nomina = await db.get(RrhhNomina, nomina_id)
        if not nomina:
            raise HTTPException(status_code=404, detail="Nómina no encontrada")
        if nomina.estado == "anulada":
            raise HTTPException(status_code=409, detail="No se puede pagar una nómina anulada")
        if nomina.estado == "pagada":
            raise HTTPException(status_code=409, detail="La nómina ya está pagada")

        metodo = await db.get(RrhhTipoPago, metodo_id)
        if not metodo:
            raise HTTPException(status_code=404, detail="El método de pago no existe")

        esperado = nomina.salario_neto or CERO
        if Decimal(monto) != esperado:
            raise HTTPException(
                status_code=400,
                detail=f"El monto debe coincidir con el salario neto ({esperado})",
            )

        db.add(
            RrhhPago(
                nomina_id=nomina.id,
                fecha_pago=fecha_pago or date.today(),
                monto=Decimal(monto),
                metodo_id=metodo_id,
                referencia=referencia,
                observaciones=observaciones,
            )
        )
        nomina.estado = "pagada"
        nomina.updated_at = datetime.now()
        db.add(nomina)
        await db.commit()
        return await self.get(db, nomina_id)

    # ── Anulación ───────────────────────────────────────────────────────────

    async def anular(
        self, db: AsyncSession, nomina_id: int, usuario_nombre: Optional[str] = None
    ) -> dict:
        """Anula una nómina (pendiente o pagada), auditando si ya se pagó."""
        nomina = await db.get(RrhhNomina, nomina_id)
        if not nomina:
            raise HTTPException(status_code=404, detail="Nómina no encontrada")
        if nomina.estado == "anulada":
            raise HTTPException(status_code=409, detail="La nómina ya está anulada")

        era_pagada = nomina.estado == "pagada"
        if era_pagada:
            db.add(
                LogEntry(
                    nivel="WARNING",
                    tipo="NOMINA",
                    mensaje=f"Nómina #{nomina.id} anulada tras haber sido pagada",
                    detalle=(
                        f"empleado_id={nomina.empleado_id}; neto={nomina.salario_neto}; "
                        f"periodo={nomina.inicio_periodo} a {nomina.fin_periodo}"
                    ),
                    usuario_nombre=usuario_nombre,
                    status_code=200,
                )
            )

        nomina.estado = "anulada"
        nomina.updated_at = datetime.now()
        db.add(nomina)
        await db.commit()
        return {
            "accion": "anulada",
            "era_pagada": era_pagada,
            "motivo": (
                "Nómina anulada tras haber sido pagada; queda registrada en la auditoría."
                if era_pagada
                else None
            ),
        }

    # ── Reporte de costo ────────────────────────────────────────────────────

    async def reporte_costo(
        self,
        db: AsyncSession,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        departamento_id: Optional[int] = None,
    ) -> RrhhReporteCosto:
        """Costo de la nómina por departamento, excluyendo las anuladas."""
        statement = select(RrhhNomina).where(RrhhNomina.estado != "anulada")
        if desde is not None:
            statement = statement.where(RrhhNomina.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhNomina.inicio_periodo <= hasta)
        if departamento_id is not None:
            statement = statement.join(
                RrhhEmpleado, RrhhNomina.empleado_id == RrhhEmpleado.id
            ).where(RrhhEmpleado.departamento_id == departamento_id)

        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return RrhhReporteCosto(desde=desde, hasta=hasta)

        empleados = await self._empleados_por_id(db, {f.empleado_id for f in filas})
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )

        grupos: dict = {}
        for fila in filas:
            empleado = empleados.get(fila.empleado_id)
            clave = empleado.departamento_id if empleado and empleado.departamento_id else None
            grupo = grupos.setdefault(
                clave,
                {
                    "cantidad": 0,
                    "salario_base": CERO,
                    "horas_extras": CERO,
                    "deducciones": CERO,
                    "bonificaciones": CERO,
                    "neto": CERO,
                },
            )
            grupo["cantidad"] += 1
            grupo["salario_base"] += fila.salario_base or CERO
            grupo["horas_extras"] += fila.horas_extras or CERO
            grupo["deducciones"] += fila.deducciones or CERO
            grupo["bonificaciones"] += fila.bonificaciones or CERO
            grupo["neto"] += fila.salario_neto or CERO

        departamentos_lista = []
        for clave in sorted(grupos, key=lambda k: (k is not None, k or 0)):
            g = grupos[clave]
            departamentos_lista.append(
                RrhhCostoDepartamento(
                    departamento_id=clave,
                    departamento_nombre=departamentos.get(clave, "Sin departamento"),
                    cantidad_empleados=g["cantidad"],
                    salario_base=g["salario_base"],
                    horas_extras=g["horas_extras"],
                    deducciones=g["deducciones"],
                    bonificaciones=g["bonificaciones"],
                    salario_neto=g["neto"],
                )
            )

        return RrhhReporteCosto(
            desde=desde,
            hasta=hasta,
            total_salario_base=sum((g["salario_base"] for g in grupos.values()), CERO),
            total_horas_extras=sum((g["horas_extras"] for g in grupos.values()), CERO),
            total_deducciones=sum((g["deducciones"] for g in grupos.values()), CERO),
            total_bonificaciones=sum((g["bonificaciones"] for g in grupos.values()), CERO),
            total_neto=sum((g["neto"] for g in grupos.values()), CERO),
            cantidad_nominas=len(filas),
            departamentos=departamentos_lista,
        )


rrhh_nomina_service = RrhhNominaService()

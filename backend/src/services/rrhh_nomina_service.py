"""Servicio del submódulo RRHH — Nómina y pagos (Fase 6 v2).

La nómina pasa a ser un **lote**: una cabecera con descripción, periodo
(referencia al catálogo compartido `periodo_evaluaciones`), rango, moneda,
tasa y porcentaje de impuesto, y un detalle por empleado en
`nomina_empleados`. Al guardar la selección se **recalculan y congelan** los
importes de cada empleado:

- `salario_base` + `horas_extras` = horas trabajadas del periodo (extras
  incluidas) × tarifa horaria derivada del salario mensual.
- `bonificaciones` / `deducciones` = suma de los movimientos del empleado que
  solapan el periodo (los porcentuales se convierten sobre el salario).
- `devengado` = A cobrar + bonificaciones.
- `impuesto` = max(0, devengado − salario promedio) × porcentaje del lote.
- `neto_a_cobrar` = devengado − impuesto − deducciones.

Ciclo de vida: `pre_nomina` (editable) → `nomina` (confirmada, de solo
lectura). Una nómina confirmada no se edita ni se elimina. El pago se
registra por empleado una vez confirmada la nómina y se guarda en
`nomina_empleados` (fecha, monto, método y referencia).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_asistencia_calc import (
    calcular_horas_extras,
    calcular_horas_trabajadas,
)
from src.domain.rrhh_nomina_calc import (
    impuesto_sobre_promedio,
    monto_aplicado,
    neto_a_cobrar,
    pago_por_horas,
    redondear,
    tarifa_hora,
)
from src.dto import (
    RrhhNominaCreate,
    RrhhNominaUpdate,
    RrhhNominaListado,
    RrhhNominaDetalle,
    RrhhNominaEmpleadoRead,
    RrhhNominaCandidato,
    RrhhNominaSeleccion,
    RrhhNominaPagosEntrada,
    RrhhPagoListado,
    RrhhCostoDepartamento,
    RrhhReporteCosto,
)
from src.models import (
    RrhhNomina,
    RrhhNominaEmpleado,
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhPuesto,
    RrhhDeduccion,
    RrhhBonificacion,
    RrhhTipoDeduccion,
    RrhhTipoBonificacion,
    RrhhTipoPago,
    RrhhAsistencia,
    RrhhPeriodoEvaluacion,
    RrhhPagoResultado,
    Moneda,
)

CERO = Decimal("0.00")


class RrhhNominaService:
    """Cabecera del lote, selección de empleados, pagos y costo."""

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

    async def _puestos_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(
            select(RrhhPuesto.id_puesto, RrhhPuesto.nombre).where(
                RrhhPuesto.id_puesto.in_(ids)
            )
        )
        return {row[0]: row[1] for row in res.all()}

    async def _monedas_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(select(Moneda).where(Moneda.id_moneda.in_(ids)))
        return {m.id_moneda: m for m in res.all()}

    async def _periodos_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(
            select(
                RrhhPeriodoEvaluacion.id_periodo_evaluacion,
                RrhhPeriodoEvaluacion.nombre,
            ).where(RrhhPeriodoEvaluacion.id_periodo_evaluacion.in_(ids))
        )
        return {row[0]: row[1] for row in res.all()}

    @staticmethod
    def _nombre_completo(empleado) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    async def _resolucion_listado(self, db: AsyncSession, filas: List) -> dict:
        """Carga monedas, periodos, totales de detalle y pagos en lote."""
        monedas = await self._monedas_por_id(db, {f.moneda_id for f in filas})
        periodos = await self._periodos_por_id(
            db, {f.periodo_id for f in filas if f.periodo_id}
        )
        nomina_ids = [f.id for f in filas]

        totales: dict[int, tuple] = {}
        pagos_por_nomina: dict[int, tuple] = {}
        pagos_resultado: dict[int, int] = {}
        if nomina_ids:
            res = await db.exec(
                select(
                    RrhhNominaEmpleado.nomina_id,
                    func.count().label("cantidad"),
                    func.coalesce(func.sum(RrhhNominaEmpleado.devengado), 0),
                    func.coalesce(func.sum(RrhhNominaEmpleado.deducciones), 0),
                    func.coalesce(func.sum(RrhhNominaEmpleado.neto_a_cobrar), 0),
                )
                .where(RrhhNominaEmpleado.nomina_id.in_(nomina_ids))
                .group_by(RrhhNominaEmpleado.nomina_id)
            )
            totales = {
                row[0]: (row[1], row[2], row[3], row[4]) for row in res.all()
            }

            res = await db.exec(
                select(
                    RrhhNominaEmpleado.nomina_id,
                    func.count(RrhhNominaEmpleado.fecha_pago).label("cantidad"),
                    func.coalesce(func.sum(RrhhNominaEmpleado.monto), 0),
                )
                .where(RrhhNominaEmpleado.nomina_id.in_(nomina_ids))
                .group_by(RrhhNominaEmpleado.nomina_id)
            )
            pagos_por_nomina = {row[0]: (row[1], row[2]) for row in res.all()}

            res = await db.exec(
                select(
                    RrhhPagoResultado.nomina_id,
                    RrhhPagoResultado.id_pago_x_resultado,
                ).where(RrhhPagoResultado.nomina_id.in_(nomina_ids))
            )
            pagos_resultado = {row[0]: row[1] for row in res.all()}

        return {
            "monedas": monedas,
            "periodos": periodos,
            "totales": totales,
            "pagos": pagos_por_nomina,
            "pagos_resultado": pagos_resultado,
        }

    def _construir_listado(self, fila, resolucion: dict) -> RrhhNominaListado:
        moneda = resolucion["monedas"].get(fila.moneda_id)
        cantidad, devengado, deducciones, neto = resolucion["totales"].get(
            fila.id, (0, CERO, CERO, CERO)
        )
        cantidad_pagos, total_pagado = resolucion["pagos"].get(fila.id, (0, CERO))
        return RrhhNominaListado(
            id=fila.id,
            descripcion=fila.descripcion,
            periodo_id=fila.periodo_id,
            periodo_nombre=resolucion["periodos"].get(fila.periodo_id),
            inicio_periodo=fila.inicio_periodo,
            fin_periodo=fila.fin_periodo,
            moneda_id=fila.moneda_id,
            tasa=fila.tasa,
            porcentaje_impuesto=fila.porcentaje_impuesto,
            estado=fila.estado,
            moneda_nombre=moneda.nombre if moneda else None,
            moneda_simbolo=moneda.simbolo if moneda else None,
            cantidad_empleados=int(cantidad),
            total_devengado=Decimal(str(devengado)),
            total_deducciones=Decimal(str(deducciones)),
            total_neto=Decimal(str(neto)),
            total_pagado=Decimal(str(total_pagado)),
            cantidad_pagos=int(cantidad_pagos),
            pago_resultado_id=resolucion["pagos_resultado"].get(fila.id),
            created_at=fila.created_at,
            updated_at=fila.updated_at,
        )

    # ── Validaciones ───────────────────────────────────────────────────────

    async def _validar_cabecera(self, db: AsyncSession, datos: dict) -> None:
        inicio = datos.get("inicio_periodo")
        fin = datos.get("fin_periodo")
        if inicio is not None and fin is not None and fin < inicio:
            raise HTTPException(
                status_code=422,
                detail="El fin del periodo debe ser posterior o igual al inicio",
            )
        periodo_id = datos.get("periodo_id")
        if periodo_id is not None and not await db.get(
            RrhhPeriodoEvaluacion, periodo_id
        ):
            raise HTTPException(status_code=404, detail="El periodo no existe")
        moneda_id = datos.get("moneda_id")
        if moneda_id is not None and not await db.get(Moneda, moneda_id):
            raise HTTPException(status_code=404, detail="La moneda no existe")

    async def _buscar_o_404(self, db: AsyncSession, id: int) -> RrhhNomina:
        nomina = await db.get(RrhhNomina, id)
        if not nomina:
            raise HTTPException(status_code=404, detail="Nómina no encontrada")
        return nomina

    @staticmethod
    def _exigir_pre_nomina(nomina: RrhhNomina, accion: str) -> None:
        if nomina.estado != "pre_nomina":
            raise HTTPException(
                status_code=409,
                detail=f"La nómina ya está confirmada; no se puede {accion}",
            )

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[str] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhNominaListado]:
        statement = select(RrhhNomina)
        if estado:
            statement = statement.where(RrhhNomina.estado == estado)
        if desde is not None:
            statement = statement.where(RrhhNomina.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhNomina.inicio_periodo <= hasta)
        if buscar:
            statement = statement.outerjoin(
                RrhhPeriodoEvaluacion,
                RrhhNomina.periodo_id
                == RrhhPeriodoEvaluacion.id_periodo_evaluacion,
            ).where(
                or_(
                    RrhhNomina.descripcion.ilike(f"%{buscar}%"),
                    RrhhPeriodoEvaluacion.nombre.ilike(f"%{buscar}%"),
                )
            )

        statement = (
            statement.order_by(RrhhNomina.inicio_periodo.desc(), RrhhNomina.id.desc())
            .offset(skip)
            .limit(limit)
        )
        filas = list((await db.exec(statement)).all())
        if not filas:
            return []
        resolucion = await self._resolucion_listado(db, filas)
        return [self._construir_listado(f, resolucion) for f in filas]

    async def get(self, db: AsyncSession, id: int) -> RrhhNominaDetalle:
        fila = await self._buscar_o_404(db, id)
        resolucion = await self._resolucion_listado(db, [fila])
        base = self._construir_listado(fila, resolucion)
        empleados = await self._detalle_empleados(db, [fila])
        return RrhhNominaDetalle(
            **base.model_dump(),
            empleados=empleados,
        )

    async def _detalle_empleados(
        self, db: AsyncSession, nominas: List[RrhhNomina]
    ) -> List[RrhhNominaEmpleadoRead]:
        nomina_ids = [n.id for n in nominas]
        res = await db.exec(
            select(RrhhNominaEmpleado)
            .where(RrhhNominaEmpleado.nomina_id.in_(nomina_ids))
            .order_by(RrhhNominaEmpleado.id_nomina_empleado)
        )
        filas = list(res.all())
        if not filas:
            return []

        empleados = await self._empleados_por_id(
            db, {f.empleados_id for f in filas}
        )
        puestos = await self._puestos_por_id(
            db, {e.puesto_id for e in empleados.values() if e.puesto_id}
        )
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )
        metodos = await self._tipos_pago(
            db, {f.metodo_id for f in filas if f.metodo_id}
        )

        salida = []
        for fila in filas:
            empleado = empleados.get(fila.empleados_id)
            salida.append(
                RrhhNominaEmpleadoRead(
                    id_nomina_empleado=fila.id_nomina_empleado,
                    empleado_id=fila.empleados_id,
                    empleado_codigo=(
                        empleado.codigo_empleado if empleado else None
                    ),
                    empleado_nombre=self._nombre_completo(empleado),
                    puesto_nombre=(
                        puestos.get(empleado.puesto_id)
                        if empleado and empleado.puesto_id
                        else None
                    ),
                    departamento_id=(
                        empleado.departamento_id if empleado else None
                    ),
                    departamento_nombre=(
                        departamentos.get(empleado.departamento_id)
                        if empleado and empleado.departamento_id
                        else None
                    ),
                    salario_base=fila.salario_base,
                    horas_extras=fila.horas_extras,
                    deducciones=fila.deducciones,
                    bonificaciones=fila.bonificaciones,
                    salario_neto=fila.salario_neto,
                    devengado=fila.devengado,
                    impuesto=fila.impuesto,
                    neto_a_cobrar=fila.neto_a_cobrar,
                    fecha_pago=fila.fecha_pago,
                    monto=fila.monto,
                    metodo_id=fila.metodo_id,
                    metodo_nombre=(
                        metodos.get(fila.metodo_id) if fila.metodo_id else None
                    ),
                    referencia=fila.referencia,
                )
            )
        return salida

    async def _tipos_pago(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(
            select(RrhhTipoPago).where(RrhhTipoPago.id_tipo_pago.in_(ids))
        )
        return {t.id_tipo_pago: t.nombre for t in res.all()}

    async def listar_pagos(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        nomina_id: Optional[int] = None,
        metodo_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[RrhhPagoListado]:
        """Pagos por empleado de las nóminas confirmadas."""
        statement = (
            select(RrhhNominaEmpleado, RrhhNomina)
            .join(RrhhNomina, RrhhNominaEmpleado.nomina_id == RrhhNomina.id)
            .where(
                RrhhNominaEmpleado.fecha_pago.is_not(None),
                RrhhNominaEmpleado.monto.is_not(None),
            )
        )
        if nomina_id is not None:
            statement = statement.where(RrhhNominaEmpleado.nomina_id == nomina_id)
        if metodo_id is not None:
            statement = statement.where(RrhhNominaEmpleado.metodo_id == metodo_id)
        if desde is not None:
            statement = statement.where(RrhhNominaEmpleado.fecha_pago >= desde)
        if hasta is not None:
            statement = statement.where(RrhhNominaEmpleado.fecha_pago <= hasta)

        statement = (
            statement.order_by(
                RrhhNominaEmpleado.fecha_pago.desc(),
                RrhhNominaEmpleado.id_nomina_empleado.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
        filas = list((await db.exec(statement)).all())
        if not filas:
            return []

        empleados = await self._empleados_por_id(
            db, {f.RrhhNominaEmpleado.empleados_id for f in filas}
        )
        tipos = await self._tipos_pago(
            db, {f.RrhhNominaEmpleado.metodo_id for f in filas}
        )
        periodos = await self._periodos_por_id(
            db, {f.RrhhNomina.periodo_id for f in filas if f.RrhhNomina.periodo_id}
        )

        salida: List[RrhhPagoListado] = []
        for fila in filas:
            detalle = fila.RrhhNominaEmpleado
            nomina = fila.RrhhNomina
            empleado = empleados.get(detalle.empleados_id)
            salida.append(
                RrhhPagoListado(
                    id=detalle.id_nomina_empleado,
                    nomina_id=detalle.nomina_id,
                    nomina_descripcion=nomina.descripcion,
                    empleado_id=detalle.empleados_id,
                    empleado_codigo=(
                        empleado.codigo_empleado if empleado else None
                    ),
                    empleado_nombre=self._nombre_completo(empleado),
                    fecha_pago=detalle.fecha_pago,
                    monto=detalle.monto,
                    metodo_id=detalle.metodo_id,
                    metodo_nombre=tipos.get(detalle.metodo_id),
                    referencia=detalle.referencia,
                    periodo_id=nomina.periodo_id,
                    periodo_nombre=periodos.get(nomina.periodo_id),
                    inicio_periodo=nomina.inicio_periodo,
                    fin_periodo=nomina.fin_periodo,
                    estado_nomina=nomina.estado,
                    created_at=detalle.created_at,
                )
            )
        return salida

    # ── Cabecera: alta, edición y borrado ─────────────────────────────────

    async def create(
        self, db: AsyncSession, entrada: RrhhNominaCreate
    ) -> RrhhNominaDetalle:
        datos = entrada.model_dump()
        await self._validar_cabecera(db, datos)
        nomina = RrhhNomina(**datos, estado="pre_nomina")
        db.add(nomina)
        await db.commit()
        await db.refresh(nomina)
        return await self.get(db, nomina.id)

    async def update(
        self, db: AsyncSession, id: int, entrada: RrhhNominaUpdate
    ) -> RrhhNominaDetalle:
        nomina = await self._buscar_o_404(db, id)
        self._exigir_pre_nomina(nomina, "editar")

        datos = {
            campo: valor
            for campo, valor in entrada.model_dump(exclude_unset=True).items()
            if valor is not None
        }
        inicio = datos.get("inicio_periodo", nomina.inicio_periodo)
        fin = datos.get("fin_periodo", nomina.fin_periodo)
        await self._validar_cabecera(
            db,
            {**datos, "inicio_periodo": inicio, "fin_periodo": fin},
        )

        for campo, valor in datos.items():
            setattr(nomina, campo, valor)
        nomina.updated_at = datetime.now()
        db.add(nomina)
        await db.flush()

        # Si cambió el periodo o el porcentaje, los importes del detalle
        # quedarían viejos: se recalculan con los datos nuevos.
        if {"inicio_periodo", "fin_periodo", "porcentaje_impuesto"} & set(datos):
            await self._recalcular_detalle(db, nomina)

        await db.commit()
        return await self.get(db, id)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        """Elimina la nómina en cualquier estado.

        El detalle (`nomina_empleados`) cae en cascada. Si la nómina tiene un
        pago por resultado vinculado se rechaza: primero hay que eliminar el
        pago, porque la FK es `RESTRICT` y el lote representa dinero pagado.
        """
        nomina = await self._buscar_o_404(db, id)
        pago = await db.exec(
            select(RrhhPagoResultado).where(RrhhPagoResultado.nomina_id == id)
        )
        if pago.first():
            raise HTTPException(
                status_code=409,
                detail=(
                    "La nómina tiene un pago por resultado; "
                    "elimínalo primero"
                ),
            )
        await db.delete(nomina)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    async def confirmar(self, db: AsyncSession, id: int) -> RrhhNominaDetalle:
        nomina = await self._buscar_o_404(db, id)
        self._exigir_pre_nomina(nomina, "confirmar")
        cantidad = await db.exec(
            select(func.count())
            .select_from(RrhhNominaEmpleado)
            .where(RrhhNominaEmpleado.nomina_id == id)
        )
        if (cantidad.one() or 0) == 0:
            raise HTTPException(
                status_code=400,
                detail="Selecciona al menos un empleado antes de confirmar la nómina",
            )
        nomina.estado = "nomina"
        nomina.updated_at = datetime.now()
        db.add(nomina)
        await db.commit()
        return await self.get(db, id)

    # ── Selección de empleados y cálculos ─────────────────────────────────

    async def _empleados_activos(self, db: AsyncSession) -> List[RrhhEmpleado]:
        res = await db.exec(
            select(RrhhEmpleado)
            .where(RrhhEmpleado.activo == True)  # noqa: E712
            .order_by(RrhhEmpleado.apellido, RrhhEmpleado.nombre)
        )
        return list(res.all())

    async def candidatos(
        self, db: AsyncSession, id: int
    ) -> List[RrhhNominaCandidato]:
        """Todos los empleados activos con sus importes calculados."""
        nomina = await self._buscar_o_404(db, id)
        empleados = await self._empleados_activos(db)
        calculos = await self._calcular_para(db, nomina, empleados)

        res = await db.exec(
            select(RrhhNominaEmpleado).where(
                RrhhNominaEmpleado.nomina_id == id
            )
        )
        seleccionados = {
            fila.empleados_id: fila.id_nomina_empleado for fila in res.all()
        }

        puestos = await self._puestos_por_id(
            db, {e.puesto_id for e in empleados if e.puesto_id}
        )
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados if e.departamento_id}
        )

        salida = []
        for empleado in empleados:
            valores = calculos[empleado.id]
            salida.append(
                RrhhNominaCandidato(
                    id_nomina_empleado=seleccionados.get(empleado.id),
                    seleccionado=empleado.id in seleccionados,
                    empleado_id=empleado.id,
                    empleado_codigo=empleado.codigo_empleado,
                    empleado_nombre=self._nombre_completo(empleado),
                    puesto_nombre=(
                        puestos.get(empleado.puesto_id)
                        if empleado.puesto_id
                        else None
                    ),
                    departamento_id=empleado.departamento_id,
                    departamento_nombre=(
                        departamentos.get(empleado.departamento_id)
                        if empleado.departamento_id
                        else None
                    ),
                    **valores,
                )
            )
        return salida

    async def guardar_empleados(
        self, db: AsyncSession, id: int, entrada: RrhhNominaSeleccion
    ) -> RrhhNominaDetalle:
        """Fija la selección del lote y recalcula los importes congelados."""
        nomina = await self._buscar_o_404(db, id)
        self._exigir_pre_nomina(nomina, "editar la selección de empleados")

        ids = sorted(set(entrada.empleado_ids))
        empleados: List[RrhhEmpleado] = []
        if ids:
            res = await db.exec(
                select(RrhhEmpleado).where(
                    RrhhEmpleado.id.in_(ids),
                    RrhhEmpleado.activo == True,  # noqa: E712
                )
            )
            empleados = list(res.all())
            encontrados = {e.id for e in empleados}
            faltantes = [i for i in ids if i not in encontrados]
            if faltantes:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "Empleados inexistentes o inactivos: "
                        f"{', '.join(str(i) for i in faltantes)}"
                    ),
                )

        calculos = await self._calcular_para(db, nomina, empleados)

        res = await db.exec(
            select(RrhhNominaEmpleado).where(
                RrhhNominaEmpleado.nomina_id == id
            )
        )
        existentes = {fila.empleados_id: fila for fila in res.all()}

        for empleado in empleados:
            valores = calculos[empleado.id]
            fila = existentes.pop(empleado.id, None)
            if fila is None:
                fila = RrhhNominaEmpleado(
                    nomina_id=id,
                    empleados_id=empleado.id,
                    **valores,
                )
            else:
                for campo, valor in valores.items():
                    setattr(fila, campo, valor)
                fila.updated_at = datetime.now()
            db.add(fila)

        # Los que ya no están seleccionados salen del lote.
        for fila in existentes.values():
            await db.delete(fila)

        await db.commit()
        return await self.get(db, id)

    async def _recalcular_detalle(
        self, db: AsyncSession, nomina: RrhhNomina
    ) -> None:
        """Recalcula los importes de los empleados ya seleccionados."""
        res = await db.exec(
            select(RrhhNominaEmpleado).where(
                RrhhNominaEmpleado.nomina_id == nomina.id
            )
        )
        filas = list(res.all())
        if not filas:
            return
        empleados = await self._empleados_por_id(
            db, {f.empleados_id for f in filas}
        )
        lista = [e for e in empleados.values() if e.activo]
        calculos = await self._calcular_para(db, nomina, lista)
        for fila in filas:
            valores = calculos.get(fila.empleados_id)
            if valores is None:
                continue
            for campo, valor in valores.items():
                setattr(fila, campo, valor)
            fila.updated_at = datetime.now()
            db.add(fila)

    async def _calcular_para(
        self, db: AsyncSession, nomina: RrhhNomina, empleados: List[RrhhEmpleado]
    ) -> dict:
        """Calcula los importes de cada empleado para la cabecera dada."""
        if not empleados:
            return {}
        ids = {e.id for e in empleados}

        # Horas trabajadas y extras del periodo, por empleado.
        minutos_trabajados: dict[int, int] = {}
        minutos_extras: dict[int, int] = {}
        res = await db.exec(
            select(RrhhAsistencia).where(
                RrhhAsistencia.empleado_id.in_(ids),
                RrhhAsistencia.fecha >= nomina.inicio_periodo,
                RrhhAsistencia.fecha <= nomina.fin_periodo,
            )
        )
        por_id = {e.id: e for e in empleados}
        for marcacion in res.all():
            empleado = por_id.get(marcacion.empleado_id)
            if not empleado:
                continue
            trabajados = calcular_horas_trabajadas(
                marcacion.hora_entrada, marcacion.hora_salida
            )
            extras = calcular_horas_extras(
                marcacion.hora_entrada,
                marcacion.hora_salida,
                empleado.horas_a_trabajar,
            )
            minutos_trabajados[empleado.id] = (
                minutos_trabajados.get(empleado.id, 0) + trabajados
            )
            minutos_extras[empleado.id] = (
                minutos_extras.get(empleado.id, 0) + extras
            )

        bonificaciones = await self._sumar_movimientos(
            db, nomina, empleados, "bonificacion"
        )
        deducciones = await self._sumar_movimientos(
            db, nomina, empleados, "deduccion"
        )

        salida = {}
        for empleado in empleados:
            tarifa = tarifa_hora(
                empleado.salario,
                empleado.horas_a_trabajar,
                empleado.dias_a_trabajar,
            )
            base, extras = pago_por_horas(
                minutos_trabajados.get(empleado.id, 0),
                minutos_extras.get(empleado.id, 0),
                tarifa,
            )
            total_bonificaciones = bonificaciones.get(empleado.id, CERO)
            total_deducciones = deducciones.get(empleado.id, CERO)
            devengado = redondear(base + extras + total_bonificaciones)
            impuesto = impuesto_sobre_promedio(
                devengado, nomina.porcentaje_impuesto
            )
            neto = neto_a_cobrar(devengado, impuesto, total_deducciones)
            salida[empleado.id] = {
                "salario_base": base,
                "horas_extras": extras,
                "deducciones": total_deducciones,
                "bonificaciones": total_bonificaciones,
                "salario_neto": neto,
                "devengado": devengado,
                "impuesto": impuesto,
                "neto_a_cobrar": neto,
            }
        return salida

    async def _sumar_movimientos(
        self,
        db: AsyncSession,
        nomina: RrhhNomina,
        empleados: List[RrhhEmpleado],
        clase: str,
    ) -> dict:
        """Suma bonificaciones o deducciones del empleado dentro del periodo."""
        ids = {e.id for e in empleados}
        if clase == "bonificacion":
            statement = select(RrhhBonificacion).where(
                RrhhBonificacion.empleados_id.in_(ids),
                RrhhBonificacion.fin_periodo >= nomina.inicio_periodo,
                RrhhBonificacion.inicio_periodo <= nomina.fin_periodo,
            )
        else:
            statement = select(RrhhDeduccion).where(
                RrhhDeduccion.empleados_id.in_(ids),
                RrhhDeduccion.fin_periodo >= nomina.inicio_periodo,
                RrhhDeduccion.inicio_periodo <= nomina.fin_periodo,
            )
        movimientos = list((await db.exec(statement)).all())
        if not movimientos:
            return {}

        if clase == "bonificacion":
            tipo_ids = {m.tipo_bonificaciones_id for m in movimientos}
            res = await db.exec(
                select(RrhhTipoBonificacion).where(
                    RrhhTipoBonificacion.id_tipos_bonificaciones.in_(tipo_ids)
                )
            )
            tipos = {t.id_tipos_bonificaciones: t for t in res.all()}
            campo_tipo = "tipo_bonificaciones_id"
        else:
            tipo_ids = {m.tipo_deducciones_id for m in movimientos}
            res = await db.exec(
                select(RrhhTipoDeduccion).where(
                    RrhhTipoDeduccion.id_tipos_deducciones.in_(tipo_ids)
                )
            )
            tipos = {t.id_tipos_deducciones: t for t in res.all()}
            campo_tipo = "tipo_deducciones_id"

        por_empleado = {e.id: e for e in empleados}
        acumulado: dict[int, Decimal] = {}
        for movimiento in movimientos:
            empleado = por_empleado.get(movimiento.empleados_id)
            if not empleado:
                continue
            tipo = tipos.get(getattr(movimiento, campo_tipo))
            monto = monto_aplicado(
                movimiento.valor,
                bool(tipo.es_porcentaje) if tipo else False,
                empleado.salario,
            )
            acumulado[empleado.id] = (
                acumulado.get(empleado.id, CERO) + monto
            )
        return acumulado

    # ── Pagos ───────────────────────────────────────────────────────────────

    async def guardar_pagos(
        self,
        db: AsyncSession,
        nomina_id: int,
        entrada: RrhhNominaPagosEntrada,
    ) -> RrhhNominaDetalle:
        """Guarda (o corrige) el pago de cada empleado del lote confirmado.

        Cada fila enviada se interpreta así:

        - Sin `fecha_pago` ni `metodo_id`: se borra el pago (queda pendiente).
        - Con ambos: se guarda el monto (obligatorio y mayor que cero), la
          referencia y la fecha (hoy si no se indicó).
        - Con solo uno de los dos: se devuelve `422`.

        El monto es libre (puede ser distinto del neto) y se puede corregir
        volviendo a enviar la fila.
        """
        nomina = await self._buscar_o_404(db, nomina_id)
        if nomina.estado != "nomina":
            raise HTTPException(
                status_code=409,
                detail="Confirma la nómina antes de registrar los pagos",
            )

        res = await db.exec(
            select(RrhhNominaEmpleado).where(
                RrhhNominaEmpleado.nomina_id == nomina_id
            )
        )
        por_empleado = {fila.empleados_id: fila for fila in res.all()}

        vistos: set[int] = set()
        metodos_ids = {
            item.metodo_id
            for item in entrada.pagos
            if item.metodo_id is not None
        }
        metodos: set[int] = set()
        if metodos_ids:
            res = await db.exec(
                select(RrhhTipoPago.id_tipo_pago).where(
                    RrhhTipoPago.id_tipo_pago.in_(metodos_ids)
                )
            )
            metodos = set(res.all())

        for item in entrada.pagos:
            if item.empleado_id in vistos:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "El empleado "
                        f"{item.empleado_id} aparece más de una vez en los pagos"
                    ),
                )
            vistos.add(item.empleado_id)

            fila = por_empleado.get(item.empleado_id)
            if not fila:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "El empleado "
                        f"{item.empleado_id} no forma parte de esta nómina"
                    ),
                )

            # Sin fecha ni método se considera que el pago se quita.
            if item.fecha_pago is None and item.metodo_id is None:
                fila.fecha_pago = None
                fila.monto = None
                fila.metodo_id = None
                fila.referencia = None
                fila.updated_at = datetime.now()
                db.add(fila)
                continue

            if item.monto is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Indica el monto pagado al empleado "
                        f"{item.empleado_id}"
                    ),
                )
            if item.metodo_id is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Indica el método de pago del empleado "
                        f"{item.empleado_id}"
                    ),
                )
            if item.metodo_id not in metodos:
                raise HTTPException(
                    status_code=404, detail="El método de pago no existe"
                )

            fila.fecha_pago = item.fecha_pago or date.today()
            fila.monto = Decimal(item.monto)
            fila.metodo_id = item.metodo_id
            fila.referencia = (item.referencia or "").strip() or None
            fila.updated_at = datetime.now()
            db.add(fila)

        nomina.updated_at = datetime.now()
        db.add(nomina)
        await db.commit()
        return await self.get(db, nomina_id)

    # ── Reporte de costo ────────────────────────────────────────────────────

    async def reporte_costo(
        self,
        db: AsyncSession,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        departamento_id: Optional[int] = None,
    ) -> RrhhReporteCosto:
        """Costo por departamento de las nóminas confirmadas del rango."""
        statement = (
            select(RrhhNominaEmpleado, RrhhNomina)
            .join(RrhhNomina, RrhhNominaEmpleado.nomina_id == RrhhNomina.id)
            .where(RrhhNomina.estado == "nomina")
        )
        if desde is not None:
            statement = statement.where(RrhhNomina.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhNomina.inicio_periodo <= hasta)

        filas = list((await db.exec(statement)).all())
        if not filas:
            return RrhhReporteCosto(desde=desde, hasta=hasta)

        empleados = await self._empleados_por_id(
            db, {f.RrhhNominaEmpleado.empleados_id for f in filas}
        )
        if departamento_id is not None:
            filas = [
                f
                for f in filas
                if empleados.get(f.RrhhNominaEmpleado.empleados_id)
                and empleados[f.RrhhNominaEmpleado.empleados_id].departamento_id
                == departamento_id
            ]
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )

        grupos: dict = {}
        nominas_vistas = set()
        for fila in filas:
            detalle = fila.RrhhNominaEmpleado
            nomina = fila.RrhhNomina
            nominas_vistas.add(nomina.id)
            empleado = empleados.get(detalle.empleados_id)
            clave = (
                empleado.departamento_id
                if empleado and empleado.departamento_id
                else None
            )
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
            grupo["salario_base"] += detalle.salario_base or CERO
            grupo["horas_extras"] += detalle.horas_extras or CERO
            grupo["deducciones"] += detalle.deducciones or CERO
            grupo["bonificaciones"] += detalle.bonificaciones or CERO
            grupo["neto"] += detalle.neto_a_cobrar or CERO

        departamentos_lista = []
        for clave in sorted(grupos, key=lambda k: (k is not None, k or 0)):
            g = grupos[clave]
            departamentos_lista.append(
                RrhhCostoDepartamento(
                    departamento_id=clave,
                    departamento_nombre=departamentos.get(
                        clave, "Sin departamento"
                    ),
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
            total_salario_base=sum(
                (g["salario_base"] for g in grupos.values()), CERO
            ),
            total_horas_extras=sum(
                (g["horas_extras"] for g in grupos.values()), CERO
            ),
            total_deducciones=sum(
                (g["deducciones"] for g in grupos.values()), CERO
            ),
            total_bonificaciones=sum(
                (g["bonificaciones"] for g in grupos.values()), CERO
            ),
            total_neto=sum((g["neto"] for g in grupos.values()), CERO),
            cantidad_nominas=len(nominas_vistas),
            departamentos=departamentos_lista,
        )


rrhh_nomina_service = RrhhNominaService()

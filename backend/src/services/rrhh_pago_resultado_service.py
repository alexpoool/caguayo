"""Servicio del submódulo RRHH — Pago por resultado.

Fórmulas (confirmadas con el usuario):

- `promedio_general` = media de las puntuaciones seleccionadas.
- `coeficiente = puntuacion / promedio_general`.
- `devengado = (coeficiente × monto) / suma_coeficientes_empleados`.
- `impuesto = devengado × porcentaje_impuesto / 100`.
- `neto_a_cobrar = devengado − impuesto`.

Los cálculos se hacen con `Decimal` y se persisten. Cuando cambia la
puntuación de una evaluación, el servicio de evaluaciones llama a
`recalcular_lotes_periodo` para actualizar todos los lotes de ese periodo.
"""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_evaluacion_calc import validar_fechas
from src.dto import (
    RrhhPagoResultadoCreate,
    RrhhPagoResultadoEmpleadoRead,
    RrhhPagoResultadoRead,
    RrhhPagoResultadoListado,
    RrhhPagoResultadoCandidato,
    RrhhPagoResultadoPreview,
)
from src.models import (
    RrhhDepartamento,
    RrhhEmpleado,
    RrhhEvaluacion,
    RrhhNomina,
    RrhhPagoResultado,
    RrhhPagoResultadoEmpleado,
    RrhhPeriodoEvaluacion,
)

CERO = Decimal("0.00")
CUATRO_DECIMALES = Decimal("0.0001")
DOS_DECIMALES = Decimal("0.01")


def _q4(valor: Decimal) -> Decimal:
    return Decimal(valor).quantize(CUATRO_DECIMALES, rounding=ROUND_HALF_UP)


def _q2(valor: Decimal) -> Decimal:
    return Decimal(valor).quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)


def _nombre_completo(empleado: Optional[RrhhEmpleado]) -> Optional[str]:
    if not empleado:
        return None
    return f"{empleado.nombre} {empleado.apellido}".strip()


class RrhhPagoResultadoService:
    """Alta, consulta y recálculo de lotes de pago por resultado."""

    # ── Resolución de candidatos ───────────────────────────────────────────

    async def _periodo_pagado(self, db: AsyncSession, periodo_id: int) -> bool:
        """`True` si el periodo ya tiene un lote de pago por resultado."""
        res = await db.exec(
            select(RrhhPagoResultado.id_pago_x_resultado)
            .where(RrhhPagoResultado.periodo_evaluacion_id == periodo_id)
            .limit(1)
        )
        return res.first() is not None

    async def _nomina_pagada(self, db: AsyncSession, nomina_id: int) -> bool:
        """`True` si la nómina ya tiene un lote de pago por resultado."""
        res = await db.exec(
            select(RrhhPagoResultado.id_pago_x_resultado)
            .where(RrhhPagoResultado.nomina_id == nomina_id)
            .limit(1)
        )
        return res.first() is not None

    async def _nomina_o_404(
        self, db: AsyncSession, nomina_id: int
    ) -> RrhhNomina:
        nomina = await db.get(RrhhNomina, nomina_id)
        if not nomina:
            raise HTTPException(status_code=404, detail="La nómina no existe")
        if nomina.estado != "nomina":
            raise HTTPException(
                status_code=400,
                detail="Solo las nóminas confirmadas pueden generar un pago por resultado",
            )
        return nomina

    async def _periodo_o_404(
        self, db: AsyncSession, periodo_id: int, exigir_activo: bool = True
    ) -> RrhhPeriodoEvaluacion:
        periodo = await db.get(RrhhPeriodoEvaluacion, periodo_id)
        if not periodo:
            raise HTTPException(
                status_code=404, detail="El periodo de evaluación no existe"
            )
        if exigir_activo and not periodo.activo:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"El periodo «{periodo.nombre}» está inactivo; "
                    "reactívalo en Catálogos para usarlo"
                ),
            )
        return periodo

    async def _candidatos(
        self, db: AsyncSession, periodo_id: int
    ) -> tuple[RrhhPeriodoEvaluacion, List[dict]]:
        """Empleados con evaluación en el periodo, uno por empleado.

        Si un empleado tiene varias evaluaciones en el mismo periodo se toma
        la más reciente (`fecha` y luego `id`). `puntuacion` puede ser 0
        cuando la evaluación todavía no tiene filas puntuadas.
        """
        periodo = await self._periodo_o_404(db, periodo_id)

        res = await db.exec(
            select(RrhhEvaluacion)
            .where(RrhhEvaluacion.periodo_evaluacion_id == periodo_id)
            .order_by(RrhhEvaluacion.fecha.desc(), RrhhEvaluacion.id.desc())
        )
        evaluaciones_por_empleado: Dict[int, RrhhEvaluacion] = {}
        for evaluacion in res.all():
            evaluaciones_por_empleado.setdefault(evaluacion.empleado_id, evaluacion)

        if not evaluaciones_por_empleado:
            return periodo, []

        empleados_res = await db.exec(
            select(RrhhEmpleado).where(
                RrhhEmpleado.id.in_(evaluaciones_por_empleado.keys())
            )
        )
        empleados = {e.id: e for e in empleados_res.all()}

        departamento_ids = {
            e.departamento_id for e in empleados.values() if e.departamento_id
        }
        departamentos: Dict[int, str] = {}
        if departamento_ids:
            deptos_res = await db.exec(
                select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                    RrhhDepartamento.id_departamento.in_(departamento_ids)
                )
            )
            departamentos = {row[0]: row[1] for row in deptos_res.all()}

        filas = []
        for empleado_id, evaluacion in evaluaciones_por_empleado.items():
            empleado = empleados.get(empleado_id)
            filas.append(
                {
                    "empleado_id": empleado_id,
                    "evaluacion_id": evaluacion.id,
                    "empleado_codigo": empleado.codigo_empleado if empleado else None,
                    "empleado_nombre": _nombre_completo(empleado),
                    "departamento_nombre": departamentos.get(
                        empleado.departamento_id if empleado else None
                    ),
                    "puntuacion": evaluacion.promedio_objetivos or CERO,
                    "puntuada": evaluacion.promedio_objetivos is not None,
                    "inicio_periodo": evaluacion.inicio_periodo,
                    "fin_periodo": evaluacion.fin_periodo,
                }
            )

        filas.sort(
            key=lambda f: (
                (f["empleado_nombre"] or "").lower(),
                f["empleado_id"],
            )
        )
        return periodo, filas

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def preview(self, db: AsyncSession, periodo_id: int) -> RrhhPagoResultadoPreview:
        periodo, filas = await self._candidatos(db, periodo_id)
        inicio = min((f["inicio_periodo"] for f in filas), default=None)
        fin = max((f["fin_periodo"] for f in filas), default=None)
        return RrhhPagoResultadoPreview(
            periodo_evaluacion_id=periodo.id_periodo_evaluacion,
            periodo_nombre=periodo.nombre,
            inicio_periodo=inicio,
            fin_periodo=fin,
            pagado_x_resultado=await self._periodo_pagado(
                db, periodo.id_periodo_evaluacion
            ),
            empleados=[
                RrhhPagoResultadoCandidato(
                    empleado_id=f["empleado_id"],
                    evaluacion_id=f["evaluacion_id"],
                    empleado_codigo=f["empleado_codigo"],
                    empleado_nombre=f["empleado_nombre"],
                    departamento_nombre=f["departamento_nombre"],
                    puntuacion=f["puntuacion"],
                    puntuada=f["puntuada"],
                )
                for f in filas
            ],
        )

    async def _detalle_read(
        self, db: AsyncSession, lote: RrhhPagoResultado
    ) -> RrhhPagoResultadoRead:
        periodo = await db.get(RrhhPeriodoEvaluacion, lote.periodo_evaluacion_id)
        nomina = await db.get(RrhhNomina, lote.nomina_id) if lote.nomina_id else None

        res = await db.exec(
            select(RrhhPagoResultadoEmpleado)
            .where(RrhhPagoResultadoEmpleado.pago_x_resultado_id == lote.id_pago_x_resultado)
            .order_by(RrhhPagoResultadoEmpleado.id_pago_x_resultado_empleado)
        )
        filas = list(res.all())
        empleados = {}
        if filas:
            emp_res = await db.exec(
                select(RrhhEmpleado).where(
                    RrhhEmpleado.id.in_({f.empleado_id for f in filas})
                )
            )
            empleados = {e.id: e for e in emp_res.all()}
        departamentos: Dict[int, str] = {}
        departamento_ids = {
            e.departamento_id for e in empleados.values() if e.departamento_id
        }
        if departamento_ids:
            deptos_res = await db.exec(
                select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                    RrhhDepartamento.id_departamento.in_(departamento_ids)
                )
            )
            departamentos = {row[0]: row[1] for row in deptos_res.all()}

        return RrhhPagoResultadoRead(
            id_pago_x_resultado=lote.id_pago_x_resultado,
            nomina_id=lote.nomina_id,
            nomina_descripcion=nomina.descripcion if nomina else None,
            periodo_evaluacion_id=lote.periodo_evaluacion_id,
            periodo_nombre=periodo.nombre if periodo else None,
            descripcion=lote.descripcion,
            inicio_periodo=lote.inicio_periodo,
            fin_periodo=lote.fin_periodo,
            monto=lote.monto,
            porcentaje_impuesto=lote.porcentaje_impuesto,
            promedio_general=lote.promedio_general,
            suma_coeficientes_empleados=lote.suma_coeficientes_empleados,
            empleados=[
                RrhhPagoResultadoEmpleadoRead(
                    id_pago_x_resultado_empleado=f.id_pago_x_resultado_empleado,
                    empleado_id=f.empleado_id,
                    evaluacion_id=f.evaluacion_id,
                    empleado_codigo=empleados.get(f.empleado_id).codigo_empleado
                    if empleados.get(f.empleado_id)
                    else None,
                    empleado_nombre=_nombre_completo(empleados.get(f.empleado_id)),
                    departamento_nombre=departamentos.get(
                        empleados.get(f.empleado_id).departamento_id
                        if empleados.get(f.empleado_id)
                        else None
                    ),
                    puntuacion=f.puntuacion,
                    coeficiente=f.coeficiente,
                    devengado=f.devengado,
                    impuesto=f.impuesto,
                    neto_a_cobrar=f.neto_a_cobrar,
                )
                for f in filas
            ],
            created_at=lote.created_at,
            updated_at=lote.updated_at,
        )

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        periodo_evaluacion_id: Optional[int] = None,
        nomina_id: Optional[int] = None,
    ) -> List[RrhhPagoResultadoListado]:
        statement = select(RrhhPagoResultado)
        if periodo_evaluacion_id is not None:
            statement = statement.where(
                RrhhPagoResultado.periodo_evaluacion_id == periodo_evaluacion_id
            )
        if nomina_id is not None:
            statement = statement.where(RrhhPagoResultado.nomina_id == nomina_id)
        statement = (
            statement.order_by(
                RrhhPagoResultado.created_at.desc(),
                RrhhPagoResultado.id_pago_x_resultado.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
        res = await db.exec(statement)
        lotes = list(res.all())
        if not lotes:
            return []

        ids = [lote.id_pago_x_resultado for lote in lotes]
        periodo_ids = {lote.periodo_evaluacion_id for lote in lotes}
        periodos_res = await db.exec(
            select(RrhhPeriodoEvaluacion).where(
                RrhhPeriodoEvaluacion.id_periodo_evaluacion.in_(periodo_ids)
            )
        )
        periodos = {p.id_periodo_evaluacion: p.nombre for p in periodos_res.all()}

        nomina_ids = {lote.nomina_id for lote in lotes if lote.nomina_id}
        nominas: Dict[int, str] = {}
        if nomina_ids:
            nominas_res = await db.exec(
                select(RrhhNomina.id, RrhhNomina.descripcion).where(
                    RrhhNomina.id.in_(nomina_ids)
                )
            )
            nominas = {row[0]: row[1] for row in nominas_res.all()}

        resumen_res = await db.exec(
            select(
                RrhhPagoResultadoEmpleado.pago_x_resultado_id,
                func.count(RrhhPagoResultadoEmpleado.id_pago_x_resultado_empleado),
                func.coalesce(func.sum(RrhhPagoResultadoEmpleado.devengado), 0),
                func.coalesce(func.sum(RrhhPagoResultadoEmpleado.impuesto), 0),
                func.coalesce(
                    func.sum(RrhhPagoResultadoEmpleado.neto_a_cobrar), 0
                ),
            )
            .where(RrhhPagoResultadoEmpleado.pago_x_resultado_id.in_(ids))
            .group_by(RrhhPagoResultadoEmpleado.pago_x_resultado_id)
        )
        resumen = {
            fila[0]: {
                "count": fila[1],
                "total": Decimal(fila[2] or 0),
                "impuesto": Decimal(fila[3] or 0),
                "neto": Decimal(fila[4] or 0),
            }
            for fila in resumen_res.all()
        }

        return [
            RrhhPagoResultadoListado(
                id_pago_x_resultado=lote.id_pago_x_resultado,
                nomina_id=lote.nomina_id,
                nomina_descripcion=nominas.get(lote.nomina_id),
                periodo_evaluacion_id=lote.periodo_evaluacion_id,
                periodo_nombre=periodos.get(lote.periodo_evaluacion_id),
                descripcion=lote.descripcion,
                inicio_periodo=lote.inicio_periodo,
                fin_periodo=lote.fin_periodo,
                monto=lote.monto,
                porcentaje_impuesto=lote.porcentaje_impuesto,
                promedio_general=lote.promedio_general,
                suma_coeficientes_empleados=lote.suma_coeficientes_empleados,
                empleados_count=resumen.get(
                    lote.id_pago_x_resultado, {}
                ).get("count", 0),
                total_pagado=resumen.get(lote.id_pago_x_resultado, {}).get(
                    "total", CERO
                ),
                total_impuesto=resumen.get(
                    lote.id_pago_x_resultado, {}
                ).get("impuesto", CERO),
                total_neto=resumen.get(lote.id_pago_x_resultado, {}).get(
                    "neto", CERO
                ),
                created_at=lote.created_at,
            )
            for lote in lotes
        ]

    async def get(self, db: AsyncSession, id: int) -> RrhhPagoResultadoRead:
        lote = await db.get(RrhhPagoResultado, id)
        if not lote:
            raise HTTPException(status_code=404, detail="Pago por resultado no encontrado")
        return await self._detalle_read(db, lote)

    # ── Cálculo ─────────────────────────────────────────────────────────────

    @staticmethod
    def _calcular_filas(
        filas: List[dict],
        monto: Decimal,
        porcentaje_impuesto: Decimal = CERO,
    ) -> tuple[Decimal, Decimal, List[dict]]:
        """Devuelve (promedio, suma de coeficientes, filas actualizadas).

        Espera dicts con al menos `puntuacion`; conserva el resto de claves.
        Los coeficientes se calculan con el promedio **redondeado a 4
        decimales** y el promedio general también se persiste redondeado.
        El devengado se redondea a 2 decimales antes de calcular el impuesto,
        de modo que `neto = devengado − impuesto` cuadre al centavo.
        """
        if not filas:
            raise HTTPException(
                status_code=400,
                detail="No hay empleados seleccionados para el pago",
            )

        puntuaciones = [Decimal(f["puntuacion"] or 0) for f in filas]
        promedio = _q4(sum(puntuaciones, CERO) / Decimal(len(puntuaciones)))
        if promedio <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Las evaluaciones seleccionadas no tienen puntuación; "
                    "califica al menos una antes de crear el pago"
                ),
            )

        for fila, puntuacion in zip(filas, puntuaciones):
            fila["puntuacion"] = puntuacion
            fila["coeficiente"] = _q4(puntuacion / promedio)

        suma_coeficientes = _q4(
            sum((f["coeficiente"] for f in filas), Decimal("0.0000"))
        )
        if suma_coeficientes <= 0:
            raise HTTPException(
                status_code=400,
                detail="La suma de coeficientes es cero; no se puede repartir el monto",
            )

        porcentaje = Decimal(porcentaje_impuesto or 0)
        for fila in filas:
            devengado = _q2(
                (fila["coeficiente"] * Decimal(monto)) / suma_coeficientes
            )
            impuesto = _q2(devengado * porcentaje / Decimal("100"))
            fila["devengado"] = devengado
            fila["impuesto"] = impuesto
            fila["neto_a_cobrar"] = _q2(devengado - impuesto)

        return promedio, suma_coeficientes, filas

    async def crear(
        self, db: AsyncSession, obj_in: RrhhPagoResultadoCreate
    ) -> RrhhPagoResultadoRead:
        error = validar_fechas(obj_in.inicio_periodo, obj_in.fin_periodo)
        if error:
            raise HTTPException(status_code=400, detail=error)
        if obj_in.monto <= 0:
            raise HTTPException(status_code=400, detail="El monto debe ser mayor que cero")
        if not obj_in.empleado_ids:
            raise HTTPException(
                status_code=400, detail="Selecciona al menos un empleado para el pago"
            )

        # La nómina debe existir, estar confirmada y no haber sido pagada.
        await self._nomina_o_404(db, obj_in.nomina_id)
        if await self._nomina_pagada(db, obj_in.nomina_id):
            raise HTTPException(
                status_code=409,
                detail="Ya existe un pago por resultado para esta nómina",
            )

        # Un periodo solo puede pagarse una vez por resultado. La restricción
        # UNIQUE de BD protege ante dos altas concurrentes; esta comprobación
        # devuelve un mensaje legible en el caso normal.
        periodo = await self._periodo_o_404(db, obj_in.periodo_evaluacion_id)
        if await self._periodo_pagado(db, periodo.id_periodo_evaluacion):
            raise HTTPException(
                status_code=409,
                detail="Ya existe un pago por resultado para este periodo",
            )

        periodo, candidatos = await self._candidatos(
            db, obj_in.periodo_evaluacion_id
        )
        candidatos_por_empleado = {c["empleado_id"]: c for c in candidatos}
        ids = list(dict.fromkeys(obj_in.empleado_ids))
        no_encontrados = [i for i in ids if i not in candidatos_por_empleado]
        if no_encontrados:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Hay empleados seleccionados sin evaluación en el periodo: "
                    + ", ".join(str(i) for i in no_encontrados)
                ),
            )

        seleccionados = [candidatos_por_empleado[i] for i in ids]
        promedio, suma_coeficientes, seleccionados = self._calcular_filas(
            seleccionados, obj_in.monto, obj_in.porcentaje_impuesto
        )

        lote = RrhhPagoResultado(
            nomina_id=obj_in.nomina_id,
            periodo_evaluacion_id=periodo.id_periodo_evaluacion,
            descripcion=(obj_in.descripcion or "").strip() or None,
            inicio_periodo=obj_in.inicio_periodo,
            fin_periodo=obj_in.fin_periodo,
            monto=obj_in.monto,
            porcentaje_impuesto=obj_in.porcentaje_impuesto,
            promedio_general=promedio,
            suma_coeficientes_empleados=suma_coeficientes,
        )
        db.add(lote)
        await db.flush()

        for fila in seleccionados:
            db.add(
                RrhhPagoResultadoEmpleado(
                    pago_x_resultado_id=lote.id_pago_x_resultado,
                    empleado_id=fila["empleado_id"],
                    evaluacion_id=fila["evaluacion_id"],
                    puntuacion=fila["puntuacion"],
                    coeficiente=fila["coeficiente"],
                    devengado=fila["devengado"],
                    impuesto=fila["impuesto"],
                    neto_a_cobrar=fila["neto_a_cobrar"],
                )
            )

        await db.commit()
        await db.refresh(lote)
        return await self._detalle_read(db, lote)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        lote = await db.get(RrhhPagoResultado, id)
        if not lote:
            raise HTTPException(status_code=404, detail="Pago por resultado no encontrado")
        await db.delete(lote)
        await db.commit()
        return {"mensaje": "Pago por resultado eliminado", "id": id}

    # ── Recálculo ───────────────────────────────────────────────────────────

    async def recalcular_lote(
        self, db: AsyncSession, lote: RrhhPagoResultado
    ) -> None:
        """Recalcula un lote a partir de sus evaluaciones y de la selección
        original de empleados (no añade empleados nuevos)."""
        res = await db.exec(
            select(RrhhPagoResultadoEmpleado).where(
                RrhhPagoResultadoEmpleado.pago_x_resultado_id
                == lote.id_pago_x_resultado
            )
        )
        filas = list(res.all())
        if not filas:
            lote.promedio_general = Decimal("0.0000")
            lote.suma_coeficientes_empleados = Decimal("0.0000")
            lote.updated_at = datetime.now()
            db.add(lote)
            return

        evaluaciones = {}
        eval_res = await db.exec(
            select(RrhhEvaluacion).where(
                RrhhEvaluacion.id.in_({f.evaluacion_id for f in filas})
            )
        )
        evaluaciones = {e.id: e for e in eval_res.all()}

        vigentes = []
        for fila in filas:
            evaluacion = evaluaciones.get(fila.evaluacion_id)
            if (
                not evaluacion
                or evaluacion.periodo_evaluacion_id != lote.periodo_evaluacion_id
            ):
                await db.delete(fila)
                continue
            vigentes.append(
                {
                    "fila": fila,
                    "puntuacion": evaluacion.promedio_objetivos or CERO,
                }
            )

        if not vigentes:
            lote.promedio_general = Decimal("0.0000")
            lote.suma_coeficientes_empleados = Decimal("0.0000")
            lote.updated_at = datetime.now()
            db.add(lote)
            return

        try:
            promedio, suma_coeficientes, calculadas = self._calcular_filas(
                vigentes, lote.monto, lote.porcentaje_impuesto
            )
        except HTTPException:
            # Sin puntuaciones: conservar el lote pero con importes a cero.
            promedio = Decimal("0.0000")
            suma_coeficientes = Decimal("0.0000")
            calculadas = [
                {
                    **fila,
                    "puntuacion": CERO,
                    "coeficiente": CERO,
                    "devengado": CERO,
                    "impuesto": CERO,
                    "neto_a_cobrar": CERO,
                }
                for fila in vigentes
            ]

        for calculada in calculadas:
            fila = calculada["fila"]
            fila.puntuacion = calculada["puntuacion"]
            fila.coeficiente = calculada["coeficiente"]
            fila.devengado = calculada["devengado"]
            fila.impuesto = calculada["impuesto"]
            fila.neto_a_cobrar = calculada["neto_a_cobrar"]
            fila.updated_at = datetime.now()
            db.add(fila)

        lote.promedio_general = promedio
        lote.suma_coeficientes_empleados = suma_coeficientes
        lote.updated_at = datetime.now()
        db.add(lote)


async def recalcular_lotes_periodo(db: AsyncSession, periodo_id: int) -> None:
    """Recalcula todos los lotes de un periodo (llamado al puntuar)."""
    res = await db.exec(
        select(RrhhPagoResultado).where(
            RrhhPagoResultado.periodo_evaluacion_id == periodo_id
        )
    )
    for lote in res.all():
        await rrhh_pago_resultado_service.recalcular_lote(db, lote)


rrhh_pago_resultado_service = RrhhPagoResultadoService()

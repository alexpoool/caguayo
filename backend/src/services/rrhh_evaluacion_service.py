"""Servicio del submódulo RRHH — Evaluaciones, objetivos y metas (Fase 8).

Reglas de negocio de esta fase:

- **Ciclo**: `borrador → finalizada`. Solo se **edita** (evaluación, criterios,
  objetivos y metas) mientras está en `borrador`; al finalizar se congela.
- **Única por (empleado, periodo, tipo)**: no se puede tener dos evaluaciones
  iguales para el mismo periodo; el alta devuelve `409`.
- **Criterios**: los 4 campos (`puntualidad`, `productividad`,
  `trabajo_equipo`, `calidad`) son FK a `calificaciones`; el servicio exige que
  cada id exista y resuelve su `valor` (1–5) para calcular el promedio **al
  leer** (no está persistido).
- **`promedio_objetivos`** (0–100) **sí se persiste** y se **recalcula** en
  cada cambio de objetivo o meta, y al finalizar. Ignora los campos sin
  valoración.
- **Objetivos y metas anidados**: `metas` cuelgan de `objetivos`, que cuelgan
  de `evaluaciones` (ambas FK `CASCADE`).
- **Sin autenticación en backend** (decisión del módulo; deuda Fase 10): el
  `evaluador_id` viene en el payload.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_evaluacion_calc import (
    CRITERIOS,
    CRITERIOS_ETIQUETA,
    ESTADOS_EVALUACION,
    TIPOS_EVALUACION,
    escala_a_100,
    puede_editar,
    promedio_criterios,
    promedio_objetivos,
    redondear,
    validar_fechas,
)
from src.dto import (
    RrhhEvaluacionCreate,
    RrhhEvaluacionUpdate,
    RrhhEvaluacionListado,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionReporte,
    RrhhEvaluacionEmpleadoReporte,
    RrhhCriterioEvaluacion,
    RrhhObjetivoCreate,
    RrhhObjetivoUpdate,
    RrhhObjetivoRead,
    RrhhMetaCreate,
    RrhhMetaUpdate,
    RrhhMetaRead,
)
from src.models import (
    RrhhEvaluacion,
    RrhhObjetivo,
    RrhhMeta,
    RrhhCalificacion,
    RrhhEmpleado,
    RrhhDepartamento,
)

CERO = Decimal("0.00")


class RrhhEvaluacionService:
    model_name = "Evaluación"

    # ── Resolución en lote ──────────────────────────────────────────────────

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

    async def _calificaciones_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(
            select(RrhhCalificacion).where(RrhhCalificacion.id_calificaciones.in_(ids))
        )
        return {c.id_calificaciones: c for c in res.all()}

    @staticmethod
    def _nombre_completo(empleado: Optional[RrhhEmpleado]) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    # ── Validaciones ────────────────────────────────────────────────────────

    async def _verificar_empleado(
        self, db: AsyncSession, empleado_id: int, solo_activo: bool = True
    ) -> RrhhEmpleado:
        empleado = await db.get(RrhhEmpleado, empleado_id)
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado no existe")
        if solo_activo and not empleado.activo:
            raise HTTPException(
                status_code=400,
                detail="El empleado está inactivo; no se le puede evaluar",
            )
        return empleado

    async def _validar_empleados_del_evaluador(
        self, db: AsyncSession, evaluador_id: Optional[int]
    ) -> None:
        if evaluador_id is None:
            return
        await self._verificar_empleado(db, evaluador_id, solo_activo=False)

    async def _validar_criterios(self, db: AsyncSession, campos: dict) -> None:
        """Exige que cada criterio enviado apunte a una `calificaciones` real."""
        ids = [v for v in campos.values() if v is not None]
        if not ids:
            return
        existentes = await self._calificaciones_por_id(db, set(ids))
        for nombre, valor in campos.items():
            if valor is not None and valor not in existentes:
                raise HTTPException(
                    status_code=404,
                    detail=f"La calificación del criterio «{nombre}» ({valor}) no existe",
                )

    def _validar_rango(self, inicio: date, fin: date) -> None:
        error = validar_fechas(inicio, fin)
        if error:
            raise HTTPException(status_code=400, detail=error)

    async def _buscar_o_404(self, db: AsyncSession, id: int) -> RrhhEvaluacion:
        evaluacion = await db.get(RrhhEvaluacion, id)
        if not evaluacion:
            raise HTTPException(
                status_code=404, detail=f"{self.model_name} no encontrada"
            )
        return evaluacion

    def _exigir_borrador(self, evaluacion: RrhhEvaluacion, accion: str) -> None:
        if not puede_editar(evaluacion.estado):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"La evaluación está «{evaluacion.estado}»; solo se puede "
                    f"{accion} mientras esté en borrador"
                ),
            )

    async def _exigir_unica(
        self,
        db: AsyncSession,
        empleado_id: int,
        periodo: str,
        tipo: str,
        excluir_id: Optional[int] = None,
    ) -> None:
        statement = select(RrhhEvaluacion).where(
            RrhhEvaluacion.empleado_id == empleado_id,
            RrhhEvaluacion.periodo == periodo,
            RrhhEvaluacion.tipo_evaluacion == tipo,
        )
        if excluir_id is not None:
            statement = statement.where(RrhhEvaluacion.id != excluir_id)
        result = await db.exec(statement)
        if result.first():
            raise HTTPException(
                status_code=409,
                detail=(
                    f"El empleado ya tiene una evaluación «{tipo}» para el "
                    f"periodo «{periodo}»"
                ),
            )

    # ── Cálculos ────────────────────────────────────────────────────────────

    def _criterios_resueltos(
        self, evaluacion: RrhhEvaluacion, calificaciones: dict
    ) -> List[RrhhCriterioEvaluacion]:
        """Los 4 criterios con su `calificaciones.valor` (0 si sin puntuar)."""
        salida = []
        for clave in CRITERIOS:
            id_calif = getattr(evaluacion, clave)
            calif = calificaciones.get(id_calif) if id_calif else None
            salida.append(
                RrhhCriterioEvaluacion(
                    criterio=clave,
                    etiqueta=CRITERIOS_ETIQUETA[clave],
                    valor=calif.valor if calif else 0,
                    calificacion_nombre=calif.nombre if calif else None,
                )
            )
        return salida

    async def _valoraciones_de(
        self, db: AsyncSession, evaluacion_id: int
    ) -> List[Optional[int]]:
        """Valoraciones (1–5) de los objetivos Y de sus metas, en una lista."""
        res = await db.exec(
            select(RrhhObjetivo).where(RrhhObjetivo.evaluacion_id == evaluacion_id)
        )
        objetivos = list(res.all())
        valoraciones: List[Optional[int]] = [o.valoracion for o in objetivos]

        if objetivos:
            ids = [o.id_objetivos for o in objetivos]
            res = await db.exec(select(RrhhMeta).where(RrhhMeta.objetivo_id.in_(ids)))
            valoraciones.extend(m.valoracion for m in res.all())
        return valoraciones

    async def _recalcular_promedio_objetivos(
        self, db: AsyncSession, evaluacion_id: int
    ) -> Optional[Decimal]:
        """Recalcula y persiste `promedio_objetivos` (0–100) de la evaluación."""
        valoraciones = await self._valoraciones_de(db, evaluacion_id)
        promedio = promedio_objetivos(valoraciones)
        res = await db.get(RrhhEvaluacion, evaluacion_id)
        if res:
            res.promedio_objetivos = promedio
            res.updated_at = datetime.now()
            db.add(res)
        return promedio

    def _construir_listado(
        self,
        evaluacion: RrhhEvaluacion,
        resolucion: dict,
        calificaciones: dict,
        conteos: dict,
    ) -> RrhhEvaluacionListado:
        empleado = resolucion["empleados"].get(evaluacion.empleado_id)
        evaluador = (
            resolucion["empleados"].get(evaluacion.evaluador_id)
            if evaluacion.evaluador_id
            else None
        )
        nombre_depto = None
        if empleado and empleado.departamento_id:
            nombre_depto = resolucion["departamentos"].get(empleado.departamento_id)

        valores = [
            (calificaciones.get(getattr(evaluacion, c)).valor
             if getattr(evaluacion, c) and calificaciones.get(getattr(evaluacion, c))
             else None)
            for c in CRITERIOS
        ]
        cantidad_objetivos, cantidad_metas = conteos.get(evaluacion.id, (0, 0))

        return RrhhEvaluacionListado(
            **RrhhEvaluacion.model_validate(
                evaluacion, from_attributes=True
            ).model_dump(),
            empleado_codigo=empleado.codigo_empleado if empleado else None,
            empleado_nombre=self._nombre_completo(empleado),
            departamento_nombre=nombre_depto,
            evaluador_nombre=self._nombre_completo(evaluador),
            promedio_criterios=promedio_criterios(valores),
            cantidad_objetivos=cantidad_objetivos,
            cantidad_metas=cantidad_metas,
        )

    async def _resolucion_listado(
        self, db: AsyncSession, filas: List[RrhhEvaluacion]
    ) -> dict:
        """Empleados, departamentos, calificaciones y conteos, todo en lote."""
        empleado_ids = {f.empleado_id for f in filas} | {
            f.evaluador_id for f in filas if f.evaluador_id
        }
        empleados = await self._empleados_por_id(db, empleado_ids)
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )

        calif_ids = {getattr(f, c) for f in filas for c in CRITERIOS if getattr(f, c)}
        calificaciones = await self._calificaciones_por_id(db, calif_ids)

        # Conteo de objetivos y metas en dos consultas fijas (sin N+1).
        evaluacion_ids = [f.id for f in filas]
        conteos: dict[int, tuple] = {eid: (0, 0) for eid in evaluacion_ids}
        if evaluacion_ids:
            res = await db.exec(
                select(RrhhObjetivo.evaluacion_id, func.count().label("c"))
                .where(RrhhObjetivo.evaluacion_id.in_(evaluacion_ids))
                .group_by(RrhhObjetivo.evaluacion_id)
            )
            obj_por_eval = {row[0]: row[1] for row in res.all()}

            res = await db.exec(
                select(RrhhObjetivo.evaluacion_id, func.count().label("c"))
                .join(RrhhMeta, RrhhMeta.objetivo_id == RrhhObjetivo.id_objetivos)
                .where(RrhhObjetivo.evaluacion_id.in_(evaluacion_ids))
                .group_by(RrhhObjetivo.evaluacion_id)
            )
            metas_por_eval = {row[0]: row[1] for row in res.all()}

            for eid in evaluacion_ids:
                conteos[eid] = (obj_por_eval.get(eid, 0), metas_por_eval.get(eid, 0))

        return {
            "empleados": empleados,
            "departamentos": departamentos,
            "calificaciones": calificaciones,
            "conteos": conteos,
        }

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        empleado_id: Optional[int] = None,
        departamento_id: Optional[int] = None,
        estado: Optional[str] = None,
        tipo: Optional[str] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhEvaluacionListado]:
        if estado is not None and estado not in ESTADOS_EVALUACION:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_EVALUACION)}",
            )
        if tipo is not None and tipo not in TIPOS_EVALUACION:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo inválido. Debe ser uno de: {', '.join(TIPOS_EVALUACION)}",
            )

        statement = select(RrhhEvaluacion)
        if empleado_id is not None:
            statement = statement.where(RrhhEvaluacion.empleado_id == empleado_id)
        if estado is not None:
            statement = statement.where(RrhhEvaluacion.estado == estado)
        if tipo is not None:
            statement = statement.where(RrhhEvaluacion.tipo_evaluacion == tipo)
        # Periodos que se solapan con el rango consultado.
        if desde is not None:
            statement = statement.where(RrhhEvaluacion.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhEvaluacion.inicio_periodo <= hasta)

        if departamento_id is not None or buscar:
            statement = statement.join(
                RrhhEmpleado, RrhhEvaluacion.empleado_id == RrhhEmpleado.id
            )
            if departamento_id is not None:
                statement = statement.where(
                    RrhhEmpleado.departamento_id == departamento_id
                )
            if buscar:
                term = f"%{buscar.strip()}%"
                statement = statement.where(
                    or_(
                        RrhhEmpleado.nombre.ilike(term),
                        RrhhEmpleado.apellido.ilike(term),
                        RrhhEmpleado.codigo_empleado.ilike(term),
                    )
                )

        statement = statement.order_by(
            RrhhEvaluacion.inicio_periodo.desc(), RrhhEvaluacion.id
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_listado(db, filas)
        return [
            self._construir_listado(
                f,
                resolucion,
                resolucion["calificaciones"],
                resolucion["conteos"],
            )
            for f in filas
        ]

    async def get(self, db: AsyncSession, id: int) -> RrhhEvaluacionDetalle:
        evaluacion = await self._buscar_o_404(db, id)
        resolucion = await self._resolucion_listado(db, [evaluacion])
        base = self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["calificaciones"],
            resolucion["conteos"],
        )

        # Objetivos con sus metas anidadas.
        res = await db.exec(
            select(RrhhObjetivo)
            .where(RrhhObjetivo.evaluacion_id == id)
            .order_by(RrhhObjetivo.id_objetivos)
        )
        objetivos = list(res.all())
        metas_por_objetivo: dict[int, list] = {}
        if objetivos:
            res = await db.exec(
                select(RrhhMeta)
                .where(RrhhMeta.objetivo_id.in_([o.id_objetivos for o in objetivos]))
                .order_by(RrhhMeta.id_metas)
            )
            for meta in res.all():
                metas_por_objetivo.setdefault(meta.objetivo_id, []).append(meta)

        objetivos_dto = []
        for objetivo in objetivos:
            metas = [
                RrhhMetaRead.model_validate(m, from_attributes=True)
                for m in metas_por_objetivo.get(objetivo.id_objetivos, [])
            ]
            objetivos_dto.append(
                RrhhObjetivoRead(
                    **RrhhObjetivo.model_validate(
                        objetivo, from_attributes=True
                    ).model_dump(),
                    aporte=escala_a_100(objetivo.valoracion),
                    metas=metas,
                )
            )

        valoraciones = await self._valoraciones_de(db, id)
        puntuadas = [v for v in valoraciones if v is not None]
        prom_1a5 = (
            redondear(sum(Decimal(v) for v in puntuadas) / Decimal(len(puntuadas)))
            if puntuadas
            else None
        )

        return RrhhEvaluacionDetalle(
            **base.model_dump(),
            criterios=self._criterios_resueltos(
                evaluacion, resolucion["calificaciones"]
            ),
            objetivos=objetivos_dto,
            promedio_valoracion_1a5=prom_1a5,
        )

    # ── Escritura de la evaluación ──────────────────────────────────────────

    async def crear(self, db: AsyncSession, obj_in: RrhhEvaluacionCreate) -> RrhhEvaluacionListado:
        await self._verificar_empleado(db, obj_in.empleado_id)
        await self._validar_empleados_del_evaluador(db, obj_in.evaluador_id)
        self._validar_rango(obj_in.inicio_periodo, obj_in.fin_periodo)
        await self._validar_criterios(
            db,
            {
                "puntualidad": obj_in.puntualidad,
                "productividad": obj_in.productividad,
                "trabajo_equipo": obj_in.trabajo_equipo,
                "calidad": obj_in.calidad,
            },
        )
        await self._exigir_unica(
            db, obj_in.empleado_id, obj_in.periodo, obj_in.tipo_evaluacion
        )

        evaluacion = RrhhEvaluacion(
            empleado_id=obj_in.empleado_id,
            evaluador_id=obj_in.evaluador_id,
            periodo=obj_in.periodo,
            tipo_evaluacion=obj_in.tipo_evaluacion,
            estado="borrador",
            inicio_periodo=obj_in.inicio_periodo,
            fin_periodo=obj_in.fin_periodo,
            puntualidad=obj_in.puntualidad,
            productividad=obj_in.productividad,
            trabajo_equipo=obj_in.trabajo_equipo,
            calidad=obj_in.calidad,
            comentarios=obj_in.comentarios,
            fecha=obj_in.fecha or date.today(),
        )
        db.add(evaluacion)
        await db.flush()
        # Sin objetivos todavía: el promedio queda nulo.
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["calificaciones"],
            resolucion["conteos"],
        )

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhEvaluacionUpdate
    ) -> RrhhEvaluacionListado:
        evaluacion = await self._buscar_o_404(db, id)
        self._exigir_borrador(evaluacion, "editar")

        datos = obj_in.model_dump(exclude_unset=True)

        # Los campos de periodo y unicidad se revalidan si cambian.
        if "evaluador_id" in datos:
            await self._validar_empleados_del_evaluador(db, datos["evaluador_id"])
        if "inicio_periodo" in datos or "fin_periodo" in datos:
            inicio = datos.get("inicio_periodo", evaluacion.inicio_periodo)
            fin = datos.get("fin_periodo", evaluacion.fin_periodo)
            self._validar_rango(inicio, fin)
        if "periodo" in datos or "tipo_evaluacion" in datos:
            await self._exigir_unica(
                db,
                evaluacion.empleado_id,
                datos.get("periodo", evaluacion.periodo),
                datos.get("tipo_evaluacion", evaluacion.tipo_evaluacion),
                excluir_id=evaluacion.id,
            )
        if any(k in datos for k in CRITERIOS):
            await self._validar_criterios(
                db,
                {
                    k: datos.get(k, getattr(evaluacion, k)) for k in CRITERIOS
                },
            )

        for campo, valor in datos.items():
            setattr(evaluacion, campo, valor)
        evaluacion.updated_at = datetime.now()
        db.add(evaluacion)
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["calificaciones"],
            resolucion["conteos"],
        )

    async def finalizar(self, db: AsyncSession, id: int) -> RrhhEvaluacionListado:
        """`borrador → finalizada`: congela la evaluación y recalcula."""
        evaluacion = await self._buscar_o_404(db, id)
        if evaluacion.estado == "finalizada":
            raise HTTPException(status_code=409, detail="La evaluación ya está finalizada")

        evaluacion.estado = "finalizada"
        evaluacion.updated_at = datetime.now()
        db.add(evaluacion)
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["calificaciones"],
            resolucion["conteos"],
        )

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        evaluacion = await self._buscar_o_404(db, id)
        self._exigir_borrador(evaluacion, "eliminar")
        await db.delete(evaluacion)
        await db.commit()
        return {"mensaje": f"{self.model_name} eliminada", "id": id}

    # ── Objetivos ───────────────────────────────────────────────────────────

    async def _buscar_objetivo_o_404(
        self, db: AsyncSession, objetivo_id: int
    ) -> RrhhObjetivo:
        objetivo = await db.get(RrhhObjetivo, objetivo_id)
        if not objetivo:
            raise HTTPException(status_code=404, detail="El objetivo no existe")
        return objetivo

    async def _evaluacion_del_objetivo(
        self, db: AsyncSession, objetivo: RrhhObjetivo
    ) -> RrhhEvaluacion:
        evaluacion = await db.get(RrhhEvaluacion, objetivo.evaluacion_id)
        if not evaluacion:
            raise HTTPException(
                status_code=404, detail="La evaluación del objetivo no existe"
            )
        return evaluacion

    async def crear_objetivo(
        self, db: AsyncSession, evaluacion_id: int, obj_in: RrhhObjetivoCreate
    ) -> RrhhObjetivoRead:
        evaluacion = await self._buscar_o_404(db, evaluacion_id)
        self._exigir_borrador(evaluacion, "añadir objetivos")

        objetivo = RrhhObjetivo(evaluacion_id=evaluacion_id, **obj_in.model_dump())
        db.add(objetivo)
        await db.flush()
        await self._recalcular_promedio_objetivos(db, evaluacion_id)
        await db.commit()
        await db.refresh(objetivo)

        return RrhhObjetivoRead(
            **RrhhObjetivo.model_validate(objetivo, from_attributes=True).model_dump(),
            aporte=escala_a_100(objetivo.valoracion),
            metas=[],
        )

    async def update_objetivo(
        self, db: AsyncSession, objetivo_id: int, obj_in: RrhhObjetivoUpdate
    ) -> RrhhObjetivoRead:
        objetivo = await self._buscar_objetivo_o_404(db, objetivo_id)
        evaluacion = await self._evaluacion_del_objetivo(db, objetivo)
        self._exigir_borrador(evaluacion, "editar objetivos")

        for campo, valor in obj_in.model_dump(exclude_unset=True).items():
            setattr(objetivo, campo, valor)
        objetivo.updated_at = datetime.now()
        db.add(objetivo)
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(objetivo)

        # Devuelve con sus metas.
        detalle = await self.get(db, evaluacion.id)
        coincide = next(
            (o for o in detalle.objetivos if o.id_objetivos == objetivo.id_objetivos),
            None,
        )
        return coincide or RrhhObjetivoRead(
            **RrhhObjetivo.model_validate(objetivo, from_attributes=True).model_dump(),
            aporte=escala_a_100(objetivo.valoracion),
            metas=[],
        )

    async def eliminar_objetivo(self, db: AsyncSession, objetivo_id: int) -> dict:
        objetivo = await self._buscar_objetivo_o_404(db, objetivo_id)
        evaluacion = await self._evaluacion_del_objetivo(db, objetivo)
        self._exigir_borrador(evaluacion, "eliminar objetivos")

        await db.delete(objetivo)  # las metas caen por CASCADE
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        return {"mensaje": "Objetivo eliminado", "id": objetivo_id}

    # ── Metas ───────────────────────────────────────────────────────────────

    async def _buscar_meta_o_404(self, db: AsyncSession, meta_id: int) -> RrhhMeta:
        meta = await db.get(RrhhMeta, meta_id)
        if not meta:
            raise HTTPException(status_code=404, detail="La meta no existe")
        return meta

    async def crear_meta(
        self, db: AsyncSession, objetivo_id: int, obj_in: RrhhMetaCreate
    ) -> RrhhMetaRead:
        objetivo = await self._buscar_objetivo_o_404(db, objetivo_id)
        evaluacion = await self._evaluacion_del_objetivo(db, objetivo)
        self._exigir_borrador(evaluacion, "añadir metas")

        meta = RrhhMeta(objetivo_id=objetivo_id, **obj_in.model_dump())
        db.add(meta)
        await db.flush()
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(meta)
        return RrhhMetaRead.model_validate(meta, from_attributes=True)

    async def update_meta(
        self, db: AsyncSession, meta_id: int, obj_in: RrhhMetaUpdate
    ) -> RrhhMetaRead:
        meta = await self._buscar_meta_o_404(db, meta_id)
        objetivo = await self._buscar_objetivo_o_404(db, meta.objetivo_id)
        evaluacion = await self._evaluacion_del_objetivo(db, objetivo)
        self._exigir_borrador(evaluacion, "editar metas")

        for campo, valor in obj_in.model_dump(exclude_unset=True).items():
            setattr(meta, campo, valor)
        meta.updated_at = datetime.now()
        db.add(meta)
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        await db.refresh(meta)
        return RrhhMetaRead.model_validate(meta, from_attributes=True)

    async def eliminar_meta(self, db: AsyncSession, meta_id: int) -> dict:
        meta = await self._buscar_meta_o_404(db, meta_id)
        objetivo = await self._buscar_objetivo_o_404(db, meta.objetivo_id)
        evaluacion = await self._evaluacion_del_objetivo(db, objetivo)
        self._exigir_borrador(evaluacion, "eliminar metas")

        await db.delete(meta)
        await self._recalcular_promedio_objetivos(db, evaluacion.id)
        await db.commit()
        return {"mensaje": "Meta eliminada", "id": meta_id}

    # ── Reporte ─────────────────────────────────────────────────────────────

    async def reporte(
        self,
        db: AsyncSession,
        empleado_id: Optional[int] = None,
        departamento_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> RrhhEvaluacionReporte:
        """Promedios por empleado y globales (excluye nada: ve todos los estados)."""
        statement = select(RrhhEvaluacion)
        if empleado_id is not None:
            statement = statement.where(RrhhEvaluacion.empleado_id == empleado_id)
        if desde is not None:
            statement = statement.where(RrhhEvaluacion.fin_periodo >= desde)
        if hasta is not None:
            statement = statement.where(RrhhEvaluacion.inicio_periodo <= hasta)
        if departamento_id is not None:
            statement = statement.join(
                RrhhEmpleado, RrhhEvaluacion.empleado_id == RrhhEmpleado.id
            ).where(RrhhEmpleado.departamento_id == departamento_id)

        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return RrhhEvaluacionReporte(desde=desde, hasta=hasta)

        resolucion = await self._resolucion_listado(db, filas)

        grupos: dict[int, dict] = {}
        todos_criterios: List[Optional[Decimal]] = []
        todos_objetivos: List[Decimal] = []
        borradores = finalizadas = 0

        for fila in filas:
            listado = self._construir_listado(
                fila,
                resolucion,
                resolucion["calificaciones"],
                resolucion["conteos"],
            )
            if listado.estado == "borrador":
                borradores += 1
            else:
                finalizadas += 1
            if listado.promedio_criterios is not None:
                todos_criterios.append(listado.promedio_criterios)
            if fila.promedio_objetivos is not None:
                todos_objetivos.append(Decimal(fila.promedio_objetivos))

            grupo = grupos.setdefault(
                fila.empleado_id,
                {
                    "listado": listado,
                    "criterios": [],
                    "objetivos": [],
                },
            )
            if listado.promedio_criterios is not None:
                grupo["criterios"].append(listado.promedio_criterios)
            if fila.promedio_objetivos is not None:
                grupo["objetivos"].append(Decimal(fila.promedio_objetivos))

        empleados_reporte = []
        for emp_id in sorted(grupos):
            g = grupos[emp_id]
            listado_emp = g["listado"]
            empleados_reporte.append(
                RrhhEvaluacionEmpleadoReporte(
                    empleado_id=emp_id,
                    empleado_codigo=listado_emp.empleado_codigo,
                    empleado_nombre=listado_emp.empleado_nombre,
                    departamento_nombre=listado_emp.departamento_nombre,
                    cantidad_evaluaciones=len(g["criterios"]) + len(g["objetivos"]),
                    promedio_criterios=promedio_criterios(g["criterios"]),
                    promedio_objetivos=(
                        redondear(
                            sum(g["objetivos"]) / Decimal(len(g["objetivos"]))
                        )
                        if g["objetivos"]
                        else None
                    ),
                )
            )
            # La cantidad real de evaluaciones por empleado (los dos promedios
            # pueden tener longitudes distintas si algún campo es nulo).
            empleados_reporte[-1].cantidad_evaluaciones = sum(
                1 for f in filas if f.empleado_id == emp_id
            )

        return RrhhEvaluacionReporte(
            desde=desde,
            hasta=hasta,
            cantidad_evaluaciones=len(filas),
            cantidad_borradores=borradores,
            cantidad_finalizadas=finalizadas,
            promedio_criterios=promedio_criterios(todos_criterios),
            promedio_objetivos=(
                redondear(sum(todos_objetivos) / Decimal(len(todos_objetivos)))
                if todos_objetivos
                else None
            ),
            empleados=empleados_reporte,
        )


rrhh_evaluacion_service = RrhhEvaluacionService()

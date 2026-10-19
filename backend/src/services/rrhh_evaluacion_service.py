"""Servicio del submódulo RRHH — Evaluaciones y objetivos (Fase 8 v2).

Reglas de negocio de esta fase (rediseño «Evaluaciones v2»):

- **Sin estado**: la evaluación es **editable siempre** (cabecera, selección,
  puntuación y borrado); no hay `borrador/finalizada` ni endpoint *finalizar*.
- **Única por (empleado, periodo, tipo)**: no se puede tener dos evaluaciones
  iguales para el mismo periodo; el alta devuelve `409`.
- **Tipos en catálogo**: `evaluaciones.tipo_evaluacion_id` es FK a
  `tipos_evaluaciones` (sembrado con Formal, Autoevaluación, Parcial y Final);
  el servicio exige que el id exista (404) y esté activo (400), y resuelve su
  `nombre` para las respuestas.
- **Objetivos ponderados**: la evaluación se compone de los objetivos que el
  usuario **selecciona** (`evaluaciones_objetivos`, N:M con `UNIQUE` por
  par). Cada fila guarda el `peso` (copia del objetivo, editable), las
  **estrellas 0–5** (`resultado`), la `valoracion` y las `recomendaciones`
  (textos libres).
- **Alcance**: los objetivos candidatos son los del empleado cuyo
  `periodo_inicio`/`periodo_fin` solape el rango de la evaluación; uno
  seleccionado que luego salga del alcance se muestra igualmente en el
  detalle (todo lo que cuenta en el promedio se ve).
- **`promedio_objetivos`**: **promedio ponderado 0–5**
  (Σ estrellas×peso / Σ pesos de las filas **puntuadas**), persistido en la
  columna homónima y recalculado al seleccionar, puntuar o quitar filas y
  cuando un cambio de objetivo arrastra sus filas.
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
    promedio_ponderado,
    redondear,
    solapa_fechas,
    validar_fechas,
)
from src.dto import (
    RrhhEvaluacionCreate,
    RrhhEvaluacionUpdate,
    RrhhEvaluacionListado,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionObjetivoCalificar,
    RrhhEvaluacionObjetivoRead,
    RrhhEvaluacionObjetivoSeleccion,
    RrhhEvaluacionReporte,
    RrhhEvaluacionEmpleadoReporte,
)
from src.models import (
    RrhhEvaluacion,
    RrhhEvaluacionObjetivo,
    RrhhObjetivo,
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhTipoEvaluacion,
)


# ── Recálculo del promedio (compartido con `rrhh_objetivo_service`) ─────────


async def _recalcular_promedio(db: AsyncSession, evaluacion: RrhhEvaluacion) -> None:
    """`promedio_objetivos` = promedio ponderado de sus filas puntuadas.

    Se recalcula en cada cambio de filas (la evaluación es siempre
    editable); sin filas puntuadas queda `NULL`.
    """
    res = await db.exec(
        select(RrhhEvaluacionObjetivo).where(
            RrhhEvaluacionObjetivo.id_evaluacion == evaluacion.id
        )
    )
    evaluacion.promedio_objetivos = promedio_ponderado(
        [(f.resultado, f.peso) for f in res.all()]
    )
    evaluacion.updated_at = datetime.now()
    db.add(evaluacion)


async def recalcular_promedios_empleado(db: AsyncSession, empleado_id: int) -> None:
    """Recalcula `promedio_objetivos` de **todas** las evaluaciones del empleado.

    El servicio de objetivos la usa cuando un cambio en un objetivo arrastra
    filas del N:M (p. ej. su baja, que las borra por `CASCADE`).
    """
    res = await db.exec(
        select(RrhhEvaluacion).where(RrhhEvaluacion.empleado_id == empleado_id)
    )
    for evaluacion in res.all():
        await _recalcular_promedio(db, evaluacion)


class RrhhEvaluacionService:
    model_name = "Evaluación"

    # ── Resolución en lote ──────────────────────────────────────────────────

    async def _empleados_por_id(self, db: AsyncSession, ids) -> dict:
        if not ids:
            return {}
        res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(ids)))
        return {e.id: e for e in res.all()}

    async def _tipos_por_id(self, db: AsyncSession, ids) -> dict:
        """Nombres del catálogo `tipos_evaluaciones` por id, en lote."""
        if not ids:
            return {}
        res = await db.exec(
            select(RrhhTipoEvaluacion).where(
                RrhhTipoEvaluacion.id_tipos_evaluaciones.in_(ids)
            )
        )
        return {t.id_tipos_evaluaciones: t.nombre for t in res.all()}

    async def _validar_tipo(self, db: AsyncSession, tipo_id: int) -> str:
        """Exige que el tipo exista (404) o esté activo (400); devuelve su nombre."""
        res = await db.exec(
            select(RrhhTipoEvaluacion).where(
                RrhhTipoEvaluacion.id_tipos_evaluaciones == tipo_id
            )
        )
        tipo = res.first()
        if not tipo:
            raise HTTPException(
                status_code=404, detail="El tipo de evaluación no existe"
            )
        if not tipo.activo:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"El tipo de evaluación «{tipo.nombre}» está inactivo; "
                    "reactívalo en Catálogos para usarlo"
                ),
            )
        return tipo.nombre

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

    async def _buscar_fila_o_404(
        self, db: AsyncSession, evaluacion: RrhhEvaluacion, fila_id: int
    ) -> RrhhEvaluacionObjetivo:
        fila = await db.get(RrhhEvaluacionObjetivo, fila_id)
        if not fila or fila.id_evaluacion != evaluacion.id:
            raise HTTPException(
                status_code=404, detail="El objetivo no está en esta evaluación"
            )
        return fila

    async def _exigir_unica(
        self,
        db: AsyncSession,
        empleado_id: int,
        periodo: str,
        tipo_id: int,
        excluir_id: Optional[int] = None,
    ) -> None:
        statement = select(RrhhEvaluacion).where(
            RrhhEvaluacion.empleado_id == empleado_id,
            RrhhEvaluacion.periodo == periodo,
            RrhhEvaluacion.tipo_evaluacion_id == tipo_id,
        )
        if excluir_id is not None:
            statement = statement.where(RrhhEvaluacion.id != excluir_id)
        result = await db.exec(statement)
        if result.first():
            nombres = await self._tipos_por_id(db, {tipo_id})
            raise HTTPException(
                status_code=409,
                detail=(
                    f"El empleado ya tiene una evaluación "
                    f"«{nombres.get(tipo_id, f'#{tipo_id}')}» para el "
                    f"periodo «{periodo}»"
                ),
            )

    # ── Objetivos ───────────────────────────────────────────────────────────

    async def _objetivos_en_alcance(
        self,
        db: AsyncSession,
        empleado_id: int,
        inicio: date,
        fin: date,
    ) -> List[RrhhObjetivo]:
        """Objetivos del empleado cuyo periodo solapa el de la evaluación."""
        res = await db.exec(
            select(RrhhObjetivo)
            .where(RrhhObjetivo.empleado_id == empleado_id)
            .order_by(RrhhObjetivo.id_objetivos)
        )
        return [
            o
            for o in res.all()
            if solapa_fechas(o.periodo_inicio, o.periodo_fin, inicio, fin)
        ]

    @staticmethod
    def _leer_fila(
        fila: RrhhEvaluacionObjetivo, objetivo: Optional[RrhhObjetivo]
    ) -> RrhhEvaluacionObjetivoRead:
        """La fila con los datos del objetivo (para respuestas de escritura)."""
        return RrhhEvaluacionObjetivoRead(
            fila_id=fila.id_evaluaciones_objetivo,
            id_objetivo=fila.id_objetivo,
            nombre=objetivo.nombre if objetivo else "",
            periodo_inicio=(objetivo.periodo_inicio if objetivo else date.min),
            periodo_fin=objetivo.periodo_fin if objetivo else date.min,
            peso_objetivo=objetivo.peso if objetivo else fila.peso,
            seleccionado=True,
            peso=fila.peso,
            resultado=fila.resultado,
            valoracion=fila.valoracion,
            recomendaciones=fila.recomendaciones,
        )

    async def _objetivos_del_detalle(
        self, db: AsyncSession, evaluacion: RrhhEvaluacion
    ) -> List[RrhhEvaluacionObjetivoRead]:
        """Objetivos en alcance con su fila si están seleccionados.

        Un objetivo seleccionado que haya quedado fuera del alcance (p. ej.
        cambiaron sus fechas) se añade al final: todo lo que cuenta en el
        promedio tiene que verse en pantalla.
        """
        en_alcance = await self._objetivos_en_alcance(
            db,
            evaluacion.empleado_id,
            evaluacion.inicio_periodo,
            evaluacion.fin_periodo,
        )
        res = await db.exec(
            select(RrhhEvaluacionObjetivo).where(
                RrhhEvaluacionObjetivo.id_evaluacion == evaluacion.id
            )
        )
        filas = {f.id_objetivo: f for f in res.all()}

        objetivos = {o.id_objetivos: o for o in en_alcance}
        faltantes = set(filas) - set(objetivos)
        if faltantes:
            res_extra = await db.exec(
                select(RrhhObjetivo).where(RrhhObjetivo.id_objetivos.in_(faltantes))
            )
            objetivos.update({o.id_objetivos: o for o in res_extra.all()})

        salida: List[RrhhEvaluacionObjetivoRead] = []
        for objetivo_id in sorted(objetivos):
            objetivo = objetivos[objetivo_id]
            fila = filas.get(objetivo_id)
            salida.append(
                RrhhEvaluacionObjetivoRead(
                    fila_id=fila.id_evaluaciones_objetivo if fila else None,
                    id_objetivo=objetivo_id,
                    nombre=objetivo.nombre,
                    periodo_inicio=objetivo.periodo_inicio,
                    periodo_fin=objetivo.periodo_fin,
                    peso_objetivo=objetivo.peso,
                    seleccionado=fila is not None,
                    peso=fila.peso if fila else objetivo.peso,
                    resultado=fila.resultado if fila else None,
                    valoracion=fila.valoracion if fila else None,
                    recomendaciones=fila.recomendaciones if fila else None,
                )
            )
        return salida

    # ── Listado ─────────────────────────────────────────────────────────────

    def _construir_listado(
        self,
        evaluacion: RrhhEvaluacion,
        resolucion: dict,
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

        en_alcance, seleccionados = resolucion["conteos"].get(evaluacion.id, (0, 0))

        return RrhhEvaluacionListado(
            **RrhhEvaluacion.model_validate(
                evaluacion, from_attributes=True
            ).model_dump(),
            tipo_evaluacion=resolucion["tipos"].get(evaluacion.tipo_evaluacion_id),
            empleado_codigo=empleado.codigo_empleado if empleado else None,
            empleado_nombre=self._nombre_completo(empleado),
            departamento_nombre=nombre_depto,
            evaluador_nombre=self._nombre_completo(evaluador),
            cantidad_objetivos=en_alcance,
            cantidad_seleccionados=seleccionados,
        )

    async def _resolucion_listado(
        self, db: AsyncSession, filas: List[RrhhEvaluacion]
    ) -> dict:
        """Empleados, departamentos, tipos y conteos, todo en lote."""
        empleado_ids = {f.empleado_id for f in filas} | {
            f.evaluador_id for f in filas if f.evaluador_id
        }
        empleados = await self._empleados_por_id(db, empleado_ids)
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )
        tipos = await self._tipos_por_id(db, {f.tipo_evaluacion_id for f in filas})

        # Objetivos en alcance por empleado, en dos consultas fijas (sin N+1).
        objetivos: List[RrhhObjetivo] = []
        eval_empleado_ids = {f.empleado_id for f in filas}
        if eval_empleado_ids:
            res = await db.exec(
                select(RrhhObjetivo).where(
                    RrhhObjetivo.empleado_id.in_(eval_empleado_ids)
                )
            )
            objetivos = list(res.all())

        seleccionados: dict[int, int] = {}
        res = await db.exec(
            select(
                RrhhEvaluacionObjetivo.id_evaluacion,
                func.count().label("c"),
            )
            .where(RrhhEvaluacionObjetivo.id_evaluacion.in_([f.id for f in filas]))
            .group_by(RrhhEvaluacionObjetivo.id_evaluacion)
        )
        seleccionados = {row[0]: row[1] for row in res.all()}

        conteos: dict[int, tuple] = {}
        for f in filas:
            en_alcance = sum(
                1
                for o in objetivos
                if o.empleado_id == f.empleado_id
                and solapa_fechas(
                    o.periodo_inicio, o.periodo_fin, f.inicio_periodo, f.fin_periodo
                )
            )
            conteos[f.id] = (en_alcance, seleccionados.get(f.id, 0))

        return {
            "empleados": empleados,
            "departamentos": departamentos,
            "tipos": tipos,
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
        tipo_evaluacion_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhEvaluacionListado]:
        if tipo_evaluacion_id is not None:
            # Exige que el id exista en el catálogo (paridad con el antiguo
            # filtro `tipo=<texto inválido>` → 400); un tipo inactivo sí filtra.
            res = await db.exec(
                select(RrhhTipoEvaluacion.id_tipos_evaluaciones).where(
                    RrhhTipoEvaluacion.id_tipos_evaluaciones == tipo_evaluacion_id
                )
            )
            if res.first() is None:
                raise HTTPException(
                    status_code=400,
                    detail="El tipo de evaluación solicitado no existe",
                )

        statement = select(RrhhEvaluacion)
        if empleado_id is not None:
            statement = statement.where(RrhhEvaluacion.empleado_id == empleado_id)
        if tipo_evaluacion_id is not None:
            statement = statement.where(
                RrhhEvaluacion.tipo_evaluacion_id == tipo_evaluacion_id
            )
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

        statement = (
            statement.order_by(RrhhEvaluacion.inicio_periodo.desc(), RrhhEvaluacion.id)
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_listado(db, filas)
        return [self._construir_listado(f, resolucion) for f in filas]

    async def get(self, db: AsyncSession, id: int) -> RrhhEvaluacionDetalle:
        evaluacion = await self._buscar_o_404(db, id)
        resolucion = await self._resolucion_listado(db, [evaluacion])
        base = self._construir_listado(evaluacion, resolucion)

        # Objetivos del empleado en alcance, con su fila si están seleccionados.
        objetivos_dto = await self._objetivos_del_detalle(db, evaluacion)

        return RrhhEvaluacionDetalle(
            **base.model_dump(),
            objetivos=objetivos_dto,
        )

    # ── Escritura de la evaluación ──────────────────────────────────────────

    async def crear(
        self, db: AsyncSession, obj_in: RrhhEvaluacionCreate
    ) -> RrhhEvaluacionListado:
        await self._verificar_empleado(db, obj_in.empleado_id)
        await self._validar_empleados_del_evaluador(db, obj_in.evaluador_id)
        self._validar_rango(obj_in.inicio_periodo, obj_in.fin_periodo)
        await self._validar_tipo(db, obj_in.tipo_evaluacion_id)
        await self._exigir_unica(
            db, obj_in.empleado_id, obj_in.periodo, obj_in.tipo_evaluacion_id
        )

        evaluacion = RrhhEvaluacion(
            empleado_id=obj_in.empleado_id,
            evaluador_id=obj_in.evaluador_id,
            periodo=obj_in.periodo,
            tipo_evaluacion_id=obj_in.tipo_evaluacion_id,
            inicio_periodo=obj_in.inicio_periodo,
            fin_periodo=obj_in.fin_periodo,
            comentarios=obj_in.comentarios,
            recomendaciones=obj_in.recomendaciones,
            fecha=obj_in.fecha or date.today(),
        )
        db.add(evaluacion)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(evaluacion, resolucion)

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhEvaluacionUpdate
    ) -> RrhhEvaluacionListado:
        evaluacion = await self._buscar_o_404(db, id)
        datos = obj_in.model_dump(exclude_unset=True)

        # Los campos de periodo y unicidad se revalidan si cambian.
        if "evaluador_id" in datos:
            await self._validar_empleados_del_evaluador(db, datos["evaluador_id"])
        if "inicio_periodo" in datos or "fin_periodo" in datos:
            inicio = datos.get("inicio_periodo", evaluacion.inicio_periodo)
            fin = datos.get("fin_periodo", evaluacion.fin_periodo)
            self._validar_rango(inicio, fin)
        if "periodo" in datos or "tipo_evaluacion_id" in datos:
            if "tipo_evaluacion_id" in datos:
                await self._validar_tipo(db, datos["tipo_evaluacion_id"])
            await self._exigir_unica(
                db,
                evaluacion.empleado_id,
                datos.get("periodo", evaluacion.periodo),
                datos.get("tipo_evaluacion_id", evaluacion.tipo_evaluacion_id),
                excluir_id=evaluacion.id,
            )

        for campo, valor in datos.items():
            setattr(evaluacion, campo, valor)
        evaluacion.updated_at = datetime.now()
        db.add(evaluacion)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(evaluacion, resolucion)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        evaluacion = await self._buscar_o_404(db, id)
        await db.delete(evaluacion)  # las filas del N:M caen por CASCADE
        await db.commit()
        return {"mensaje": f"{self.model_name} eliminada", "id": id}

    # ── Selección y puntuación de objetivos ─────────────────────────────────

    async def seleccionar_objetivos(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        obj_in: RrhhEvaluacionObjetivoSeleccion,
    ) -> RrhhEvaluacionDetalle:
        """Adjunta objetivos al N:M con su peso copiado.

        Todos los ids se validan antes de escribir (todo o nada): deben
        existir (404), pertenecer al empleado evaluado y estar en alcance
        del periodo (400); repetir un objetivo ya seleccionado es 409.
        """
        evaluacion = await self._buscar_o_404(db, evaluacion_id)

        # Sin duplicados dentro del mismo payload (el orden se conserva).
        objetivo_ids = list(dict.fromkeys(obj_in.objetivo_ids))

        res = await db.exec(
            select(RrhhObjetivo).where(RrhhObjetivo.id_objetivos.in_(objetivo_ids))
        )
        objetivos = {o.id_objetivos: o for o in res.all()}

        res = await db.exec(
            select(RrhhEvaluacionObjetivo.id_objetivo).where(
                RrhhEvaluacionObjetivo.id_evaluacion == evaluacion.id
            )
        )
        # select de una sola columna: SQLModel devuelve escalares, no filas.
        ya_seleccionados = set(res.all())

        for objetivo_id in objetivo_ids:
            objetivo = objetivos.get(objetivo_id)
            if objetivo is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"El objetivo #{objetivo_id} no existe",
                )
            if objetivo.empleado_id != evaluacion.empleado_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"El objetivo «{objetivo.nombre}» no pertenece al "
                        "empleado evaluado"
                    ),
                )
            if not solapa_fechas(
                objetivo.periodo_inicio,
                objetivo.periodo_fin,
                evaluacion.inicio_periodo,
                evaluacion.fin_periodo,
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"El objetivo «{objetivo.nombre}» no entra en el "
                        "periodo de la evaluación"
                    ),
                )
            if objetivo_id in ya_seleccionados:
                raise HTTPException(
                    status_code=409,
                    detail=(f"El objetivo «{objetivo.nombre}» ya está seleccionado"),
                )

        for objetivo_id in objetivo_ids:
            db.add(
                RrhhEvaluacionObjetivo(
                    id_evaluacion=evaluacion.id,
                    id_objetivo=objetivo_id,
                    # Copia del peso fijo del objetivo (editable después).
                    peso=objetivos[objetivo_id].peso,
                )
            )
        await db.flush()
        await _recalcular_promedio(db, evaluacion)
        await db.commit()

        return await self.get(db, evaluacion.id)

    async def actualizar_fila(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        fila_id: int,
        obj_in: RrhhEvaluacionObjetivoCalificar,
    ) -> RrhhEvaluacionObjetivoRead:
        """Puntúa/ajusta una fila seleccionada; recalcula el promedio.

        `resultado` son las estrellas 0–5; al cambiarse se recalcula el
        promedio ponderado de la evaluación.
        """
        evaluacion = await self._buscar_o_404(db, evaluacion_id)
        fila = await self._buscar_fila_o_404(db, evaluacion, fila_id)

        cambios = obj_in.model_dump(exclude_unset=True)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)
        fila.updated_at = datetime.now()
        db.add(fila)
        await _recalcular_promedio(db, evaluacion)
        await db.commit()
        await db.refresh(fila)

        objetivo = await db.get(RrhhObjetivo, fila.id_objetivo)
        return self._leer_fila(fila, objetivo)

    async def eliminar_fila(
        self, db: AsyncSession, evaluacion_id: int, fila_id: int
    ) -> dict:
        """Quita un objetivo de la selección y recalcula."""
        evaluacion = await self._buscar_o_404(db, evaluacion_id)
        fila = await self._buscar_fila_o_404(db, evaluacion, fila_id)

        await db.delete(fila)
        await db.flush()
        await _recalcular_promedio(db, evaluacion)
        await db.commit()
        return {"mensaje": "Objetivo quitado de la evaluación", "id": fila_id}

    # ── Reporte ─────────────────────────────────────────────────────────────

    async def reporte(
        self,
        db: AsyncSession,
        empleado_id: Optional[int] = None,
        departamento_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> RrhhEvaluacionReporte:
        """Promedios ponderados por empleado y globales."""
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

        grupos: dict[int, list] = {}
        todos_promedios: List[Decimal] = []

        for fila in filas:
            if fila.promedio_objetivos is not None:
                prom = fila.promedio_objetivos
                todos_promedios.append(prom)
                grupos.setdefault(fila.empleado_id, []).append(prom)
            else:
                grupos.setdefault(fila.empleado_id, [])

        empleados_reporte = []
        for emp_id in sorted(grupos):
            emp = resolucion["empleados"].get(emp_id)
            nombre_depto = None
            if emp and emp.departamento_id:
                nombre_depto = resolucion["departamentos"].get(emp.departamento_id)
            promedios = grupos[emp_id]
            cantidad = sum(1 for f in filas if f.empleado_id == emp_id)
            empleados_reporte.append(
                RrhhEvaluacionEmpleadoReporte(
                    empleado_id=emp_id,
                    empleado_codigo=emp.codigo_empleado if emp else None,
                    empleado_nombre=self._nombre_completo(emp),
                    departamento_nombre=nombre_depto,
                    cantidad_evaluaciones=cantidad,
                    promedio_objetivos=(
                        redondear(
                            sum(promedios, Decimal("0")) / Decimal(len(promedios))
                        )
                        if promedios
                        else None
                    ),
                )
            )

        return RrhhEvaluacionReporte(
            desde=desde,
            hasta=hasta,
            cantidad_evaluaciones=len(filas),
            promedio_objetivos=(
                redondear(
                    sum(todos_promedios, Decimal("0")) / Decimal(len(todos_promedios))
                )
                if todos_promedios
                else None
            ),
            empleados=empleados_reporte,
        )


rrhh_evaluacion_service = RrhhEvaluacionService()

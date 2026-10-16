"""Servicio del submódulo RRHH — Evaluaciones, objetivos y metas (Fase 8).

Reglas de negocio de esta fase:

- **Ciclo**: `borrador → finalizada`. Solo la **evaluación** (cabecera y
  criterios) y la **calificación de metas** exigen `borrador`; la definición
  de objetivos y metas vive en el empleado y es siempre editable
  (`rrhh_objetivo_service`).
- **Única por (empleado, periodo, tipo)**: no se puede tener dos evaluaciones
  iguales para el mismo periodo; el alta devuelve `409`.
- **Tipos en catálogo**: `evaluaciones.tipo_evaluacion_id` es FK a
  `tipos_evaluaciones` (sembrado con Formal, Autoevaluación, Parcial y Final);
  el servicio exige que el id exista (404) y esté activo (400), y resuelve su
  `nombre` para las respuestas.
- **Criterios**: cada criterio se puntúa con **10 estrellas** (0–10, columna
  `{criterio}_estrellas`; None = sin puntuar) sobre **una escala por
  evaluación** (`escala_criterios_id`, FK a `calificaciones` cuyo `valor` es
  el último número: 5, 10 o 100). El servicio exige que la escala exista y
  que no falte si hay estrellas; el valor en escala (estrellas/10 × escala) y
  el promedio se calculan **al leer** (no están persistidos).
- **`promedio_objetivos`** (0–100) **sí se persiste**: es el promedio de los
  `resultado_objetivo` (media 1–5 de las valoraciones de las metas de cada
  objetivo) de los objetivos del empleado **en alcance** del periodo (solape
  de fechas; sin fechas cuenta siempre). Se recalcula en las evaluaciones en
  `borrador` al calificar/editar metas, al crear la evaluación y al
  finalizar; las finalizadas quedan congeladas.
- **Objetivos y metas anidados**: `metas` cuelgan de `objetivos`, que cuelgan
  de `empleados` (FK `CASCADE` en ambos); el detalle
  de la evaluación muestra los del empleado en alcance de su periodo.
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
    puede_editar,
    promedio_criterios,
    redondear,
    solapa_fechas,
    validar_fechas,
    valor_en_escala,
)
from src.dto import (
    RrhhEvaluacionCreate,
    RrhhEvaluacionUpdate,
    RrhhEvaluacionListado,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionReporte,
    RrhhEvaluacionEmpleadoReporte,
    RrhhCriterioEvaluacion,
    RrhhMetaRead,
    RrhhMetaValoracion,
)
from src.models import (
    RrhhEvaluacion,
    RrhhObjetivo,
    RrhhMeta,
    RrhhCalificacion,
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhTipoEvaluacion,
)
from src.services.rrhh_objetivo_service import rrhh_objetivo_service

CERO = Decimal("0.00")


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

    async def _validar_escala(
        self, db: AsyncSession, escala_id: Optional[int], estrellas: dict
    ) -> None:
        """La escala es una `calificaciones` real; obligatoria si hay estrellas."""
        if escala_id is None:
            if any(v is not None for v in estrellas.values()):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Si puntúas los criterios debes elegir una escala "
                        "(5, 10 o 100)"
                    ),
                )
            return
        res = await db.exec(
            select(RrhhCalificacion).where(
                RrhhCalificacion.id_calificaciones == escala_id
            )
        )
        if res.first() is None:
            raise HTTPException(
                status_code=404, detail="La escala de criterios no existe"
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

    # ── Cálculos ────────────────────────────────────────────────────────────

    def _criterios_resueltos(
        self, evaluacion: RrhhEvaluacion, escala_valor: Optional[int]
    ) -> List[RrhhCriterioEvaluacion]:
        """Los 4 criterios: sus estrellas y su valor en la escala (0 si vacío)."""
        salida = []
        for clave in CRITERIOS:
            estrellas = getattr(evaluacion, f"{clave}_estrellas")
            valor = valor_en_escala(estrellas, escala_valor)
            salida.append(
                RrhhCriterioEvaluacion(
                    criterio=clave,
                    etiqueta=CRITERIOS_ETIQUETA[clave],
                    estrellas=estrellas,
                    valor=valor if valor is not None else Decimal("0.00"),
                )
            )
        return salida

    def _construir_listado(
        self,
        evaluacion: RrhhEvaluacion,
        resolucion: dict,
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

        escala = resolucion["escalas"].get(evaluacion.escala_criterios_id)
        escala_valor = escala.valor if escala else None
        valores = [
            valor_en_escala(getattr(evaluacion, f"{c}_estrellas"), escala_valor)
            for c in CRITERIOS
        ]
        cantidad_objetivos, cantidad_metas = conteos.get(evaluacion.id, (0, 0))

        return RrhhEvaluacionListado(
            **RrhhEvaluacion.model_validate(
                evaluacion, from_attributes=True
            ).model_dump(),
            tipo_evaluacion=resolucion["tipos"].get(evaluacion.tipo_evaluacion_id),
            empleado_codigo=empleado.codigo_empleado if empleado else None,
            empleado_nombre=self._nombre_completo(empleado),
            departamento_nombre=nombre_depto,
            evaluador_nombre=self._nombre_completo(evaluador),
            escala_nombre=escala.nombre if escala else None,
            escala_valor=escala_valor,
            criterios=self._criterios_resueltos(evaluacion, escala_valor),
            promedio_criterios=promedio_criterios(valores),
            cantidad_objetivos=cantidad_objetivos,
            cantidad_metas=cantidad_metas,
        )

    async def _resolucion_listado(
        self, db: AsyncSession, filas: List[RrhhEvaluacion]
    ) -> dict:
        """Empleados, departamentos, escalas y conteos, todo en lote."""
        empleado_ids = {f.empleado_id for f in filas} | {
            f.evaluador_id for f in filas if f.evaluador_id
        }
        empleados = await self._empleados_por_id(db, empleado_ids)
        departamentos = await self._departamentos_por_id(
            db, {e.departamento_id for e in empleados.values() if e.departamento_id}
        )

        escala_ids = {f.escala_criterios_id for f in filas if f.escala_criterios_id}
        escalas = await self._calificaciones_por_id(db, escala_ids)

        tipos = await self._tipos_por_id(
            db, {f.tipo_evaluacion_id for f in filas}
        )

        # Objetivos en alcance y sus metas, en dos consultas fijas (sin N+1):
        # se cuentan por empleado y solape de fechas con el periodo de cada
        # fila (los objetivos sin fechas cuentan siempre).
        conteos: dict[int, tuple] = {}
        empleado_ids = {f.empleado_id for f in filas}
        res = await db.exec(
            select(RrhhObjetivo).where(RrhhObjetivo.empleado_id.in_(empleado_ids))
        )
        objetivos = list(res.all())
        metas_por_objetivo: dict[int, int] = {}
        if objetivos:
            res = await db.exec(
                select(RrhhMeta.objetivo_id, func.count().label("c"))
                .where(
                    RrhhMeta.objetivo_id.in_([o.id_objetivos for o in objetivos])
                )
                .group_by(RrhhMeta.objetivo_id)
            )
            metas_por_objetivo = {row[0]: row[1] for row in res.all()}

        for f in filas:
            en_alcance = [
                o
                for o in objetivos
                if o.empleado_id == f.empleado_id
                and solapa_fechas(
                    o.fecha_inicio, o.fecha_fin, f.inicio_periodo, f.fin_periodo
                )
            ]
            conteos[f.id] = (
                len(en_alcance),
                sum(metas_por_objetivo.get(o.id_objetivos, 0) for o in en_alcance),
            )

        return {
            "empleados": empleados,
            "departamentos": departamentos,
            "escalas": escalas,
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
        estado: Optional[str] = None,
        tipo_evaluacion_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhEvaluacionListado]:
        if estado is not None and estado not in ESTADOS_EVALUACION:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_EVALUACION)}",
            )
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
        if estado is not None:
            statement = statement.where(RrhhEvaluacion.estado == estado)
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

        statement = statement.order_by(
            RrhhEvaluacion.inicio_periodo.desc(), RrhhEvaluacion.id
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_listado(db, filas)
        return [
            self._construir_listado(f, resolucion, resolucion["conteos"])
            for f in filas
        ]

    async def get(self, db: AsyncSession, id: int) -> RrhhEvaluacionDetalle:
        evaluacion = await self._buscar_o_404(db, id)
        resolucion = await self._resolucion_listado(db, [evaluacion])
        base = self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["conteos"],
        )

        # Objetivos del empleado en alcance del periodo, con sus metas
        # anidadas: aquí es donde se califican.
        objetivos_dto = await rrhh_objetivo_service.objetivos_con_metas_en_alcance(
            db,
            evaluacion.empleado_id,
            evaluacion.inicio_periodo,
            evaluacion.fin_periodo,
        )

        # Valoración media (1–5) de las metas puntuadas en alcance.
        metas = [m for o in objetivos_dto for m in o.metas]
        puntuadas = [m.valoracion for m in metas if m.valoracion is not None]
        prom_1a5 = (
            redondear(sum(Decimal(v) for v in puntuadas) / Decimal(len(puntuadas)))
            if puntuadas
            else None
        )

        return RrhhEvaluacionDetalle(
            **base.model_dump(),
            objetivos=objetivos_dto,
            promedio_valoracion_1a5=prom_1a5,
        )

    # ── Escritura de la evaluación ──────────────────────────────────────────

    async def crear(self, db: AsyncSession, obj_in: RrhhEvaluacionCreate) -> RrhhEvaluacionListado:
        await self._verificar_empleado(db, obj_in.empleado_id)
        await self._validar_empleados_del_evaluador(db, obj_in.evaluador_id)
        self._validar_rango(obj_in.inicio_periodo, obj_in.fin_periodo)
        await self._validar_escala(
            db,
            obj_in.escala_criterios_id,
            {
                "puntualidad": obj_in.puntualidad_estrellas,
                "productividad": obj_in.productividad_estrellas,
                "trabajo_equipo": obj_in.trabajo_equipo_estrellas,
                "calidad": obj_in.calidad_estrellas,
            },
        )
        await self._validar_tipo(db, obj_in.tipo_evaluacion_id)
        await self._exigir_unica(
            db, obj_in.empleado_id, obj_in.periodo, obj_in.tipo_evaluacion_id
        )

        evaluacion = RrhhEvaluacion(
            empleado_id=obj_in.empleado_id,
            evaluador_id=obj_in.evaluador_id,
            periodo=obj_in.periodo,
            tipo_evaluacion_id=obj_in.tipo_evaluacion_id,
            estado="borrador",
            inicio_periodo=obj_in.inicio_periodo,
            fin_periodo=obj_in.fin_periodo,
            escala_criterios_id=obj_in.escala_criterios_id,
            puntualidad_estrellas=obj_in.puntualidad_estrellas,
            productividad_estrellas=obj_in.productividad_estrellas,
            trabajo_equipo_estrellas=obj_in.trabajo_equipo_estrellas,
            calidad_estrellas=obj_in.calidad_estrellas,
            comentarios=obj_in.comentarios,
            fecha=obj_in.fecha or date.today(),
        )
        db.add(evaluacion)
        await db.flush()
        # El promedio de objetivos se recalcula con los objetivos en alcance
        # que el empleado ya tenga puntuados (None si ninguno).
        await rrhh_objetivo_service.recalcular_evaluaciones_borrador(
            db, obj_in.empleado_id
        )
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
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
        campos_estrellas = [f"{c}_estrellas" for c in CRITERIOS]
        if "escala_criterios_id" in datos or any(k in datos for k in campos_estrellas):
            estrellas = {
                c: datos.get(f"{c}_estrellas", getattr(evaluacion, f"{c}_estrellas"))
                for c in CRITERIOS
            }
            await self._validar_escala(
                db,
                datos.get("escala_criterios_id", evaluacion.escala_criterios_id),
                estrellas,
            )

        for campo, valor in datos.items():
            setattr(evaluacion, campo, valor)
        evaluacion.updated_at = datetime.now()
        db.add(evaluacion)
        # Cambiar el periodo puede sacar/entrar objetivos del alcance.
        await rrhh_objetivo_service.recalcular_evaluaciones_borrador(
            db, evaluacion.empleado_id
        )
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["conteos"],
        )

    async def finalizar(self, db: AsyncSession, id: int) -> RrhhEvaluacionListado:
        """`borrador → finalizada`: recalcula y congela la evaluación."""
        evaluacion = await self._buscar_o_404(db, id)
        if evaluacion.estado == "finalizada":
            raise HTTPException(status_code=409, detail="La evaluación ya está finalizada")

        # El cálculo definitivo se hace mientras sigue en `borrador`
        # (recalcular solo toca borradores); después ya queda congelado.
        await rrhh_objetivo_service.recalcular_evaluaciones_borrador(
            db, evaluacion.empleado_id
        )
        evaluacion.estado = "finalizada"
        evaluacion.updated_at = datetime.now()
        db.add(evaluacion)
        await db.commit()
        await db.refresh(evaluacion)

        resolucion = await self._resolucion_listado(db, [evaluacion])
        return self._construir_listado(
            evaluacion,
            resolucion,
            resolucion["conteos"],
        )

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        evaluacion = await self._buscar_o_404(db, id)
        self._exigir_borrador(evaluacion, "eliminar")
        await db.delete(evaluacion)
        await db.commit()
        return {"mensaje": f"{self.model_name} eliminada", "id": id}

    # ── Calificación de metas (solo desde aquí) ─────────────────────────────

    async def valorar_meta(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        meta_id: int,
        obj_in: RrhhMetaValoracion,
    ) -> RrhhMetaRead:
        """Puntúa una meta (1–5) mientras la evaluación esté en `borrador`.

        La definición (objetivos y metas) vive en el empleado y es siempre
        editable; lo que exige `borrador` es la **calificación**: al puntuar,
        se recalcula `resultado_objetivo` del objetivo y `promedio_objetivos`
        de las evaluaciones en borrador del empleado.
        """
        evaluacion = await self._buscar_o_404(db, evaluacion_id)
        self._exigir_borrador(evaluacion, "calificar metas")
        return await rrhh_objetivo_service.valorar_meta(
            db, evaluacion, meta_id, obj_in
        )

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
            listado = self._construir_listado(fila, resolucion, resolucion["conteos"])
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

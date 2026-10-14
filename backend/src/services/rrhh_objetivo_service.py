"""Servicio de objetivos y metas (Fase 8, reorganización por empleado).

Se **definen** en el empleado (`/rrhh/objetivos`) y se **califican** en la
evaluación (`PUT /rrhh/evaluaciones/{id}/metas/{meta_id}/valoracion`):

- `metas.valoracion` (1–5) es la nota que se pone al evaluar;
- `objetivos.resultado_objetivo` = media de las valoraciones de sus metas
  (recalculada en cada mutación de metas);
- `evaluaciones.promedio_objetivos` (0–100) = promedio de los
  `resultado_objetivo` de los objetivos **en alcance** del periodo (los que
  solapan sus fechas; un objetivo sin fechas cuenta siempre). Se recalcula en
  las evaluaciones en `borrador` del empleado: las finalizadas quedan
  congeladas.

La definición (nombre, fechas y metas) es **siempre editable**: ya no hay
una evaluación que congele los objetivos del empleado.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_evaluacion_calc import escala_a_100, promedio_objetivos, redondear, solapa_fechas
from src.dto import (
    RrhhMetaCreate,
    RrhhMetaRead,
    RrhhMetaUpdate,
    RrhhMetaValoracion,
    RrhhObjetivoCreate,
    RrhhObjetivoDetalle,
    RrhhObjetivoRead,
    RrhhObjetivoUpdate,
)
from src.models.rrhh_empleado import RrhhEmpleado
from src.models.rrhh_evaluacion import RrhhEvaluacion, RrhhMeta, RrhhObjetivo


class ObjetivoService:
    """CRUD de objetivos/metas y los recálculos que alimentan la evaluación."""

    # ── Utilidades ──────────────────────────────────────────────────────────

    async def _buscar_o_404(
        self, db: AsyncSession, objetivo_id: int
    ) -> RrhhObjetivo:
        objetivo = await db.get(RrhhObjetivo, objetivo_id)
        if not objetivo:
            raise HTTPException(status_code=404, detail="El objetivo no existe")
        return objetivo

    async def _buscar_meta_o_404(self, db: AsyncSession, meta_id: int) -> RrhhMeta:
        meta = await db.get(RrhhMeta, meta_id)
        if not meta:
            raise HTTPException(status_code=404, detail="La meta no existe")
        return meta

    async def _empleado_o_400(self, db: AsyncSession, empleado_id: int) -> RrhhEmpleado:
        """El empleado debe existir (404) y estar activo (400): a un empleado
        inactivo no se le definen objetivos nuevos."""
        empleado = await db.get(RrhhEmpleado, empleado_id)
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado no existe")
        if not empleado.activo:
            raise HTTPException(
                status_code=400, detail="El empleado está inactivo"
            )
        return empleado

    @staticmethod
    def _nombre_completo(empleado: Optional[RrhhEmpleado]) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    def _validar_rango(self, inicio: Optional[date], fin: Optional[date]) -> None:
        if inicio and fin and fin < inicio:
            raise HTTPException(
                status_code=422,
                detail="El fin no puede ser anterior al inicio",
            )

    async def _metas_por_objetivo(
        self, db: AsyncSession, objetivo_ids: List[int]
    ) -> dict:
        """Metas de los objetivos dados, en una sola consulta (sin N+1)."""
        if not objetivo_ids:
            return {}
        res = await db.exec(
            select(RrhhMeta)
            .where(RrhhMeta.objetivo_id.in_(objetivo_ids))
            .order_by(RrhhMeta.id_metas)
        )
        salida: dict = {}
        for meta in res.all():
            salida.setdefault(meta.objetivo_id, []).append(meta)
        return salida

    def _leer_objetivo(
        self, objetivo: RrhhObjetivo, metas: List[RrhhMeta]
    ) -> RrhhObjetivoRead:
        return RrhhObjetivoRead(
            **RrhhObjetivo.model_validate(
                objetivo, from_attributes=True
            ).model_dump(),
            aporte=escala_a_100(objetivo.resultado_objetivo),
            total_metas=len(metas),
            metas=[
                RrhhMetaRead.model_validate(m, from_attributes=True) for m in metas
            ],
        )

    async def _empleado_de(
        self, db: AsyncSession, empleado_id: int
    ) -> Optional[RrhhEmpleado]:
        return await db.get(RrhhEmpleado, empleado_id)

    # ── Recálculos (compartidos con la evaluación) ──────────────────────────

    async def recalcular_objetivo(
        self, db: AsyncSession, objetivo_id: int
    ) -> Optional[Decimal]:
        """Persiste `resultado_objetivo` = media (1–5) de las valoraciones de
        las metas del objetivo; `None` si ninguna está puntuada."""
        res = await db.exec(
            select(func.avg(RrhhMeta.valoracion)).where(
                RrhhMeta.objetivo_id == objetivo_id,
                RrhhMeta.valoracion.is_not(None),
            )
        )
        media = res.one_or_none()
        resultado = redondear(Decimal(media)) if media is not None else None
        objetivo = await db.get(RrhhObjetivo, objetivo_id)
        if objetivo:
            objetivo.resultado_objetivo = resultado
            objetivo.updated_at = datetime.now()
            db.add(objetivo)
        return resultado

    async def objetivos_en_alcance(
        self,
        db: AsyncSession,
        empleado_id: int,
        inicio: Optional[date],
        fin: Optional[date],
    ) -> List[RrhhObjetivo]:
        """Objetivos del empleado cuyo rango de fechas solapa el periodo
        (los objetivos sin fechas cuentan siempre)."""
        res = await db.exec(
            select(RrhhObjetivo)
            .where(RrhhObjetivo.empleado_id == empleado_id)
            .order_by(RrhhObjetivo.id_objetivos)
        )
        return [
            o
            for o in res.all()
            if solapa_fechas(o.fecha_inicio, o.fecha_fin, inicio, fin)
        ]

    async def objetivos_con_metas_en_alcance(
        self,
        db: AsyncSession,
        empleado_id: int,
        inicio: Optional[date],
        fin: Optional[date],
    ) -> List[RrhhObjetivoRead]:
        """Los objetivos en alcance, con sus metas anidadas (los que usa el
        detalle de la evaluación para calificar)."""
        objetivos = await self.objetivos_en_alcance(db, empleado_id, inicio, fin)
        metas = await self._metas_por_objetivo(
            db, [o.id_objetivos for o in objetivos]
        )
        return [
            self._leer_objetivo(o, metas.get(o.id_objetivos, []))
            for o in objetivos
        ]

    async def recalcular_evaluaciones_borrador(
        self, db: AsyncSession, empleado_id: int
    ) -> None:
        """Recalcula `promedio_objetivos` (0–100) de las evaluaciones en
        `borrador` del empleado (las finalizadas no se tocan)."""
        res = await db.exec(
            select(RrhhEvaluacion).where(
                RrhhEvaluacion.empleado_id == empleado_id,
                RrhhEvaluacion.estado == "borrador",
            )
        )
        for evaluacion in res.all():
            objetivos = await self.objetivos_en_alcance(
                db, empleado_id, evaluacion.inicio_periodo, evaluacion.fin_periodo
            )
            evaluacion.promedio_objetivos = promedio_objetivos(
                [o.resultado_objetivo for o in objetivos]
            )
            evaluacion.updated_at = datetime.now()
            db.add(evaluacion)

    # ── Objetivos (definición; siempre editable) ────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        empleado_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RrhhObjetivoRead]:
        """Objetivos con sus metas anidadas; filtro opcional por empleado."""
        statement = select(RrhhObjetivo).order_by(RrhhObjetivo.id_objetivos)
        if empleado_id is not None:
            statement = statement.where(RrhhObjetivo.empleado_id == empleado_id)
        res = await db.exec(statement.offset(skip).limit(limit))
        objetivos = list(res.all())
        metas = await self._metas_por_objetivo(
            db, [o.id_objetivos for o in objetivos]
        )
        return [
            self._leer_objetivo(o, metas.get(o.id_objetivos, []))
            for o in objetivos
        ]

    async def get(self, db: AsyncSession, objetivo_id: int) -> RrhhObjetivoDetalle:
        """Detalle del objetivo con su empleado (cabecera de la pantalla de
        metas) y sus metas anidadas."""
        objetivo = await self._buscar_o_404(db, objetivo_id)
        metas = await self._metas_por_objetivo(db, [objetivo_id])
        empleado = await self._empleado_de(db, objetivo.empleado_id)
        base = self._leer_objetivo(objetivo, metas.get(objetivo_id, []))
        return RrhhObjetivoDetalle(
            **base.model_dump(),
            empleado_nombre=self._nombre_completo(empleado),
            empleado_codigo=empleado.codigo_empleado if empleado else None,
        )

    async def crear(self, db: AsyncSession, obj_in: RrhhObjetivoCreate) -> RrhhObjetivoRead:
        await self._empleado_o_400(db, obj_in.empleado_id)

        objetivo = RrhhObjetivo(**obj_in.model_dump())
        db.add(objetivo)
        await db.commit()
        await db.refresh(objetivo)
        # Sin metas todavía: `resultado_objetivo` queda nulo y no mueve ningún
        # promedio, así que no hace falta recalcular evaluaciones.
        return self._leer_objetivo(objetivo, [])

    async def update(
        self, db: AsyncSession, objetivo_id: int, obj_in: RrhhObjetivoUpdate
    ) -> RrhhObjetivoRead:
        objetivo = await self._buscar_o_404(db, objetivo_id)
        cambios = obj_in.model_dump(exclude_unset=True)
        self._validar_rango(
            cambios.get("fecha_inicio", objetivo.fecha_inicio),
            cambios.get("fecha_fin", objetivo.fecha_fin),
        )
        for campo, valor in cambios.items():
            setattr(objetivo, campo, valor)
        objetivo.updated_at = datetime.now()
        db.add(objetivo)
        # Las fechas deciden en qué evaluaciones cuenta el objetivo.
        await self.recalcular_evaluaciones_borrador(db, objetivo.empleado_id)
        await db.commit()
        await db.refresh(objetivo)
        metas = await self._metas_por_objetivo(db, [objetivo_id])
        return self._leer_objetivo(objetivo, metas.get(objetivo_id, []))

    async def eliminar(self, db: AsyncSession, objetivo_id: int) -> dict:
        objetivo = await self._buscar_o_404(db, objetivo_id)
        empleado_id = objetivo.empleado_id
        await db.delete(objetivo)  # las metas caen por CASCADE
        await self.recalcular_evaluaciones_borrador(db, empleado_id)
        await db.commit()
        return {"mensaje": "Objetivo eliminado", "id": objetivo_id}

    # ── Metas (definición; siempre editable) ────────────────────────────────

    async def crear_meta(
        self, db: AsyncSession, objetivo_id: int, obj_in: RrhhMetaCreate
    ) -> RrhhMetaRead:
        objetivo = await self._buscar_o_404(db, objetivo_id)

        meta = RrhhMeta(objetivo_id=objetivo_id, **obj_in.model_dump())
        db.add(meta)
        await db.flush()
        await self.recalcular_objetivo(db, objetivo_id)
        await self.recalcular_evaluaciones_borrador(db, objetivo.empleado_id)
        await db.commit()
        await db.refresh(meta)
        return RrhhMetaRead.model_validate(meta, from_attributes=True)

    async def update_meta(
        self, db: AsyncSession, meta_id: int, obj_in: RrhhMetaUpdate
    ) -> RrhhMetaRead:
        meta = await self._buscar_meta_o_404(db, meta_id)
        objetivo = await self._buscar_o_404(db, meta.objetivo_id)
        cambios = obj_in.model_dump(exclude_unset=True)
        self._validar_rango(
            cambios.get("fecha_inicio", meta.fecha_inicio),
            cambios.get("fecha_fin", meta.fecha_fin),
        )
        for campo, valor in cambios.items():
            setattr(meta, campo, valor)
        meta.updated_at = datetime.now()
        db.add(meta)
        await self.recalcular_objetivo(db, objetivo.id_objetivos)
        await self.recalcular_evaluaciones_borrador(db, objetivo.empleado_id)
        await db.commit()
        await db.refresh(meta)
        return RrhhMetaRead.model_validate(meta, from_attributes=True)

    async def eliminar_meta(self, db: AsyncSession, meta_id: int) -> dict:
        meta = await self._buscar_meta_o_404(db, meta_id)
        objetivo = await self._buscar_o_404(db, meta.objetivo_id)
        await db.delete(meta)
        await self.recalcular_objetivo(db, objetivo.id_objetivos)
        await self.recalcular_evaluaciones_borrador(db, objetivo.empleado_id)
        await db.commit()
        return {"mensaje": "Meta eliminada", "id": meta_id}

    # ── Calificación (solo desde la evaluación) ─────────────────────────────

    async def valorar_meta(
        self,
        db: AsyncSession,
        evaluacion: RrhhEvaluacion,
        meta_id: int,
        obj_in: RrhhMetaValoracion,
    ) -> RrhhMetaRead:
        """Puntúa una meta (1–5) desde una evaluación en `borrador`.

        La meta debe pertenecer a un objetivo **en alcance** del empleado
        evaluado (solape de fechas con el periodo; sin fechas cuenta siempre).
        """
        meta = await self._buscar_meta_o_404(db, meta_id)
        objetivo = await self._buscar_o_404(db, meta.objetivo_id)
        if objetivo.empleado_id != evaluacion.empleado_id:
            raise HTTPException(
                status_code=404, detail="La meta no existe en esta evaluación"
            )
        if not solapa_fechas(
            objetivo.fecha_inicio,
            objetivo.fecha_fin,
            evaluacion.inicio_periodo,
            evaluacion.fin_periodo,
        ):
            raise HTTPException(
                status_code=400,
                detail="El objetivo no entra en el periodo de la evaluación",
            )

        meta.valoracion = obj_in.valoracion
        meta.updated_at = datetime.now()
        db.add(meta)
        await self.recalcular_objetivo(db, objetivo.id_objetivos)
        await self.recalcular_evaluaciones_borrador(db, evaluacion.empleado_id)
        await db.commit()
        await db.refresh(meta)
        return RrhhMetaRead.model_validate(meta, from_attributes=True)


rrhh_objetivo_service = ObjetivoService()

"""Servicio de objetivos (Fase 8 v2 — objetivos ponderados).

El objetivo se **define** en el empleado (`/rrhh/objetivos`), siempre
editable, con su `periodo_inicio`/`periodo_fin` (obligatorios) y su `peso`
fijo (**número natural 1–100**). La **puntuación** (estrellas 0–5, valoración y recomendaciones)
vive en `evaluaciones_objetivos` y se gestiona desde la evaluación
(`rrhh_evaluacion_service`), que es quien recalcula el promedio ponderado.

Al eliminar un objetivo sus filas del N:M caen por `CASCADE`, así que la
baja recalcula el promedio de las borradores del empleado.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_evaluacion_calc import solapa_fechas
from src.dto import (
    RrhhObjetivoCreate,
    RrhhObjetivoDetalle,
    RrhhObjetivoRead,
    RrhhObjetivoUpdate,
)
from src.models.rrhh_empleado import RrhhEmpleado
from src.models.rrhh_evaluacion import RrhhObjetivo
from src.services.rrhh_evaluacion_service import recalcular_promedio_borradores


class ObjetivoService:
    """CRUD de objetivos (la puntuación vive en la evaluación)."""

    # ── Utilidades ──────────────────────────────────────────────────────────

    async def _buscar_o_404(self, db: AsyncSession, objetivo_id: int) -> RrhhObjetivo:
        objetivo = await db.get(RrhhObjetivo, objetivo_id)
        if not objetivo:
            raise HTTPException(status_code=404, detail="El objetivo no existe")
        return objetivo

    async def _empleado_o_400(self, db: AsyncSession, empleado_id: int) -> RrhhEmpleado:
        """El empleado debe existir (404) y estar activo (400): a un empleado
        inactivo no se le definen objetivos nuevos."""
        empleado = await db.get(RrhhEmpleado, empleado_id)
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado no existe")
        if not empleado.activo:
            raise HTTPException(status_code=400, detail="El empleado está inactivo")
        return empleado

    @staticmethod
    def _nombre_completo(empleado: Optional[RrhhEmpleado]) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    def _validar_rango(self, inicio, fin) -> None:
        if inicio and fin and fin < inicio:
            raise HTTPException(
                status_code=422,
                detail="El fin no puede ser anterior al inicio",
            )

    def _leer_objetivo(self, objetivo: RrhhObjetivo) -> RrhhObjetivoRead:
        return RrhhObjetivoRead.model_validate(objetivo, from_attributes=True)

    async def objetivos_en_alcance(
        self,
        db: AsyncSession,
        empleado_id: int,
        inicio,
        fin,
    ) -> List[RrhhObjetivo]:
        """Objetivos del empleado cuyo periodo solapa el dado."""
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

    # ── Objetivos (definición; siempre editable) ────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        empleado_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RrhhObjetivoRead]:
        """Objetivos; filtro opcional por empleado."""
        statement = select(RrhhObjetivo).order_by(RrhhObjetivo.id_objetivos)
        if empleado_id is not None:
            statement = statement.where(RrhhObjetivo.empleado_id == empleado_id)
        res = await db.exec(statement.offset(skip).limit(limit))
        return [self._leer_objetivo(o) for o in res.all()]

    async def get(self, db: AsyncSession, objetivo_id: int) -> RrhhObjetivoDetalle:
        """Detalle del objetivo con su empleado (cabecera de la ficha)."""
        objetivo = await self._buscar_o_404(db, objetivo_id)
        empleado = await db.get(RrhhEmpleado, objetivo.empleado_id)
        return RrhhObjetivoDetalle(
            **self._leer_objetivo(objetivo).model_dump(),
            empleado_nombre=self._nombre_completo(empleado),
            empleado_codigo=empleado.codigo_empleado if empleado else None,
        )

    async def crear(
        self, db: AsyncSession, obj_in: RrhhObjetivoCreate
    ) -> RrhhObjetivoRead:
        await self._empleado_o_400(db, obj_in.empleado_id)

        objetivo = RrhhObjetivo(**obj_in.model_dump())
        db.add(objetivo)
        await db.commit()
        await db.refresh(objetivo)
        return self._leer_objetivo(objetivo)

    async def update(
        self, db: AsyncSession, objetivo_id: int, obj_in: RrhhObjetivoUpdate
    ) -> RrhhObjetivoRead:
        objetivo = await self._buscar_o_404(db, objetivo_id)
        cambios = obj_in.model_dump(exclude_unset=True)
        self._validar_rango(
            cambios.get("periodo_inicio", objetivo.periodo_inicio),
            cambios.get("periodo_fin", objetivo.periodo_fin),
        )
        for campo, valor in cambios.items():
            setattr(objetivo, campo, valor)
        objetivo.updated_at = datetime.now()
        db.add(objetivo)
        # El peso y las fechas solo afectan a futuras selecciones: las filas
        # ya elegidas en borradores conservan su copia (documentado).
        await db.commit()
        await db.refresh(objetivo)
        return self._leer_objetivo(objetivo)

    async def eliminar(self, db: AsyncSession, objetivo_id: int) -> dict:
        objetivo = await self._buscar_o_404(db, objetivo_id)
        empleado_id = objetivo.empleado_id
        await db.delete(objetivo)  # las filas del N:M caen por CASCADE
        await db.flush()
        # La baja arrastra filas de borradores: hay que recomputar su promedio.
        await recalcular_promedio_borradores(db, empleado_id)
        await db.commit()
        return {"mensaje": "Objetivo eliminado", "id": objetivo_id}


rrhh_objetivo_service = ObjetivoService()

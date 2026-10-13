"""Servicios del submódulo RRHH — Catálogos base (Fase 1).

Los cinco catálogos comparten la misma lógica: nombre único, baja/soft
delete y verificación de que no estén en uso antes de eliminar. Se modela
con una base genérica parametrizable y una instancia concreta por catálogo,
evitando repetir el CRUD cinco veces.

Reglas comunes:
- `nombre` único por catálogo (también lo garantiza el índice UNIQUE de BD).
- Baja lógica (`activo=False`) en vez de borrado si el registro está en uso.
- `calificaciones` no tiene columna `activo`: si está en uso devuelve 409.
"""

from typing import List, Optional, Type

from fastapi import HTTPException
from sqlmodel import SQLModel, select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto import (
    RrhhTipoContratoCreate,
    RrhhTipoContratoUpdate,
    RrhhTipoContratoRead,
    RrhhTipoDeduccionCreate,
    RrhhTipoDeduccionUpdate,
    RrhhTipoDeduccionRead,
    RrhhTipoBonificacionCreate,
    RrhhTipoBonificacionUpdate,
    RrhhTipoBonificacionRead,
    RrhhTipoPagoCreate,
    RrhhTipoPagoUpdate,
    RrhhTipoPagoRead,
    RrhhCalificacionCreate,
    RrhhCalificacionUpdate,
    RrhhCalificacionRead,
)
from src.models import (
    RrhhTipoContrato,
    RrhhTipoDeduccion,
    RrhhTipoBonificacion,
    RrhhTipoPago,
    RrhhCalificacion,
    RrhhEmpleado,
)
from src.models.rrhh_deducciones import RrhhDeduccion, RrhhBonificacion
from src.models.rrhh_nomina import RrhhPago


class RrhhCatalogoService:
    """CRUD genérico para un catálogo, parametrizado por su modelo concreto."""

    def __init__(
        self,
        *,
        model: Type[SQLModel],
        create_model: Type[SQLModel],
        update_model: Type[SQLModel],
        read_model: Type[SQLModel],
        pk: str,
        etiqueta: str,
        tiene_activo: bool = True,
        max_nombre: Optional[int] = None,
    ):
        self.model = model
        self.create_model = create_model
        self.update_model = update_model
        self.read_model = read_model
        self.pk = pk
        self.etiqueta = etiqueta
        self.tiene_activo = tiene_activo
        self.max_nombre = max_nombre

    # ── Validaciones ────────────────────────────────────────────────────────

    async def _verificar_nombre_unico(
        self, db: AsyncSession, nombre: str, excluir_id: Optional[int] = None
    ) -> None:
        nombre = nombre.strip()
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        if self.max_nombre and len(nombre) > self.max_nombre:
            raise HTTPException(
                status_code=400,
                detail=f"El nombre no puede superar los {self.max_nombre} caracteres",
            )
        statement = select(self.model).where(self.model.nombre == nombre)  # type: ignore[attr-defined]
        if excluir_id is not None:
            statement = statement.where(getattr(self.model, self.pk) != excluir_id)
        result = await db.exec(statement)
        if result.first():
            raise HTTPException(
                status_code=409, detail=f"Ya existe un {self.etiqueta} llamado «{nombre}»"
            )

    async def _esta_en_uso(self, db: AsyncSession, id: int) -> bool:
        """Comprueba si el registro tiene registros dependientes."""
        for statement in self._usos(id):
            result = await db.exec(statement)
            if (result.one() or 0) > 0:
                return True
        return False

    def _usos(self, id: int) -> List:
        """Consultas de conteo de uso; se sobreescribe en cada catálogo."""
        raise NotImplementedError

    # ── CRUD ────────────────────────────────────────────────────────────────

    async def get(self, db: AsyncSession, id: int) -> SQLModel:
        obj = await db.get(self.model, id)
        if not obj:
            raise HTTPException(status_code=404, detail=f"{self.etiqueta} no encontrado")
        return self.read_model.model_validate(obj)

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        activo: Optional[bool] = None,
        buscar: Optional[str] = None,
    ) -> List[SQLModel]:
        statement = select(self.model)
        if activo is not None and self.tiene_activo:
            statement = statement.where(self.model.activo == activo)  # type: ignore[attr-defined]
        if buscar:
            statement = statement.where(self.model.nombre.ilike(f"%{buscar.strip()}%"))  # type: ignore[attr-defined]
        statement = statement.order_by(self.model.nombre).offset(skip).limit(limit)  # type: ignore[attr-defined]
        result = await db.exec(statement)
        return [self.read_model.model_validate(o) for o in result.all()]

    async def create(self, db: AsyncSession, obj_in: SQLModel) -> SQLModel:
        data = obj_in.model_dump()
        await self._verificar_nombre_unico(db, data["nombre"])
        db_obj = self.model(**data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self.read_model.model_validate(db_obj)

    async def update(self, db: AsyncSession, id: int, obj_in: SQLModel) -> SQLModel:
        db_obj = await db.get(self.model, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.etiqueta} no encontrado")
        data = obj_in.model_dump(exclude_unset=True)
        if "nombre" in data:
            await self._verificar_nombre_unico(db, data["nombre"], excluir_id=id)
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self.read_model.model_validate(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        """Baja lógica si está en uso; si no, borrado físico."""
        db_obj = await db.get(self.model, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.etiqueta} no encontrado")

        if await self._esta_en_uso(db, id):
            if not self.tiene_activo:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"No se puede eliminar: el {self.etiqueta} está en uso. "
                        "Edita o elimina primero los registros que lo referencian."
                    ),
                )
            db_obj.activo = False  # type: ignore[attr-defined]
            db.add(db_obj)
            await db.commit()
            return {
                "accion": "desactivado",
                "motivo": f"El {self.etiqueta} está en uso; se marcó como inactivo.",
            }

        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}


# ── Instancias concretas ────────────────────────────────────────────────────


class _TipoContratoService(RrhhCatalogoService):
    def _usos(self, id: int) -> List:
        return [
            select(func.count())
            .select_from(RrhhEmpleado)
            .where(RrhhEmpleado.tipo_contrato_id == id)
        ]


class _TipoDeduccionService(RrhhCatalogoService):
    def _usos(self, id: int) -> List:
        return [
            select(func.count())
            .select_from(RrhhDeduccion)
            .where(RrhhDeduccion.tipo_deducciones_id == id)
        ]


class _TipoBonificacionService(RrhhCatalogoService):
    def _usos(self, id: int) -> List:
        return [
            select(func.count())
            .select_from(RrhhBonificacion)
            .where(RrhhBonificacion.tipo_bonificaciones_id == id)
        ]


class _TipoPagoService(RrhhCatalogoService):
    def _usos(self, id: int) -> List:
        return [
            select(func.count())
            .select_from(RrhhPago)
            .where(RrhhPago.metodo_id == id)
        ]


class _CalificacionService(RrhhCatalogoService):
    """`calificaciones` es referenciada por 4 columnas de `evaluaciones`."""

    def _usos(self, id: int) -> List:
        from src.models.rrhh_evaluacion import RrhhEvaluacion

        return [
            select(func.count())
            .select_from(RrhhEvaluacion)
            .where(
                (RrhhEvaluacion.puntualidad == id)
                | (RrhhEvaluacion.productividad == id)
                | (RrhhEvaluacion.trabajo_equipo == id)
                | (RrhhEvaluacion.calidad == id)
            )
        ]


rrhh_tipo_contrato_service = _TipoContratoService(
    model=RrhhTipoContrato,
    create_model=RrhhTipoContratoCreate,
    update_model=RrhhTipoContratoUpdate,
    read_model=RrhhTipoContratoRead,
    pk="id_tipo_contrato",
    etiqueta="tipo de contrato",
    max_nombre=50,
)

rrhh_tipo_deduccion_service = _TipoDeduccionService(
    model=RrhhTipoDeduccion,
    create_model=RrhhTipoDeduccionCreate,
    update_model=RrhhTipoDeduccionUpdate,
    read_model=RrhhTipoDeduccionRead,
    pk="id_tipos_deducciones",
    etiqueta="tipo de deducción",
    max_nombre=100,
)

rrhh_tipo_bonificacion_service = _TipoBonificacionService(
    model=RrhhTipoBonificacion,
    create_model=RrhhTipoBonificacionCreate,
    update_model=RrhhTipoBonificacionUpdate,
    read_model=RrhhTipoBonificacionRead,
    pk="id_tipos_bonificaciones",
    etiqueta="tipo de bonificación",
    max_nombre=100,
)

rrhh_tipo_pago_service = _TipoPagoService(
    model=RrhhTipoPago,
    create_model=RrhhTipoPagoCreate,
    update_model=RrhhTipoPagoUpdate,
    read_model=RrhhTipoPagoRead,
    pk="id_tipo_pago",
    etiqueta="tipo de pago",
    max_nombre=30,
)

rrhh_calificacion_service = _CalificacionService(
    model=RrhhCalificacion,
    create_model=RrhhCalificacionCreate,
    update_model=RrhhCalificacionUpdate,
    read_model=RrhhCalificacionRead,
    pk="id_calificaciones",
    etiqueta="calificación",
    tiene_activo=False,
    max_nombre=100,
)

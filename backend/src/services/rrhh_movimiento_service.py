"""Servicio del submódulo RRHH — Deducciones y bonificaciones (Fase 5).

Las dos entidades son simétricas, así que **un único servicio parametrizado**
las atiende a ambas: todo lo que varía vive en `ConfigMovimiento`. Es el mismo
criterio que `RrhhCatalogoService` en la Fase 1.

Reglas de negocio:
- `valor` puede ser un **importe fijo** o un **porcentaje** del salario, según
  `es_porcentaje` del tipo. El dinero efectivo lo calcula el dominio
  (`monto_aplicado`), nunca se persiste.
- Los porcentajes están limitados a 0–100.
- `fin_periodo >= inicio_periodo`.
- **Sin solape**: dos movimientos del mismo tipo y empleado no pueden cruzarse
  en el tiempo, porque el mismo concepto se cobraría dos veces en la ventana
  compartida. Devuelve `409`.
- Borrado **físico** salvo que el movimiento ya se haya aplicado a una nómina
  (aparezca en las tablas puente), en cuyo caso devuelve `409`: esas tablas
  tienen `ondelete=RESTRICT` y borrar rompería la trazabilidad.
- El consolidado suma los movimientos cuyo periodo **cubre** el rango pedido
  (inclusive en los extremos).
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import List, Optional, Type

from fastapi import HTTPException
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_nomina_calc import (
    monto_aplicado,
    periodos_solapan,
    saldo as calcular_saldo,
    validar_porcentaje,
)
from src.dto import (
    RrhhDeduccionCreate,
    RrhhDeduccionUpdate,
    RrhhDeduccionRead,
    RrhhDeduccionListado,
    RrhhBonificacionCreate,
    RrhhBonificacionUpdate,
    RrhhBonificacionRead,
    RrhhBonificacionListado,
    RrhhConsolidado,
    RrhhConsolidadoEmpleado,
)
from src.models import (
    RrhhDeduccion,
    RrhhBonificacion,
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhTipoDeduccion,
    RrhhTipoBonificacion,
    RrhhNominaDeduccion,
    RrhhNominaBonificacion,
)


@dataclass(frozen=True)
class ConfigMovimiento:
    """Todo lo que distingue a una deducción de una bonificación."""

    etiqueta: str
    modelo: Type
    modelo_tipo: Type
    pk: str
    campo_tipo: str
    pk_tipo: str
    modelo_puente: Type
    campo_puente: str
    dto_read: Type
    dto_listado: Type


DEDUCCION = ConfigMovimiento(
    etiqueta="deducción",
    modelo=RrhhDeduccion,
    modelo_tipo=RrhhTipoDeduccion,
    pk="id_deducciones",
    campo_tipo="tipo_deducciones_id",
    pk_tipo="id_tipos_deducciones",
    modelo_puente=RrhhNominaDeduccion,
    campo_puente="deduccion_id",
    dto_read=RrhhDeduccionRead,
    dto_listado=RrhhDeduccionListado,
)

BONIFICACION = ConfigMovimiento(
    etiqueta="bonificación",
    modelo=RrhhBonificacion,
    modelo_tipo=RrhhTipoBonificacion,
    pk="id_bonificaciones",
    campo_tipo="tipo_bonificaciones_id",
    pk_tipo="id_tipos_bonificaciones",
    modelo_puente=RrhhNominaBonificacion,
    campo_puente="bonificacion_id",
    dto_read=RrhhBonificacionRead,
    dto_listado=RrhhBonificacionListado,
)


class RrhhMovimientoService:
    """CRUD simétrico de deducciones y bonificaciones."""

    def __init__(self, config: ConfigMovimiento):
        self.cfg = config
        self.model_name = config.etiqueta.capitalize()

    # ── Validaciones ────────────────────────────────────────────────────────

    async def _verificar_empleado(self, db: AsyncSession, empleado_id: int) -> RrhhEmpleado:
        empleado = await db.get(RrhhEmpleado, empleado_id)
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado no existe")
        return empleado

    async def _verificar_tipo(self, db: AsyncSession, tipo_id: int):
        tipo = await db.get(self.cfg.modelo_tipo, tipo_id)
        if not tipo:
            raise HTTPException(status_code=404, detail="El tipo no existe")
        return tipo

    def _validar_periodo(self, inicio: date, fin: date) -> None:
        if fin < inicio:
            raise HTTPException(
                status_code=400,
                detail="El fin del periodo debe ser posterior o igual al inicio",
            )

    def _validar_valor(self, valor: Decimal, es_porcentaje: bool) -> None:
        if es_porcentaje and not validar_porcentaje(valor):
            raise HTTPException(
                status_code=400,
                detail="Un valor porcentual debe estar entre 0 y 100",
            )

    async def _verificar_solape(
        self,
        db: AsyncSession,
        empleado_id: int,
        tipo_id: int,
        inicio: date,
        fin: date,
        excluir_id: Optional[int] = None,
    ) -> None:
        """Rechaza periodos que crucen otro movimiento del mismo tipo."""
        statement = select(self.cfg.modelo).where(
            getattr(self.cfg.modelo, "empleados_id") == empleado_id,
            getattr(self.cfg.modelo, self.cfg.campo_tipo) == tipo_id,
        )
        if excluir_id is not None:
            statement = statement.where(
                getattr(self.cfg.modelo, self.cfg.pk) != excluir_id
            )
        result = await db.exec(statement)
        for existente in result.all():
            if periodos_solapan(inicio, fin, existente.inicio_periodo, existente.fin_periodo):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Ya existe una {self.cfg.etiqueta} de ese tipo para el empleado "
                        f"entre {existente.inicio_periodo} y {existente.fin_periodo}"
                    ),
                )

    async def _ya_aplicada(self, db: AsyncSession, id: int) -> bool:
        """Si el movimiento ya formó parte de alguna nómina."""
        result = await db.exec(
            select(func.count())
            .select_from(self.cfg.modelo_puente)
            .where(getattr(self.cfg.modelo_puente, self.cfg.campo_puente) == id)
        )
        return (result.one() or 0) > 0

    # ── Resolución en lote ──────────────────────────────────────────────────

    async def _resolucion_lote(self, db: AsyncSession, filas: List) -> dict:
        """Carga empleados, departamentos y tipos en lote (sin N+1)."""
        ids_empleado = {getattr(f, "empleados_id") for f in filas}
        ids_tipo = {getattr(f, self.cfg.campo_tipo) for f in filas}

        empleados: dict[int, RrhhEmpleado] = {}
        if ids_empleado:
            res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(ids_empleado)))
            empleados = {e.id: e for e in res.all()}

        depto_ids = {e.departamento_id for e in empleados.values() if e.departamento_id}
        departamentos: dict[int, str] = {}
        if depto_ids:
            res = await db.exec(
                select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                    RrhhDepartamento.id_departamento.in_(depto_ids)
                )
            )
            departamentos = {row[0]: row[1] for row in res.all()}

        tipos: dict[int, object] = {}
        if ids_tipo:
            res = await db.exec(
                select(self.cfg.modelo_tipo).where(
                    getattr(self.cfg.modelo_tipo, self.cfg.pk_tipo).in_(ids_tipo)
                )
            )
            tipos = {
                getattr(t, self.cfg.pk_tipo): t for t in res.all()
            }

        return {"empleados": empleados, "departamentos": departamentos, "tipos": tipos}

    def _construir_listado(self, fila, resolucion: dict) -> dict:
        """Combina el registro con sus nombres y el monto calculado."""
        empleado = resolucion["empleados"].get(getattr(fila, "empleados_id"))
        tipo = resolucion["tipos"].get(getattr(fila, self.cfg.campo_tipo))
        es_porcentaje = bool(tipo.es_porcentaje) if tipo else False
        salario = empleado.salario if empleado else None

        datos = {
            "empleado_id": fila.empleados_id,
            "valor": fila.valor,
            "inicio_periodo": fila.inicio_periodo,
            "fin_periodo": fila.fin_periodo,
            "observaciones": fila.observaciones,
            self.cfg.pk: getattr(fila, self.cfg.pk),
            self.cfg.campo_tipo: getattr(fila, self.cfg.campo_tipo),
            "empleado_codigo": empleado.codigo_empleado if empleado else None,
            "empleado_nombre": (
                f"{empleado.nombre} {empleado.apellido}".strip() if empleado else None
            ),
            "departamento_nombre": (
                resolucion["departamentos"].get(empleado.departamento_id)
                if empleado and empleado.departamento_id
                else None
            ),
            "tipo_nombre": tipo.nombre if tipo else None,
            "es_porcentaje": es_porcentaje,
            "salario": salario,
            "monto": monto_aplicado(fila.valor, es_porcentaje, salario),
            "created_at": fila.created_at,
            "updated_at": fila.updated_at,
        }
        return self.cfg.dto_listado.model_validate(datos)

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        empleado_id: Optional[int] = None,
        tipo_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        buscar: Optional[str] = None,
    ) -> List:
        statement = select(self.cfg.modelo)
        if empleado_id is not None:
            statement = statement.where(getattr(self.cfg.modelo, "empleados_id") == empleado_id)
        if tipo_id is not None:
            statement = statement.where(
                getattr(self.cfg.modelo, self.cfg.campo_tipo) == tipo_id
            )

        if desde is not None:
            statement = statement.where(getattr(self.cfg.modelo, "fin_periodo") >= desde)
        if hasta is not None:
            statement = statement.where(getattr(self.cfg.modelo, "inicio_periodo") <= hasta)

        if buscar:
            statement = statement.join(
                RrhhEmpleado, getattr(self.cfg.modelo, "empleados_id") == RrhhEmpleado.id
            )
            term = f"%{buscar.strip()}%"
            statement = statement.where(
                or_(
                    RrhhEmpleado.nombre.ilike(term),
                    RrhhEmpleado.apellido.ilike(term),
                    RrhhEmpleado.codigo_empleado.ilike(term),
                )
            )

        statement = statement.order_by(
            getattr(self.cfg.modelo, "inicio_periodo").desc(),
            getattr(self.cfg.modelo, self.cfg.pk),
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_lote(db, filas)
        return [self._construir_listado(f, resolucion) for f in filas]

    async def get(self, db: AsyncSession, id: int):
        fila = await db.get(self.cfg.modelo, id)
        if not fila:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrada")
        resolucion = await self._resolucion_lote(db, [fila])
        return self._construir_listado(fila, resolucion)

    def _construir_read(self, db_obj):
        """Construye el DTO de respuesta, renombrando `empleados_id`.

        El modelo usa `empleados_id` (nombre de la columna), pero el DTO
        expone `empleado_id` para ser coherente con el resto del módulo.
        """
        datos = db_obj.model_dump()
        datos["empleado_id"] = datos.pop("empleados_id")
        return self.cfg.dto_read.model_validate(datos)

    # ── Escritura ───────────────────────────────────────────────────────────

    async def create(
        self,
        db: AsyncSession,
        obj_in: RrhhDeduccionCreate | RrhhBonificacionCreate,
    ):
        data = obj_in.model_dump()
        await self._verificar_empleado(db, data["empleado_id"])
        tipo = await self._verificar_tipo(db, data[self.cfg.campo_tipo])

        self._validar_periodo(data["inicio_periodo"], data["fin_periodo"])
        self._validar_valor(data["valor"], tipo.es_porcentaje)
        await self._verificar_solape(
            db,
            data["empleado_id"],
            data[self.cfg.campo_tipo],
            data["inicio_periodo"],
            data["fin_periodo"],
        )

        # El DTO expone `empleado_id` (nomenclatura del módulo), pero la
        # columna de la tabla se llama `empleados_id`: hay que renombrarla.
        data["empleados_id"] = data.pop("empleado_id")

        db_obj = self.cfg.modelo(**data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self._construir_read(db_obj)

    async def update(
        self,
        db: AsyncSession,
        id: int,
        obj_in: RrhhDeduccionUpdate | RrhhBonificacionUpdate,
    ):
        db_obj = await db.get(self.cfg.modelo, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrada")

        data = obj_in.model_dump(exclude_unset=True)

        if self.cfg.campo_tipo in data:
            await self._verificar_tipo(db, data[self.cfg.campo_tipo])

        inicio = data.get("inicio_periodo", db_obj.inicio_periodo)
        fin = data.get("fin_periodo", db_obj.fin_periodo)
        self._validar_periodo(inicio, fin)

        tipo_id = data.get(self.cfg.campo_tipo, getattr(db_obj, self.cfg.campo_tipo))
        tipo = await self._verificar_tipo(db, tipo_id)
        valor = data.get("valor", db_obj.valor)
        self._validar_valor(valor, tipo.es_porcentaje)

        await self._verificar_solape(
            db,
            db_obj.empleados_id,
            tipo_id,
            inicio,
            fin,
            excluir_id=id,
        )

        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self._construir_read(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        db_obj = await db.get(self.cfg.modelo, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrada")

        if await self._ya_aplicada(db, id):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Esta {self.cfg.etiqueta} ya se aplicó a una nómina; "
                    "no se puede eliminar sin romper la trazabilidad"
                ),
            )

        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    # ── Vista consolidada ───────────────────────────────────────────────────

    async def consolidado(
        self,
        db: AsyncSession,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> RrhhConsolidado:
        """Totales por empleado de todo lo que cubre el rango pedido."""
        deducciones, conteos_d = await self._consolidar(db, DEDUCCION, desde, hasta)
        bonificaciones, conteos_b = await self._consolidar(db, BONIFICACION, desde, hasta)

        empleado_ids = set(deducciones) | set(bonificaciones)
        if empleado_ids:
            res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(empleado_ids)))
            empleados = {e.id: e for e in res.all()}
            depto_ids = {e.departamento_id for e in empleados.values() if e.departamento_id}
            departamentos: dict[int, str] = {}
            if depto_ids:
                res = await db.exec(
                    select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                        RrhhDepartamento.id_departamento.in_(depto_ids)
                    )
                )
                departamentos = {row[0]: row[1] for row in res.all()}
        else:
            empleados, departamentos = {}, {}

        filas = []
        total_deducciones = Decimal("0.00")
        total_bonificaciones = Decimal("0.00")

        for empleado_id in sorted(empleado_ids):
            empleado = empleados.get(empleado_id)
            total_d = deducciones.get(empleado_id, Decimal("0.00"))
            total_b = bonificaciones.get(empleado_id, Decimal("0.00"))
            total_deducciones += total_d
            total_bonificaciones += total_b
            filas.append(
                RrhhConsolidadoEmpleado(
                    empleado_id=empleado_id,
                    empleado_codigo=empleado.codigo_empleado if empleado else None,
                    empleado_nombre=(
                        f"{empleado.nombre} {empleado.apellido}".strip()
                        if empleado
                        else f"Empleado #{empleado_id}"
                    ),
                    departamento_nombre=(
                        departamentos.get(empleado.departamento_id)
                        if empleado and empleado.departamento_id
                        else None
                    ),
                    salario=empleado.salario if empleado else None,
                    total_deducciones=total_d,
                    total_bonificaciones=total_b,
                    saldo=calcular_saldo(total_b, total_d),
                    cantidad_deducciones=conteos_d.get(empleado_id, 0),
                    cantidad_bonificaciones=conteos_b.get(empleado_id, 0),
                )
            )

        return RrhhConsolidado(
            desde=desde,
            hasta=hasta,
            total_deducciones=total_deducciones,
            total_bonificaciones=total_bonificaciones,
            saldo=calcular_saldo(total_bonificaciones, total_deducciones),
            cantidad_empleados=len(filas),
            empleados=filas,
        )

    async def _consolidar(
        self,
        db: AsyncSession,
        config: ConfigMovimiento,
        desde: Optional[date],
        hasta: Optional[date],
    ) -> tuple[dict, dict]:
        """Suma y cuenta, por empleado, los movimientos que cubren el rango."""
        statement = select(config.modelo)
        if desde is not None:
            statement = statement.where(getattr(config.modelo, "fin_periodo") >= desde)
        if hasta is not None:
            statement = statement.where(getattr(config.modelo, "inicio_periodo") <= hasta)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return {}, {}

        ids_empleado = {f.empleados_id for f in filas}
        res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(ids_empleado)))
        empleados = {e.id: e for e in res.all()}

        ids_tipo = {getattr(f, config.campo_tipo) for f in filas}
        res = await db.exec(
            select(config.modelo_tipo).where(
                getattr(config.modelo_tipo, config.pk_tipo).in_(ids_tipo)
            )
        )
        tipos = {getattr(t, config.pk_tipo): t for t in res.all()}

        totales: dict[int, Decimal] = {}
        conteos: dict[int, int] = {}
        for fila in filas:
            empleado = empleados.get(fila.empleados_id)
            tipo = tipos.get(getattr(fila, config.campo_tipo))
            es_porcentaje = bool(tipo.es_porcentaje) if tipo else False
            monto = monto_aplicado(
                fila.valor, es_porcentaje, empleado.salario if empleado else None
            )
            totales[fila.empleados_id] = totales.get(fila.empleados_id, Decimal("0.00")) + monto
            conteos[fila.empleados_id] = conteos.get(fila.empleados_id, 0) + 1
        return totales, conteos


rrhh_deduccion_service = RrhhMovimientoService(DEDUCCION)
rrhh_bonificacion_service = RrhhMovimientoService(BONIFICACION)

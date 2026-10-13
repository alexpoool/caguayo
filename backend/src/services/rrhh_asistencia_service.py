"""Servicio del submódulo RRHH — Asistencia (Fase 4).

Reglas de negocio de esta fase:
- `UNIQUE (empleado_id, fecha)`: un empleado solo tiene una marcación por día.
  El alta y la corrección son la misma operación (`crear_o_actualizar`).
- La marcación rápida de entrada/salida detecta si es el primer registro del
  día (entrada) o el segundo (salida) y actualiza el campo correspondiente.
- El empleado con `tipo_asistencia='LIBRE'` no tiene horario pactado, así que
  no se le calcula tardanza ni horas extras.
- El estado se deriva de la hora de entrada (`tardanza` si llegó tarde),
  salvo que se envíe uno explícito.
- Los cálculos (tardanza, horas trabajadas y extras) se derivan del horario
  del empleado y **no se persisten**: se recalculan al leer.
- Solo se puede marcar asistencia de empleados `activo=True`.
"""

from datetime import date, datetime, time
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_asistencia_calc import (
    ESTADOS_ASISTENCIA,
    calcular_horas_extras,
    calcular_horas_trabajadas,
    calcular_tardanza,
    estado_derivado,
    validar_marcacion,
)
from src.dto import (
    RrhhAsistenciaCreate,
    RrhhAsistenciaUpdate,
    RrhhAsistenciaRead,
    RrhhAsistenciaListado,
    RrhhAsistenciaMarcacion,
    RrhhAsistenciaResumenDia,
)
from src.models import RrhhAsistencia, RrhhEmpleado, RrhhDepartamento


class RrhhAsistenciaService:
    model_name = "Asistencia"

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
                detail="El empleado está inactivo; no se le puede registrar asistencia",
            )
        return empleado

    async def _buscar_marcacion(
        self, db: AsyncSession, empleado_id: int, fecha: date
    ) -> Optional[RrhhAsistencia]:
        result = await db.exec(
            select(RrhhAsistencia).where(
                RrhhAsistencia.empleado_id == empleado_id,
                RrhhAsistencia.fecha == fecha,
            )
        )
        return result.first()

    def _validar(
        self,
        estado: str,
        hora_entrada: Optional[time],
        hora_salida: Optional[time],
    ) -> None:
        error = validar_marcacion(estado, hora_entrada, hora_salida)
        if error:
            raise HTTPException(status_code=400, detail=error)

    def _validar_estado(self, estado: str) -> None:
        if estado not in ESTADOS_ASISTENCIA:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_ASISTENCIA)}",
            )

    # ── Construcción del listado ────────────────────────────────────────────

    def _construir_listado(
        self,
        asistencia: RrhhAsistencia,
        empleado: RrhhEmpleado,
        departamento_nombre: Optional[str],
    ) -> RrhhAsistenciaListado:
        """Aplica los cálculos derivados del horario del empleado.

        El empleado con asistencia LIBRE no tiene horario pactado, así que
        tardanza y extras quedan en 0.
        """
        horario_inicio = empleado.horario_inicio
        horario_final = empleado.horario_final
        horas_pactadas = (
            None if empleado.tipo_asistencia == "LIBRE" else empleado.horas_a_trabajar
        )

        return RrhhAsistenciaListado(
            **RrhhAsistenciaRead.model_validate(asistencia).model_dump(),
            empleado_codigo=empleado.codigo_empleado,
            empleado_nombre=f"{empleado.nombre} {empleado.apellido}".strip(),
            departamento_nombre=departamento_nombre,
            horario_inicio=horario_inicio,
            horario_final=horario_final,
            tardanza_minutos=calcular_tardanza(asistencia.hora_entrada, horario_inicio),
            horas_trabajadas_minutos=calcular_horas_trabajadas(
                asistencia.hora_entrada, asistencia.hora_salida
            ),
            horas_extras_minutos=calcular_horas_extras(
                asistencia.hora_entrada, asistencia.hora_salida, horas_pactadas
            ),
        )

    async def _resolucion_lote(
        self, db: AsyncSession, asistencias: List[RrhhAsistencia]
    ) -> dict:
        """Carga empleados y departamentos en lote (3 consultas fijas, no N+1)."""
        empleado_ids = {a.empleado_id for a in asistencias}
        empleados: dict[int, RrhhEmpleado] = {}
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

        return {"empleados": empleados, "departamentos": departamentos}

    # ── Lectura ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        empleado_id: Optional[int] = None,
        departamento_id: Optional[int] = None,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        estado: Optional[str] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhAsistenciaListado]:
        if estado is not None:
            self._validar_estado(estado)

        statement = select(RrhhAsistencia)
        if empleado_id is not None:
            statement = statement.where(RrhhAsistencia.empleado_id == empleado_id)
        if desde is not None:
            statement = statement.where(RrhhAsistencia.fecha >= desde)
        if hasta is not None:
            statement = statement.where(RrhhAsistencia.fecha <= hasta)
        if estado is not None:
            statement = statement.where(RrhhAsistencia.estado == estado)

        # Filtro por departamento o por texto pasa por la tabla de empleados.
        if departamento_id is not None or buscar:
            statement = statement.join(RrhhEmpleado, RrhhAsistencia.empleado_id == RrhhEmpleado.id)
            if departamento_id is not None:
                statement = statement.where(RrhhEmpleado.departamento_id == departamento_id)
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
            RrhhAsistencia.fecha.desc(), RrhhAsistencia.id
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_lote(db, filas)
        empleados = resolucion["empleados"]
        departamentos = resolucion["departamentos"]

        salidas = []
        for asistencia in filas:
            empleado = empleados.get(asistencia.empleado_id)
            if not empleado:
                continue
            nombre_depto = departamentos.get(empleado.departamento_id)
            salidas.append(self._construir_listado(asistencia, empleado, nombre_depto))
        return salidas

    async def get(self, db: AsyncSession, id: int) -> RrhhAsistenciaListado:
        asistencia = await db.get(RrhhAsistencia, id)
        if not asistencia:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        empleado = await self._verificar_empleado(db, asistencia.empleado_id, solo_activo=False)
        nombre_depto = None
        if empleado.departamento_id:
            departamento = await db.get(RrhhDepartamento, empleado.departamento_id)
            nombre_depto = departamento.nombre if departamento else None
        return self._construir_listado(asistencia, empleado, nombre_depto)

    # ── Escritura ───────────────────────────────────────────────────────────

    async def crear_o_actualizar(
        self, db: AsyncSession, obj_in: RrhhAsistenciaCreate
    ) -> RrhhAsistenciaRead:
        """Alta o corrección: la BD ya garantiza una marcación por día."""
        empleado = await self._verificar_empleado(db, obj_in.empleado_id)
        estado = obj_in.estado

        # Si no se envía estado, se deriva de la hora de entrada.
        if not obj_in.estado or obj_in.estado == "ausente":
            estado = estado_derivado(obj_in.hora_entrada, empleado.horario_inicio)

        self._validar(estado, obj_in.hora_entrada, obj_in.hora_salida)

        existente = await self._buscar_marcacion(db, obj_in.empleado_id, obj_in.fecha)
        if existente:
            existente.hora_entrada = obj_in.hora_entrada
            existente.hora_salida = obj_in.hora_salida
            existente.estado = estado
            existente.observaciones = obj_in.observaciones
            db.add(existente)
            await db.commit()
            await db.refresh(existente)
            return RrhhAsistenciaRead.model_validate(existente)

        nueva = RrhhAsistencia(
            empleado_id=obj_in.empleado_id,
            fecha=obj_in.fecha,
            hora_entrada=obj_in.hora_entrada,
            hora_salida=obj_in.hora_salida,
            estado=estado,
            observaciones=obj_in.observaciones,
        )
        db.add(nueva)
        await db.commit()
        await db.refresh(nueva)
        return RrhhAsistenciaRead.model_validate(nueva)

    async def marcar(
        self, db: AsyncSession, obj_in: RrhhAsistenciaMarcacion
    ) -> RrhhAsistenciaRead:
        """Marcación rápida: registra entrada o salida según el momento."""
        empleado = await self._verificar_empleado(db, obj_in.empleado_id)
        fecha = obj_in.fecha or date.today()
        hora = obj_in.hora or datetime.now().time().replace(microsecond=0)

        existente = await self._buscar_marcacion(db, obj_in.empleado_id, fecha)

        if existente is None:
            # Primer registro del día: es la entrada.
            estado = estado_derivado(hora, empleado.horario_inicio)
            nueva = RrhhAsistencia(
                empleado_id=obj_in.empleado_id,
                fecha=fecha,
                hora_entrada=hora,
                hora_salida=None,
                estado=estado,
                observaciones=obj_in.observaciones,
            )
            db.add(nueva)
            await db.commit()
            await db.refresh(nueva)
            return RrhhAsistenciaRead.model_validate(nueva)

        if existente.hora_salida is None:
            # Segundo registro: es la salida.
            if hora <= existente.hora_entrada:
                raise HTTPException(
                    status_code=400,
                    detail="La hora de salida debe ser posterior a la de entrada",
                )
            existente.hora_salida = hora
            db.add(existente)
            await db.commit()
            await db.refresh(existente)
            return RrhhAsistenciaRead.model_validate(existente)

        raise HTTPException(
            status_code=409,
            detail="El empleado ya tiene la entrada y la salida registradas para ese día",
        )

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhAsistenciaUpdate
    ) -> RrhhAsistenciaRead:
        db_obj = await db.get(RrhhAsistencia, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")

        empleado = await self._verificar_empleado(db, db_obj.empleado_id, solo_activo=False)
        data = obj_in.model_dump(exclude_unset=True)

        estado = data.get("estado", db_obj.estado)
        entrada = data.get("hora_entrada", db_obj.hora_entrada)
        salida = data.get("hora_salida", db_obj.hora_salida)
        self._validar(estado, entrada, salida)

        # Reevaluar la tardanza si cambia la hora de entrada.
        if "hora_entrada" in data and estado in ("presente", "tardanza"):
            data["estado"] = estado_derivado(entrada, empleado.horario_inicio)

        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhAsistenciaRead.model_validate(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        db_obj = await db.get(RrhhAsistencia, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    # ── Reporte del día ─────────────────────────────────────────────────────

    async def resumen_dia(
        self,
        db: AsyncSession,
        fecha: date,
        departamento_id: Optional[int] = None,
    ) -> RrhhAsistenciaResumenDia:
        """Conteo de asistencias por estado para una fecha."""
        statement = select(RrhhAsistencia.estado, func.count()).where(
            RrhhAsistencia.fecha == fecha
        )

        if departamento_id is not None:
            statement = statement.join(
                RrhhEmpleado, RrhhAsistencia.empleado_id == RrhhEmpleado.id
            ).where(RrhhEmpleado.departamento_id == departamento_id)

        statement = statement.group_by(RrhhAsistencia.estado)
        result = await db.exec(statement)
        conteos = {row[0]: row[1] for row in result.all()}

        # Tardanzas y extras se suman desde el listado (cálculo derivado).
        total_tardanza = 0
        total_extras = 0
        if conteos.get("tardanza") or conteos.get("presente"):
            marcaciones = await self.listar(
                db, limit=1000, desde=fecha, hasta=fecha, departamento_id=departamento_id
            )
            for m in marcaciones:
                total_tardanza += m.tardanza_minutos
                total_extras += m.horas_extras_minutos

        return RrhhAsistenciaResumenDia(
            fecha=fecha,
            total_empleados=sum(conteos.values()),
            presentes=conteos.get("presente", 0),
            ausentes=conteos.get("ausente", 0),
            tardanzas=conteos.get("tardanza", 0),
            permisos=conteos.get("permiso", 0),
            vacaciones=conteos.get("vacaciones", 0),
            feriados=conteos.get("feriado", 0),
            incapacidades=conteos.get("incapacidad", 0),
            total_tardanza_minutos=total_tardanza,
            total_horas_extras_minutos=total_extras,
        )


rrhh_asistencia_service = RrhhAsistenciaService()

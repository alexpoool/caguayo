"""Servicio del submódulo RRHH — Solicitudes de vacaciones y permisos (Fase 7).

Reglas de negocio de esta fase:

- **Ciclo de vida**: `pendiente → aprobada | rechazada | cancelada`, y los
  tres destinos son estados finales (no se puede reabrir una decisión).
- **Solapamiento**: al crear y **otra vez al aprobar** se comprueba que el
  rango no se cruce con una solicitud ya `aprobada` del mismo empleado. Solo
  las aprobadas bloquean: una pendiente puede ser rechazada y liberar los
  días. Revalidar en la aprobación es el guardia final, porque entre el alta
  y la decisión pudo aprobarse otra.
- **Decisión**: al aprobar se guarda `aprobado_por` + `fecha_aprobacion`. Al
  rechazar se usa esa misma pareja de columnas para registrar quién decidió y
  cuándo. Al cancelar solo se marca `cancelada`.
- **Aprobación → asistencia**: aprobar un permiso o unas vacaciones escribe
  (o sobrescribe) la marcación de cada día del rango como `permiso` o
  `vacaciones`, sin horas, en la misma transacción. Así la fase 4 muestra la
  ausencia sin que haya que corregirla a mano.
- **Sin autenticación en backend** (decisión del módulo; deuda Fase 10): las
  acciones llevan el `empleado_id` de quien las ejecuta en el payload. Se
  impide la **autaprobación** (quien solicita no aprueba su propia solicitud),
  y lo demás (que solo el supervisor o RRHH aprueben) se controla en el
  frontend con RBAC.
- El **hook `notificar()`** escribe en la tabla `log`; hoy el canal es log y
  queda listo para sustituirse por email/in-app (fuera de alcance).
"""

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.domain.rrhh_solicitud_calc import (
    ESTADOS_SOLICITUD,
    TIPOS_SOLICITUD,
    buscar_solapamiento,
    dias_solicitados,
    puede_transicionar,
    validar_fechas,
)
from src.dto import (
    RrhhSolicitudCreate,
    RrhhSolicitudAccion,
    RrhhSolicitudListado,
    RrhhSolicitudCalendario,
    RrhhSolicitudResumenEstado,
)
from src.models import (
    RrhhAsistencia,
    RrhhSolicitud,
    RrhhEmpleado,
    RrhhDepartamento,
    LogEntry,
)

CERO = 0


class RrhhSolicitudService:
    model_name = "Solicitud"

    # ── Hook de notificación ────────────────────────────────────────────────

    async def notificar(
        self,
        db: AsyncSession,
        *,
        mensaje: str,
        detalle: str = "",
        nivel: str = "INFO",
    ) -> None:
        """Hook de notificación (Fase 7).

        Deja el evento en la tabla `log` **dentro de la misma transacción**
        (sin commit propio), de modo que si la operación falla no queda la
        notificación huérfana. El destinatario (aprobador o solicitante) viaja
        en `usuario_nombre`/`detalle` para que la pantalla de auditoría pueda
        filtrarla. Aquí no hay envío de email: eso queda fuera de alcance y
        este es el punto de extensión cuando exista un canal real.
        """
        db.add(
            LogEntry(
                nivel=nivel,
                tipo="SOLICITUD",
                mensaje=mensaje[:500],
                detalle=detalle[:2000] if detalle else None,
                status_code=200,
            )
        )

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
                detail="El empleado está inactivo; no se le puede crear una solicitud",
            )
        return empleado

    def _validar_rango(self, fecha_inicio: date, fecha_fin: date) -> None:
        error = validar_fechas(fecha_inicio, fecha_fin)
        if error:
            raise HTTPException(status_code=400, detail=error)

    async def _aprobadas_del_empleado(
        self, db: AsyncSession, empleado_id: int
    ) -> List[RrhhSolicitud]:
        result = await db.exec(
            select(RrhhSolicitud).where(
                RrhhSolicitud.empleado_id == empleado_id,
                RrhhSolicitud.estado == "aprobada",
            )
        )
        return list(result.all())

    async def _validar_sin_solapamiento(
        self,
        db: AsyncSession,
        empleado_id: int,
        fecha_inicio: date,
        fecha_fin: date,
        excluir_id: Optional[int] = None,
    ) -> None:
        """Bloquea si el rango choca con otra solicitud ya aprobada."""
        aprobadas = await self._aprobadas_del_empleado(db, empleado_id)
        choque = buscar_solapamiento(
            fecha_inicio, fecha_fin, aprobadas, excluir_id=excluir_id
        )
        if choque:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"El rango se solapa con la solicitud #{choque.id} "
                    f"({choque.fecha_inicio} a {choque.fecha_fin}), ya aprobada"
                ),
            )

    async def _aplicar_en_asistencia(
        self, db: AsyncSession, solicitud: RrhhSolicitud
    ) -> None:
        """Refleja la solicitud aprobada en la asistencia de cada día del rango.

        El tipo de la solicitud coincide con el estado de asistencia
        (`permiso` o `vacaciones`). Cada día se escribe sin horas y el permiso
        aprobado manda: si el día ya tenía marcación (entrada/salida), se
        sobrescribe, porque el periodo aprobado justifica la ausencia. Se
        ejecuta dentro de la transacción de la aprobación.
        """
        estado = solicitud.tipo
        observaciones = f"Solicitud #{solicitud.id} ({estado}) aprobada"
        dia = solicitud.fecha_inicio
        while dia <= solicitud.fecha_fin:
            marcacion = (
                await db.exec(
                    select(RrhhAsistencia).where(
                        RrhhAsistencia.empleado_id == solicitud.empleado_id,
                        RrhhAsistencia.fecha == dia,
                    )
                )
            ).first()
            if marcacion is None:
                db.add(
                    RrhhAsistencia(
                        empleado_id=solicitud.empleado_id,
                        fecha=dia,
                        estado=estado,
                        observaciones=observaciones,
                    )
                )
            else:
                marcacion.estado = estado
                marcacion.hora_entrada = None
                marcacion.hora_salida = None
                marcacion.observaciones = observaciones
                marcacion.updated_at = datetime.now()
                db.add(marcacion)
            dia += timedelta(days=1)

    def _validar_estado(self, estado: str) -> None:
        if estado not in ESTADOS_SOLICITUD:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_SOLICITUD)}",
            )

    async def _buscar_o_404(self, db: AsyncSession, id: int) -> RrhhSolicitud:
        solicitud = await db.get(RrhhSolicitud, id)
        if not solicitud:
            raise HTTPException(
                status_code=404, detail=f"{self.model_name} no encontrada"
            )
        return solicitud

    # ── Construcción del listado ────────────────────────────────────────────

    @staticmethod
    def _nombre_completo(empleado: Optional[RrhhEmpleado]) -> Optional[str]:
        if not empleado:
            return None
        return f"{empleado.nombre} {empleado.apellido}".strip()

    async def _resolucion_lote(
        self, db: AsyncSession, solicitudes: List[RrhhSolicitud]
    ) -> dict:
        """Carga solicitantes, decidores, supervisores y departamentos en lote.

        Cuatro consultas fijas sin importar cuántas filas haya (sin N+1).
        """
        ids: set = set()
        for s in solicitudes:
            ids.add(s.empleado_id)
            if s.aprobado_por:
                ids.add(s.aprobado_por)

        empleados: dict[int, RrhhEmpleado] = {}
        if ids:
            res = await db.exec(select(RrhhEmpleado).where(RrhhEmpleado.id.in_(ids)))
            empleados = {e.id: e for e in res.all()}

        # Los supervisores también hacen falta (para precargar quién aprueba).
        supervisor_ids = {
            e.supervisor for e in empleados.values() if e.supervisor
        }
        if supervisor_ids:
            res = await db.exec(
                select(RrhhEmpleado).where(RrhhEmpleado.id.in_(supervisor_ids))
            )
            empleados.update({e.id: e for e in res.all()})

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

    def _construir_listado(
        self, solicitud: RrhhSolicitud, resolucion: dict
    ) -> RrhhSolicitudListado:
        empleados = resolucion["empleados"]
        solicitante = empleados.get(solicitud.empleado_id)
        decisor = empleados.get(solicitud.aprobado_por) if solicitud.aprobado_por else None
        supervisor = (
            empleados.get(solicitante.supervisor)
            if solicitante and solicitante.supervisor
            else None
        )
        nombre_depto = None
        if solicitante and solicitante.departamento_id:
            nombre_depto = resolucion["departamentos"].get(solicitante.departamento_id)

        return RrhhSolicitudListado(
            **RrhhSolicitud.model_validate(
                solicitud, from_attributes=True
            ).model_dump(),
            empleado_codigo=solicitante.codigo_empleado if solicitante else None,
            empleado_nombre=self._nombre_completo(solicitante),
            departamento_nombre=nombre_depto,
            aprobador_nombre=self._nombre_completo(decisor),
            supervisor_id=(
                solicitante.supervisor
                if solicitante and solicitante.supervisor
                else None
            ),
            supervisor_nombre=self._nombre_completo(supervisor),
            dias=dias_solicitados(solicitud.fecha_inicio, solicitud.fecha_fin),
        )

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
    ) -> List[RrhhSolicitudListado]:
        if estado is not None:
            self._validar_estado(estado)
        if tipo is not None and tipo not in TIPOS_SOLICITUD:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo inválido. Debe ser uno de: {', '.join(TIPOS_SOLICITUD)}",
            )

        statement = select(RrhhSolicitud)
        if empleado_id is not None:
            statement = statement.where(RrhhSolicitud.empleado_id == empleado_id)
        if estado is not None:
            statement = statement.where(RrhhSolicitud.estado == estado)
        if tipo is not None:
            statement = statement.where(RrhhSolicitud.tipo == tipo)
        # Se solapa con el rango consultado si empieza antes de cerrar y
        # termina después de abrir.
        if desde is not None:
            statement = statement.where(RrhhSolicitud.fecha_fin >= desde)
        if hasta is not None:
            statement = statement.where(RrhhSolicitud.fecha_inicio <= hasta)

        if departamento_id is not None or buscar:
            statement = statement.join(
                RrhhEmpleado, RrhhSolicitud.empleado_id == RrhhEmpleado.id
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
            RrhhSolicitud.fecha_inicio.desc(), RrhhSolicitud.id.desc()
        ).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_lote(db, filas)
        return [self._construir_listado(s, resolucion) for s in filas]

    async def get(self, db: AsyncSession, id: int) -> RrhhSolicitudListado:
        solicitud = await self._buscar_o_404(db, id)
        resolucion = await self._resolucion_lote(db, [solicitud])
        return self._construir_listado(solicitud, resolucion)

    async def resumen_estados(
        self, db: AsyncSession, empleado_id: Optional[int] = None
    ) -> List[RrhhSolicitudResumenEstado]:
        """Conteo de solicitudes por estado (para pestañas/contadores)."""
        statement = (
            select(RrhhSolicitud.estado, func.count().label("cantidad"))
            .group_by(RrhhSolicitud.estado)
        )
        if empleado_id is not None:
            statement = statement.where(RrhhSolicitud.empleado_id == empleado_id)
        result = await db.exec(statement)
        conteo = {row[0]: row[1] for row in result.all()}
        return [
            RrhhSolicitudResumenEstado(estado=estado, cantidad=conteo.get(estado, CERO))
            for estado in ESTADOS_SOLICITUD
        ]

    # ── Alta ────────────────────────────────────────────────────────────────

    async def crear(self, db: AsyncSession, obj_in: RrhhSolicitudCreate) -> RrhhSolicitudListado:
        """Crea una solicitud `pendiente` tras validar fechas y solapamiento."""
        empleado = await self._verificar_empleado(db, obj_in.empleado_id)
        self._validar_rango(obj_in.fecha_inicio, obj_in.fecha_fin)
        await self._validar_sin_solapamiento(
            db, obj_in.empleado_id, obj_in.fecha_inicio, obj_in.fecha_fin
        )

        solicitud = RrhhSolicitud(
            empleado_id=obj_in.empleado_id,
            tipo=obj_in.tipo,
            fecha_inicio=obj_in.fecha_inicio,
            fecha_fin=obj_in.fecha_fin,
            motivo=obj_in.motivo,
            estado="pendiente",
        )
        db.add(solicitud)
        await db.flush()

        await self.notificar(
            db,
            mensaje=(
                f"Solicitud #{solicitud.id} ({solicitud.tipo}) de "
                f"{self._nombre_completo(empleado)} pendiente de aprobación"
            ),
            detalle=(
                f"empleado_id={solicitud.empleado_id}; periodo="
                f"{solicitud.fecha_inicio} a {solicitud.fecha_fin}; "
                f"motivo={solicitud.motivo or 'sin motivo'}"
            ),
        )
        await db.commit()
        await db.refresh(solicitud)

        resolucion = await self._resolucion_lote(db, [solicitud])
        return self._construir_listado(solicitud, resolucion)

    # ── Decisiones ──────────────────────────────────────────────────────────

    async def aprobar(
        self, db: AsyncSession, id: int, accion: RrhhSolicitudAccion
    ) -> RrhhSolicitudListado:
        """Aprueba una solicitud pendiente: congela el decisor y la fecha."""
        solicitud = await self._buscar_o_404(db, id)
        if not puede_transicionar(solicitud.estado, "aprobada"):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"La solicitud está '{solicitud.estado}'; solo se puede "
                    "aprobar una solicitud pendiente"
                ),
            )
        decisor = await self._verificar_empleado(db, accion.empleado_id)
        if decisor.id == solicitud.empleado_id:
            raise HTTPException(
                status_code=403,
                detail="No puedes aprobar tu propia solicitud",
            )
        # Revalida aquí, al momento de decidir: entre el alta y la aprobación
        # pudo aprobarse otra para los mismos días.
        await self._validar_sin_solapamiento(
            db,
            solicitud.empleado_id,
            solicitud.fecha_inicio,
            solicitud.fecha_fin,
            excluir_id=solicitud.id,
        )

        solicitud.estado = "aprobada"
        solicitud.aprobado_por = decisor.id
        solicitud.fecha_aprobacion = datetime.now()
        solicitud.observaciones = accion.observaciones
        solicitud.updated_at = datetime.now()
        db.add(solicitud)

        solicitante = await self._verificar_empleado(
            db, solicitud.empleado_id, solo_activo=False
        )
        # La aprobación del permiso/vacaciones queda reflejada en la asistencia
        # de todos los días del periodo (misma transacción).
        await self._aplicar_en_asistencia(db, solicitud)
        await self.notificar(
            db,
            mensaje=(
                f"Solicitud #{solicitud.id} aprobada por "
                f"{self._nombre_completo(decisor)}"
            ),
            detalle=(
                f"solicitante={self._nombre_completo(solicitante)}; periodo="
                f"{solicitud.fecha_inicio} a {solicitud.fecha_fin}; "
                f"observaciones={solicitud.observaciones or 'sin observaciones'}"
            ),
        )
        await db.commit()
        await db.refresh(solicitud)

        resolucion = await self._resolucion_lote(db, [solicitud])
        return self._construir_listado(solicitud, resolucion)

    async def rechazar(
        self, db: AsyncSession, id: int, accion: RrhhSolicitudAccion
    ) -> RrhhSolicitudListado:
        """Rechaza una solicitud pendiente y registra quién decidió y cuándo."""
        solicitud = await self._buscar_o_404(db, id)
        if not puede_transicionar(solicitud.estado, "rechazada"):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"La solicitud está '{solicitud.estado}'; solo se puede "
                    "rechazar una solicitud pendiente"
                ),
            )
        decisor = await self._verificar_empleado(db, accion.empleado_id)
        if decisor.id == solicitud.empleado_id:
            raise HTTPException(
                status_code=403,
                detail="No puedes rechazar tu propia solicitud",
            )

        solicitud.estado = "rechazada"
        solicitud.aprobado_por = decisor.id
        solicitud.fecha_aprobacion = datetime.now()
        solicitud.observaciones = accion.observaciones
        solicitud.updated_at = datetime.now()
        db.add(solicitud)

        await self.notificar(
            db,
            mensaje=(
                f"Solicitud #{solicitud.id} rechazada por "
                f"{self._nombre_completo(decisor)}"
            ),
            detalle=(
                f"empleado_id={solicitud.empleado_id}; periodo="
                f"{solicitud.fecha_inicio} a {solicitud.fecha_fin}; "
                f"motivo={solicitud.motivo or 'sin motivo'}"
            ),
            nivel="WARNING",
        )
        await db.commit()
        await db.refresh(solicitud)

        resolucion = await self._resolucion_lote(db, [solicitud])
        return self._construir_listado(solicitud, resolucion)

    async def cancelar(
        self, db: AsyncSession, id: int, accion: RrhhSolicitudAccion
    ) -> RrhhSolicitudListado:
        """Cancela una solicitud propia mientras siga `pendiente`."""
        solicitud = await self._buscar_o_404(db, id)
        if not puede_transicionar(solicitud.estado, "cancelada"):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"La solicitud está '{solicitud.estado}'; solo se puede "
                    "cancelar una solicitud pendiente"
                ),
            )
        cancelador = await self._verificar_empleado(
            db, accion.empleado_id, solo_activo=False
        )

        solicitud.estado = "cancelada"
        solicitud.observaciones = accion.observaciones or solicitud.observaciones
        solicitud.updated_at = datetime.now()
        db.add(solicitud)

        await self.notificar(
            db,
            mensaje=(
                f"Solicitud #{solicitud.id} cancelada por "
                f"{self._nombre_completo(cancelador)}"
            ),
            detalle=(
                f"empleado_id={solicitud.empleado_id}; periodo="
                f"{solicitud.fecha_inicio} a {solicitud.fecha_fin}"
            ),
            nivel="WARNING",
        )
        await db.commit()
        await db.refresh(solicitud)

        resolucion = await self._resolucion_lote(db, [solicitud])
        return self._construir_listado(solicitud, resolucion)

    # ── Calendario ──────────────────────────────────────────────────────────

    async def calendario(
        self,
        db: AsyncSession,
        desde: date,
        hasta: date,
        departamento_id: Optional[int] = None,
        empleado_id: Optional[int] = None,
    ) -> List[RrhhSolicitudCalendario]:
        """Ausencias (`aprobadas` y `pendientes`) que tocan el rango.

        El calendario sirve para ver quién no estará: las aprobadas son
        firmes y las pendientes se muestran como tentativas (distinguidas por
        `estado`). Las rechazadas y canceladas no ocupan días, así que se
        excluyen.
        """
        if hasta < desde:
            raise HTTPException(status_code=400, detail="El fin debe ser >= al inicio")

        statement = (
            select(RrhhSolicitud)
            .where(
                RrhhSolicitud.estado.in_(("aprobada", "pendiente")),
                RrhhSolicitud.fecha_fin >= desde,
                RrhhSolicitud.fecha_inicio <= hasta,
            )
        )
        if empleado_id is not None:
            statement = statement.where(RrhhSolicitud.empleado_id == empleado_id)
        if departamento_id is not None:
            statement = statement.join(
                RrhhEmpleado, RrhhSolicitud.empleado_id == RrhhEmpleado.id
            ).where(RrhhEmpleado.departamento_id == departamento_id)

        statement = statement.order_by(RrhhSolicitud.fecha_inicio, RrhhSolicitud.id)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        resolucion = await self._resolucion_lote(db, filas)
        salida = []
        for solicitud in filas:
            solicitante = resolucion["empleados"].get(solicitud.empleado_id)
            nombre_depto = None
            if solicitante and solicitante.departamento_id:
                nombre_depto = resolucion["departamentos"].get(
                    solicitante.departamento_id
                )
            salida.append(
                RrhhSolicitudCalendario(
                    id=solicitud.id,
                    empleado_id=solicitud.empleado_id,
                    empleado_nombre=self._nombre_completo(solicitante),
                    departamento_nombre=nombre_depto,
                    tipo=solicitud.tipo,
                    estado=solicitud.estado,
                    fecha_inicio=solicitud.fecha_inicio,
                    fecha_fin=solicitud.fecha_fin,
                    dias=dias_solicitados(
                        solicitud.fecha_inicio, solicitud.fecha_fin
                    ),
                    motivo=solicitud.motivo,
                )
            )
        return salida


rrhh_solicitud_service = RrhhSolicitudService()

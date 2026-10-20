"""Servicio del submódulo RRHH — Empleados (Fase 3).

Reglas de negocio de esta fase:
- `codigo_empleado` lo genera la BD (`'EMP-' || nextval('empleado_codigo_seq')`);
  no se acepta en el alta ni se puede editar.
- `carnet_identidad` y `correo` únicos (también lo garantizan los índices).
- Las asignaciones (puesto, departamento, tipo de contrato, supervisor) deben
  existir; el supervisor no puede ser el propio empleado.
- `estado` restringido a los valores del CHECK de BD.
- El horario exige `horario_final > horario_inicio`.
- Baja lógica (`activo=False`) si el empleado es supervisor de alguien o
  es responsable de un departamento; si no, borrado físico.
- El usuario del sistema se relaciona cruzando `usuarios.ci` con
  `empleados.carnet_identidad` (decisión de Fase 0).
"""

from datetime import date
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto import (
    ORDENES_LISTADO,
    RrhhEmpleadoCreate,
    RrhhEmpleadoUpdate,
    RrhhEmpleadoRead,
    RrhhEmpleadoListado,
    RrhhEmpleadoDetalle,
    RrhhEmpleadoBusqueda,
    ESTADOS_EMPLEADO,
    TIPOS_ASISTENCIA,
)
from src.models import (
    RrhhEmpleado,
    RrhhDepartamento,
    RrhhPuesto,
    RrhhTipoContrato,
    RrhhAsistencia,
)
from src.models.rrhh_deducciones import RrhhDeduccion, RrhhBonificacion
from src.models.rrhh_nomina import RrhhNominaEmpleado
from src.models.rrhh_solicitud import RrhhSolicitud
from src.models.rrhh_evaluacion import RrhhEvaluacion
from src.models.usuarios import Usuario


class RrhhEmpleadoService:
    model_name = "Empleado"

    # ── Validaciones ────────────────────────────────────────────────────────

    async def _verificar_puesto(
        self, db: AsyncSession, puesto_id: Optional[int]
    ) -> None:
        if puesto_id is None:
            return
        if not await db.get(RrhhPuesto, puesto_id):
            raise HTTPException(status_code=404, detail="El puesto no existe")

    async def _verificar_departamento(
        self, db: AsyncSession, departamento_id: Optional[int]
    ) -> None:
        if departamento_id is None:
            return
        if not await db.get(RrhhDepartamento, departamento_id):
            raise HTTPException(status_code=404, detail="El departamento no existe")

    async def _verificar_tipo_contrato(
        self, db: AsyncSession, tipo_contrato_id: Optional[int]
    ) -> None:
        if tipo_contrato_id is None:
            return
        if not await db.get(RrhhTipoContrato, tipo_contrato_id):
            raise HTTPException(status_code=404, detail="El tipo de contrato no existe")

    async def _verificar_supervisor(
        self, db: AsyncSession, supervisor: Optional[int], exclude_id: Optional[int] = None
    ) -> None:
        if supervisor is None:
            return
        if supervisor == exclude_id:
            raise HTTPException(
                status_code=400, detail="Un empleado no puede ser su propio supervisor"
            )
        if not await db.get(RrhhEmpleado, supervisor):
            raise HTTPException(status_code=404, detail="El supervisor no existe")

    async def _verificar_estado(self, estado: Optional[str]) -> None:
        if estado is None:
            return
        if estado not in ESTADOS_EMPLEADO:
            raise HTTPException(
                status_code=400,
                detail=f"Estado inválido. Debe ser uno de: {', '.join(ESTADOS_EMPLEADO)}",
            )

    async def _verificar_orden(self, orden: Optional[str]) -> None:
        if orden is None:
            return
        if orden not in ORDENES_LISTADO:
            raise HTTPException(
                status_code=400,
                detail=f"Orden inválido. Debe ser uno de: {', '.join(ORDENES_LISTADO)}",
            )

    async def _verificar_tipo_asistencia(self, tipo: Optional[str]) -> None:
        if tipo is None:
            return
        if tipo not in TIPOS_ASISTENCIA:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de asistencia inválido. Debe ser: {', '.join(TIPOS_ASISTENCIA)}",
            )

    def _validar_horario(self, inicio, final) -> None:
        if inicio is not None and final is not None and final <= inicio:
            raise HTTPException(
                status_code=400,
                detail="El horario final debe ser posterior al horario de inicio",
            )

    async def _verificar_carnet_unico(
        self, db: AsyncSession, carnet: Optional[str], excluir_id: Optional[int] = None
    ) -> None:
        if not carnet:
            return
        statement = select(RrhhEmpleado).where(RrhhEmpleado.carnet_identidad == carnet)
        if excluir_id is not None:
            statement = statement.where(RrhhEmpleado.id != excluir_id)
        if (await db.exec(statement)).first():
            raise HTTPException(
                status_code=409, detail="Ya existe un empleado con ese carnet de identidad"
            )

    async def _verificar_correo_unico(
        self, db: AsyncSession, correo: Optional[str], excluir_id: Optional[int] = None
    ) -> None:
        if not correo:
            return
        statement = select(RrhhEmpleado).where(RrhhEmpleado.correo == correo)
        if excluir_id is not None:
            statement = statement.where(RrhhEmpleado.id != excluir_id)
        if (await db.exec(statement)).first():
            raise HTTPException(
                status_code=409, detail="Ya existe un empleado con ese correo"
            )

    # ── Asignaciones resueltas ──────────────────────────────────────────────

    async def _nombres_asignaciones(
        self, db: AsyncSession, empleados: List[RrhhEmpleado]
    ) -> dict:
        """Resuelve los nombres de puesto/departamento/tipo/supervisor en lote."""
        ids_puesto = {e.puesto_id for e in empleados if e.puesto_id}
        ids_depto = {e.departamento_id for e in empleados if e.departamento_id}
        ids_tipo = {e.tipo_contrato_id for e in empleados if e.tipo_contrato_id}
        ids_sup = {e.supervisor for e in empleados if e.supervisor}

        nombres_puesto: dict[int, str] = {}
        nombres_depto: dict[int, str] = {}
        nombres_tipo: dict[int, str] = {}
        nombres_sup: dict[int, str] = {}

        if ids_puesto:
            res = await db.exec(
                select(RrhhPuesto.id_puesto, RrhhPuesto.nombre).where(
                    RrhhPuesto.id_puesto.in_(ids_puesto)
                )
            )
            nombres_puesto = {row[0]: row[1] for row in res.all()}

        if ids_depto:
            res = await db.exec(
                select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                    RrhhDepartamento.id_departamento.in_(ids_depto)
                )
            )
            nombres_depto = {row[0]: row[1] for row in res.all()}

        if ids_tipo:
            res = await db.exec(
                select(RrhhTipoContrato.id_tipo_contrato, RrhhTipoContrato.nombre).where(
                    RrhhTipoContrato.id_tipo_contrato.in_(ids_tipo)
                )
            )
            nombres_tipo = {row[0]: row[1] for row in res.all()}

        if ids_sup:
            res = await db.exec(
                select(RrhhEmpleado.id, RrhhEmpleado.nombre, RrhhEmpleado.apellido).where(
                    RrhhEmpleado.id.in_(ids_sup)
                )
            )
            nombres_sup = {row[0]: f"{row[1]} {row[2]}".strip() for row in res.all()}

        return {
            "puesto": nombres_puesto,
            "departamento": nombres_depto,
            "tipo_contrato": nombres_tipo,
            "supervisor": nombres_sup,
        }

    async def _usuario_vinculado(
        self, db: AsyncSession, carnet: Optional[str]
    ) -> Optional[str]:
        """Devuelve el alias del usuario del sistema con ese CI, si existe."""
        if not carnet:
            return None
        res = await db.exec(select(Usuario).where(Usuario.ci == carnet))
        usuario = res.first()
        return usuario.alias if usuario else None

    # ── CRUD ────────────────────────────────────────────────────────────────

    async def get(self, db: AsyncSession, id: int) -> RrhhEmpleadoDetalle:
        empleado = await db.get(RrhhEmpleado, id)
        if not empleado:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        detalle = RrhhEmpleadoDetalle.model_validate(empleado)
        nombres = await self._nombres_asignaciones(db, [empleado])
        detalle.puesto_nombre = nombres["puesto"].get(empleado.puesto_id)
        detalle.departamento_nombre = nombres["departamento"].get(empleado.departamento_id)
        detalle.tipo_contrato_nombre = nombres["tipo_contrato"].get(empleado.tipo_contrato_id)
        detalle.supervisor_nombre = nombres["supervisor"].get(empleado.supervisor)
        detalle.usuario_vinculado = await self._usuario_vinculado(
            db, empleado.carnet_identidad
        )
        return detalle

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        buscar: Optional[str] = None,
        estado: Optional[str] = None,
        departamento_id: Optional[int] = None,
        puesto_id: Optional[int] = None,
        activo: Optional[bool] = None,
        tipo_asistencia: Optional[str] = None,
        orden: Optional[str] = None,
    ) -> List[RrhhEmpleadoListado]:
        await self._verificar_estado(estado)
        await self._verificar_orden(orden)
        await self._verificar_tipo_asistencia(tipo_asistencia)
        statement = select(RrhhEmpleado)
        if buscar:
            term = f"%{buscar.strip()}%"
            statement = statement.where(
                or_(
                    RrhhEmpleado.nombre.ilike(term),
                    RrhhEmpleado.apellido.ilike(term),
                    RrhhEmpleado.codigo_empleado.ilike(term),
                    RrhhEmpleado.carnet_identidad.ilike(term),
                    RrhhEmpleado.correo.ilike(term),
                )
            )
        if estado:
            statement = statement.where(RrhhEmpleado.estado == estado)
        if departamento_id is not None:
            statement = statement.where(RrhhEmpleado.departamento_id == departamento_id)
        if puesto_id is not None:
            statement = statement.where(RrhhEmpleado.puesto_id == puesto_id)
        if activo is not None:
            statement = statement.where(RrhhEmpleado.activo == activo)
        if tipo_asistencia is not None:
            statement = statement.where(RrhhEmpleado.tipo_asistencia == tipo_asistencia)
        # Orden: apellido (por defecto) o creación descendente (scroll tipo feed)
        if orden == "recientes":
            statement = statement.order_by(
                RrhhEmpleado.created_at.desc(), RrhhEmpleado.id.desc()
            )
        else:
            statement = statement.order_by(RrhhEmpleado.apellido, RrhhEmpleado.nombre)
        statement = statement.offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []
        nombres = await self._nombres_asignaciones(db, filas)
        return [
            RrhhEmpleadoListado(
                **RrhhEmpleadoRead.model_validate(e).model_dump(),
                puesto_nombre=nombres["puesto"].get(e.puesto_id),
                departamento_nombre=nombres["departamento"].get(e.departamento_id),
                tipo_contrato_nombre=nombres["tipo_contrato"].get(e.tipo_contrato_id),
                supervisor_nombre=nombres["supervisor"].get(e.supervisor),
            )
            for e in filas
        ]

    async def buscar(
        self, db: AsyncSession, term: str, tipo_asistencia: Optional[str] = None
    ) -> List[RrhhEmpleadoBusqueda]:
        """Selector abreviado de empleados (para supervisor, responsable, etc.)."""
        await self._verificar_tipo_asistencia(tipo_asistencia)
        like = f"%{term.strip()}%"
        statement = select(RrhhEmpleado).where(
            or_(
                RrhhEmpleado.nombre.ilike(like),
                RrhhEmpleado.apellido.ilike(like),
                RrhhEmpleado.codigo_empleado.ilike(like),
            )
        )
        if tipo_asistencia is not None:
            statement = statement.where(
                RrhhEmpleado.tipo_asistencia == tipo_asistencia
            )
        statement = statement.order_by(
            RrhhEmpleado.apellido, RrhhEmpleado.nombre
        ).limit(20)
        result = await db.exec(statement)
        return [RrhhEmpleadoBusqueda.model_validate(e) for e in result.all()]

    async def create(self, db: AsyncSession, obj_in: RrhhEmpleadoCreate) -> RrhhEmpleadoRead:
        data = obj_in.model_dump()
        await self._verificar_puesto(db, data.get("puesto_id"))
        await self._verificar_departamento(db, data.get("departamento_id"))
        await self._verificar_tipo_contrato(db, data.get("tipo_contrato_id"))
        await self._verificar_supervisor(db, data.get("supervisor"))
        await self._verificar_estado(data.get("estado"))
        await self._verificar_tipo_asistencia(data.get("tipo_asistencia"))
        await self._verificar_carnet_unico(db, data.get("carnet_identidad"))
        await self._verificar_correo_unico(db, data.get("correo"))
        self._validar_horario(data.get("horario_inicio"), data.get("horario_final"))

        if data.get("fecha_contratacion") is None:
            data["fecha_contratacion"] = date.today()

        # El código lo genera la BD (`'EMP-' || nextval('empleado_codigo_seq')`).
        # SQLModel envía el campo como NULL e invalida el default del servidor,
        # así que se consume la secuencia aquí explícitamente.
        if not data.get("codigo_empleado"):
            data["codigo_empleado"] = await self._siguiente_codigo(db)

        db_obj = RrhhEmpleado(**data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhEmpleadoRead.model_validate(db_obj)

    async def _siguiente_codigo(self, db: AsyncSession) -> str:
        """Obtiene el siguiente código `EMP-XXXX` de la secuencia de la BD."""
        result = await db.execute(text("SELECT nextval('empleado_codigo_seq')"))
        numero = result.scalar()
        return f"EMP-{numero}"

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhEmpleadoUpdate
    ) -> RrhhEmpleadoRead:
        db_obj = await db.get(RrhhEmpleado, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        data = obj_in.model_dump(exclude_unset=True)

        if "puesto_id" in data:
            await self._verificar_puesto(db, data["puesto_id"])
        if "departamento_id" in data:
            await self._verificar_departamento(db, data["departamento_id"])
        if "tipo_contrato_id" in data:
            await self._verificar_tipo_contrato(db, data["tipo_contrato_id"])
        if "supervisor" in data:
            await self._verificar_supervisor(db, data["supervisor"], exclude_id=id)
        if "estado" in data:
            await self._verificar_estado(data["estado"])
        if "tipo_asistencia" in data:
            await self._verificar_tipo_asistencia(data["tipo_asistencia"])
        if "carnet_identidad" in data:
            await self._verificar_carnet_unico(db, data["carnet_identidad"], excluir_id=id)
        if "correo" in data:
            await self._verificar_correo_unico(db, data["correo"], excluir_id=id)

        inicio = data.get("horario_inicio", db_obj.horario_inicio)
        final = data.get("horario_final", db_obj.horario_final)
        self._validar_horario(inicio, final)

        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhEmpleadoRead.model_validate(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        """Baja lógica si tiene historial o subordinados; si no, borrado físico."""
        db_obj = await db.get(RrhhEmpleado, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")

        subordinados = await db.exec(
            select(func.count()).select_from(RrhhEmpleado).where(RrhhEmpleado.supervisor == id)
        )
        if (subordinados.one() or 0) > 0:
            return await self._desactivar(db, db_obj, "Tiene empleados a su cargo")

        es_responsable = await db.exec(
            select(func.count())
            .select_from(RrhhDepartamento)
            .where(RrhhDepartamento.responsable == id)
        )
        if (es_responsable.one() or 0) > 0:
            return await self._desactivar(db, db_obj, "Es responsable de un departamento")

        for modelo, campo in (
            (RrhhAsistencia, RrhhAsistencia.empleado_id),
            (RrhhDeduccion, RrhhDeduccion.empleados_id),
            (RrhhBonificacion, RrhhBonificacion.empleados_id),
            (RrhhNominaEmpleado, RrhhNominaEmpleado.empleados_id),
            (RrhhSolicitud, RrhhSolicitud.empleado_id),
            (RrhhEvaluacion, RrhhEvaluacion.empleado_id),
        ):
            dependientes = await db.exec(
                select(func.count()).select_from(modelo).where(campo == id)
            )
            if (dependientes.one() or 0) > 0:
                return await self._desactivar(
                    db, db_obj, f"Tiene registros de {modelo.__name__.lower()} asociados"
                )

        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    async def _desactivar(self, db: AsyncSession, db_obj: RrhhEmpleado, motivo: str) -> dict:
        db_obj.activo = False
        db.add(db_obj)
        await db.commit()
        return {"accion": "desactivado", "motivo": f"{motivo}; se marcó como inactivo."}


rrhh_empleado_service = RrhhEmpleadoService()

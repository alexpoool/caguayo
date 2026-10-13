"""Servicios del submódulo RRHH — Departamentos y Puestos (Fase 2).

Reglas de negocio de esta fase:
- Nombre de departamento único (también lo garantiza el índice UNIQUE de BD).
- El responsable debe ser un empleado existente y activo.
- Hard delete de departamento solo si no tiene puestos ni empleados asociados;
  si tiene, se hace soft delete (activo=False).
- Hard delete de puesto solo si no tiene empleados asignados.
- Rango salarial: salario_maximo >= salario_minimo (CHECK de BD + validación
  de servicio con mensaje claro).
"""

from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models import RrhhDepartamento, RrhhPuesto, RrhhEmpleado
from src.dto import (
    RrhhDepartamentoCreate,
    RrhhDepartamentoUpdate,
    RrhhDepartamentoRead,
    RrhhDepartamentoListado,
    RrhhDepartamentoDetalle,
    RrhhPuestoCreate,
    RrhhPuestoUpdate,
    RrhhPuestoRead,
    RrhhPuestoListado,
    RrhhPuestoDetalle,
)


class RrhhDepartamentoService:
    model_name = "Departamento"

    async def _verificar_empleado(
        self, db: AsyncSession, empleado_id: Optional[int]
    ) -> None:
        """El responsable debe existir y estar activo."""
        if empleado_id is None:
            return
        empleado = await db.get(RrhhEmpleado, empleado_id)
        if not empleado:
            raise HTTPException(
                status_code=404, detail="El empleado responsable no existe"
            )
        if not empleado.activo:
            raise HTTPException(
                status_code=400,
                detail="El empleado responsable no está activo en el sistema",
            )

    async def _verificar_nombre_unico(
        self,
        db: AsyncSession,
        nombre: str,
        excluir_id: Optional[int] = None,
    ) -> None:
        statement = select(RrhhDepartamento).where(RrhhDepartamento.nombre == nombre)
        if excluir_id is not None:
            statement = statement.where(RrhhDepartamento.id_departamento != excluir_id)
        result = await db.exec(statement)
        if result.first():
            raise HTTPException(
                status_code=409, detail=f"Ya existe un departamento llamado «{nombre}»"
            )

    async def get(self, db: AsyncSession, id: int) -> RrhhDepartamentoDetalle:
        departamento = await db.get(RrhhDepartamento, id)
        if not departamento:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        return await self._construir_detalle(db, departamento)

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        activo: Optional[bool] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhDepartamentoListado]:
        statement = select(RrhhDepartamento)
        if activo is not None:
            statement = statement.where(RrhhDepartamento.activo == activo)
        if buscar:
            term = f"%{buscar.strip()}%"
            statement = statement.where(RrhhDepartamento.nombre.ilike(term))
        statement = statement.order_by(RrhhDepartamento.nombre).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        # Agregados resueltos en lote (3 consultas fijas, no N+1).
        ids = [d.id_departamento for d in filas]

        responsable_ids = {d.responsable for d in filas if d.responsable is not None}
        nombres: dict[int, str] = {}
        if responsable_ids:
            resp = await db.exec(
                select(RrhhEmpleado.id, RrhhEmpleado.nombre, RrhhEmpleado.apellido).where(
                    RrhhEmpleado.id.in_(responsable_ids)
                )
            )
            nombres = {
                row[0]: f"{row[1]} {row[2]}".strip() for row in resp.all()
            }

        puestos_res = await db.exec(
            select(RrhhPuesto.departamento_id, func.count())
            .where(RrhhPuesto.departamento_id.in_(ids))
            .group_by(RrhhPuesto.departamento_id)
        )
        conteo_puestos = {row[0]: row[1] for row in puestos_res.all()}

        empleados_res = await db.exec(
            select(RrhhEmpleado.departamento_id, func.count())
            .where(RrhhEmpleado.departamento_id.in_(ids))
            .group_by(RrhhEmpleado.departamento_id)
        )
        conteo_empleados = {row[0]: row[1] for row in empleados_res.all()}

        return [
            RrhhDepartamentoListado(
                **RrhhDepartamentoRead.model_validate(d).model_dump(),
                responsable_nombre=nombres.get(d.responsable) if d.responsable else None,
                total_puestos=conteo_puestos.get(d.id_departamento, 0),
                total_empleados=conteo_empleados.get(d.id_departamento, 0),
            )
            for d in filas
        ]

    async def create(
        self, db: AsyncSession, obj_in: RrhhDepartamentoCreate
    ) -> RrhhDepartamentoRead:
        await self._verificar_nombre_unico(db, obj_in.nombre)
        await self._verificar_empleado(db, obj_in.responsable)
        db_obj = RrhhDepartamento(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhDepartamentoRead.model_validate(db_obj)

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhDepartamentoUpdate
    ) -> RrhhDepartamentoRead:
        db_obj = await db.get(RrhhDepartamento, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        data = obj_in.model_dump(exclude_unset=True)
        if "nombre" in data:
            await self._verificar_nombre_unico(db, data["nombre"], excluir_id=id)
        if "responsable" in data:
            await self._verificar_empleado(db, data["responsable"])
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhDepartamentoRead.model_validate(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        """Hard delete solo si no tiene dependencias; si las tiene, soft delete."""
        db_obj = await db.get(RrhhDepartamento, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")

        puestos = await db.exec(
            select(func.count()).select_from(RrhhPuesto).where(
                RrhhPuesto.departamento_id == id
            )
        )
        empleados = await db.exec(
            select(func.count()).select_from(RrhhEmpleado).where(
                RrhhEmpleado.departamento_id == id
            )
        )
        tiene_puestos = (puestos.one() or 0) > 0
        tiene_empleados = (empleados.one() or 0) > 0

        if tiene_puestos or tiene_empleados:
            db_obj.activo = False
            db.add(db_obj)
            await db.commit()
            return {
                "accion": "desactivado",
                "motivo": "Tiene puestos o empleados asociados; se marcó como inactivo.",
            }

        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    async def _construir_detalle(
        self, db: AsyncSession, departamento: RrhhDepartamento
    ) -> RrhhDepartamentoDetalle:
        detalle = RrhhDepartamentoDetalle.model_validate(departamento)

        if departamento.responsable:
            responsable = await db.get(RrhhEmpleado, departamento.responsable)
            if responsable:
                detalle.responsable_nombre = (
                    f"{responsable.nombre} {responsable.apellido}".strip()
                )

        puestos_result = await db.exec(
            select(RrhhPuesto)
            .where(RrhhPuesto.departamento_id == departamento.id_departamento)
            .order_by(RrhhPuesto.nombre)
        )
        detalle.puestos = [
            RrhhPuestoRead.model_validate(p) for p in puestos_result.all()
        ]

        empleados_result = await db.exec(
            select(func.count()).select_from(RrhhEmpleado).where(
                RrhhEmpleado.departamento_id == departamento.id_departamento
            )
        )
        detalle.total_empleados = empleados_result.one() or 0
        return detalle


class RrhhPuestoService:
    model_name = "Puesto"

    async def _validar_rango_salarial(
        self, minimo: Optional[float], maximo: Optional[float]
    ) -> None:
        if minimo is not None and maximo is not None and maximo < minimo:
            raise HTTPException(
                status_code=400,
                detail="El salario máximo no puede ser menor que el mínimo",
            )

    async def _verificar_departamento(
        self, db: AsyncSession, departamento_id: Optional[int]
    ) -> None:
        if departamento_id is None:
            return
        departamento = await db.get(RrhhDepartamento, departamento_id)
        if not departamento:
            raise HTTPException(status_code=404, detail="El departamento no existe")

    async def get(self, db: AsyncSession, id: int) -> RrhhPuestoDetalle:
        puesto = await db.get(RrhhPuesto, id)
        if not puesto:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        return await self._construir_detalle(db, puesto)

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        departamento_id: Optional[int] = None,
        activo: Optional[bool] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhPuestoListado]:
        statement = select(RrhhPuesto)
        if departamento_id is not None:
            statement = statement.where(RrhhPuesto.departamento_id == departamento_id)
        if activo is not None:
            statement = statement.where(RrhhPuesto.activo == activo)
        if buscar:
            term = f"%{buscar.strip()}%"
            statement = statement.where(RrhhPuesto.nombre.ilike(term))
        statement = statement.order_by(RrhhPuesto.nombre).offset(skip).limit(limit)
        result = await db.exec(statement)
        filas = list(result.all())
        if not filas:
            return []

        # Agregados resueltos en lote (2 consultas fijas, no N+1).
        ids = [p.id_puesto for p in filas]

        depto_ids = {p.departamento_id for p in filas if p.departamento_id is not None}
        nombres_deptos: dict[int, str] = {}
        if depto_ids:
            deps = await db.exec(
                select(RrhhDepartamento.id_departamento, RrhhDepartamento.nombre).where(
                    RrhhDepartamento.id_departamento.in_(depto_ids)
                )
            )
            nombres_deptos = {row[0]: row[1] for row in deps.all()}

        empleados_res = await db.exec(
            select(RrhhEmpleado.puesto_id, func.count())
            .where(RrhhEmpleado.puesto_id.in_(ids))
            .group_by(RrhhEmpleado.puesto_id)
        )
        conteo_empleados = {row[0]: row[1] for row in empleados_res.all()}

        return [
            RrhhPuestoListado(
                **RrhhPuestoRead.model_validate(p).model_dump(),
                departamento_nombre=(
                    nombres_deptos.get(p.departamento_id) if p.departamento_id else None
                ),
                total_empleados=conteo_empleados.get(p.id_puesto, 0),
            )
            for p in filas
        ]

    async def create(self, db: AsyncSession, obj_in: RrhhPuestoCreate) -> RrhhPuestoRead:
        await self._verificar_departamento(db, obj_in.departamento_id)
        await self._validar_rango_salarial(obj_in.salario_minimo, obj_in.salario_maximo)
        db_obj = RrhhPuesto(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhPuestoRead.model_validate(db_obj)

    async def update(
        self, db: AsyncSession, id: int, obj_in: RrhhPuestoUpdate
    ) -> RrhhPuestoRead:
        db_obj = await db.get(RrhhPuesto, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        data = obj_in.model_dump(exclude_unset=True)
        if "departamento_id" in data:
            await self._verificar_departamento(db, data["departamento_id"])
        minimo = data.get("salario_minimo", db_obj.salario_minimo)
        maximo = data.get("salario_maximo", db_obj.salario_maximo)
        await self._validar_rango_salarial(minimo, maximo)
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return RrhhPuestoRead.model_validate(db_obj)

    async def eliminar(self, db: AsyncSession, id: int) -> dict:
        """Hard delete solo si no tiene empleados asignados; si tiene, soft delete."""
        db_obj = await db.get(RrhhPuesto, id)
        if not db_obj:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")

        empleados = await db.exec(
            select(func.count()).select_from(RrhhEmpleado).where(
                RrhhEmpleado.puesto_id == id
            )
        )
        if (empleados.one() or 0) > 0:
            db_obj.activo = False
            db.add(db_obj)
            await db.commit()
            return {
                "accion": "desactivado",
                "motivo": "Tiene empleados asignados; se marcó como inactivo.",
            }

        await db.delete(db_obj)
        await db.commit()
        return {"accion": "eliminado", "motivo": None}

    async def listar_empleados(
        self, db: AsyncSession, id: int
    ) -> List[dict]:
        """Empleados asignados a un puesto."""
        puesto = await db.get(RrhhPuesto, id)
        if not puesto:
            raise HTTPException(status_code=404, detail=f"{self.model_name} no encontrado")
        result = await db.exec(
            select(RrhhEmpleado)
            .where(RrhhEmpleado.puesto_id == id)
            .order_by(RrhhEmpleado.apellido, RrhhEmpleado.nombre)
        )
        return [
            {
                "id": e.id,
                "codigo_empleado": e.codigo_empleado,
                "nombre": e.nombre,
                "apellido": e.apellido,
                "estado": e.estado,
                "activo": e.activo,
            }
            for e in result.all()
        ]

    async def _construir_detalle(
        self, db: AsyncSession, puesto: RrhhPuesto
    ) -> RrhhPuestoDetalle:
        detalle = RrhhPuestoDetalle.model_validate(puesto)
        if puesto.departamento_id:
            departamento = await db.get(RrhhDepartamento, puesto.departamento_id)
            if departamento:
                detalle.departamento_nombre = departamento.nombre
        empleados_result = await db.exec(
            select(func.count()).select_from(RrhhEmpleado).where(
                RrhhEmpleado.puesto_id == puesto.id_puesto
            )
        )
        detalle.total_empleados = empleados_result.one() or 0
        return detalle


rrhh_departamento_service = RrhhDepartamentoService()
rrhh_puesto_service = RrhhPuestoService()

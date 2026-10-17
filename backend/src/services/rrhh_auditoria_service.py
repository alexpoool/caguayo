"""Servicio RRHH — Auditoría (Fase 9).

Lectura del log de la aplicación (tabla `log`): filtros por rango de
fechas, tipo, nivel y texto libre, más los valores distintos de `tipo` y
`nivel` para poblar los selects de la pantalla. Es el único servicio RRHH
que no valida altas: la tabla la escriben el frontend (tipo `REQUEST`),
los servicios del módulo (solicitudes/nómina) y `AppLogger`.

Filtros en `listar()` (todas las combinaciones son compatibles entre sí):

- `desde`/`hasta` (inclusive): comparan contra `timestamp` (día completo
  local: `desde 00:00` … `hasta 23:59:59.999…`). Un rango invertido
  (`desde > hasta`) lanza `400` con el detalle
  «El rango de fechas es inválido: la fecha «desde» es posterior a la «hasta»».
- `tipo`: igualdad exacta sobre `log.tipo` («REQUEST», «SOLICITUD»,
  «ACTION», «NOMINA», «FRONTEND»); un valor desconocido devuelve lista
  vacía, no error.
- `nivel`: igualdad exacta sobre `log.nivel` («INFO», «WARNING», «ERROR»);
  igual que `tipo`, desconocido ⇒ vacío.
- `buscar`: subcadena sin distinguir mayúsculas sobre `mensaje`,
  `endpoint`, `usuario_nombre` y `detalle`.
"""

from datetime import date, datetime, time
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import cast, or_, String
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.dto import RrhhAuditoriaFila
from src.models.log import LogEntry


class RrhhAuditoriaService:
    model_name = "Auditoria"

    # ── Listado ─────────────────────────────────────────────────────────────

    async def listar(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        tipo: Optional[str] = None,
        nivel: Optional[str] = None,
        buscar: Optional[str] = None,
    ) -> List[RrhhAuditoriaFila]:
        if desde is not None and hasta is not None and desde > hasta:
            raise HTTPException(
                status_code=400,
                detail="El rango de fechas es inválido: la fecha «desde» es posterior a la «hasta»",
            )

        statement = select(LogEntry)
        if desde is not None:
            statement = statement.where(
                LogEntry.timestamp >= datetime.combine(desde, time.min)
            )
        if hasta is not None:
            statement = statement.where(
                LogEntry.timestamp <= datetime.combine(hasta, time.max)
            )
        if tipo is not None:
            statement = statement.where(LogEntry.tipo == tipo)
        if nivel is not None:
            statement = statement.where(LogEntry.nivel == nivel)
        if buscar:
            term = f"%{buscar.strip()}%"
            statement = statement.where(
                or_(
                    LogEntry.mensaje.ilike(term),
                    LogEntry.endpoint.ilike(term),
                    LogEntry.usuario_nombre.ilike(term),
                    cast(LogEntry.detalle, String).ilike(term),
                )
            )

        # Más recientes primero; el `id` como desempate para que la
        # paginación sea estable cuando dos entradas comparten instante.
        statement = (
            statement.order_by(LogEntry.timestamp.desc(), LogEntry.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return [RrhhAuditoriaFila.model_validate(fila) for fila in result.all()]

    async def tipos(self, db: AsyncSession) -> List[str]:
        return await self._valores_distintos(db, LogEntry.tipo)

    async def niveles(self, db: AsyncSession) -> List[str]:
        return await self._valores_distintos(db, LogEntry.nivel)

    async def _valores_distintos(self, db: AsyncSession, columna) -> List[str]:
        """Valores distintos de una columna del log, en orden alfabético.

        Se usa `distinct()` sobre la columna y se puebla la lista desde
        `pluck` para no arrastrar el modelo entero.
        """
        statement = select(columna).distinct().order_by(columna)
        result = await db.exec(statement)
        return list(result.all())


rrhh_auditoria_service = RrhhAuditoriaService()

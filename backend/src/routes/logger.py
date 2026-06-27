from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from src.services.log_sse import broadcast_log, sse_events
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import func, desc
from src.database.connection import get_session
from src.models.log import LogEntry
from pydantic import BaseModel

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/stream")
async def stream_logs():
    """SSE endpoint for real-time log streaming"""
    return StreamingResponse(
        sse_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


class LogEntryResponse(BaseModel):
    id: int
    timestamp: datetime
    nivel: str
    tipo: str
    mensaje: str
    detalle: Optional[str] = None
    ip: Optional[str] = None
    usuario_id: Optional[int] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    usuario_nombre: Optional[str] = None
    navegador: Optional[str] = None


class LogStatsResponse(BaseModel):
    total: int
    por_nivel: dict
    por_tipo: dict
    ultimos_errores: List[LogEntryResponse]


class LogCreateRequest(BaseModel):
    nivel: str = "INFO"
    tipo: str = "FRONTEND"
    mensaje: str = "Frontend log"
    detalle: Optional[str] = None
    ip: Optional[str] = None
    navegador: Optional[str] = None
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None


@router.get("", response_model=List[LogEntryResponse])
async def get_logs(
    fecha_desde: Optional[str] = Query(None, description="Fecha desde (ISO)"),
    fecha_hasta: Optional[str] = Query(None, description="Fecha hasta (ISO)"),
    nivel: Optional[str] = Query(
        None, description="Nivel: DEBUG, INFO, WARNING, ERROR"
    ),
    tipo: Optional[str] = Query(
        None, description="Tipo: REQUEST, ERROR, BUSINESS, ACTION, FRONTEND"
    ),
    busqueda: Optional[str] = Query(None, description="Buscar en mensaje"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_session),
):
    """Obtiene los logs con filtros"""
    from sqlmodel import select

    statement = select(LogEntry).order_by(desc(LogEntry.timestamp))

    if fecha_desde:
        try:
            fecha_desde_dt = datetime.fromisoformat(fecha_desde)
            statement = statement.where(LogEntry.timestamp >= fecha_desde_dt)
        except ValueError:
            pass

    if fecha_hasta:
        try:
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta)
            statement = statement.where(LogEntry.timestamp <= fecha_hasta_dt)
        except ValueError:
            pass

    if nivel:
        statement = statement.where(LogEntry.nivel == nivel.upper())

    if tipo:
        statement = statement.where(LogEntry.tipo == tipo.upper())

    if busqueda:
        from sqlalchemy import or_

        search_term = f"%{busqueda}%"
        statement = statement.where(
            or_(
                LogEntry.mensaje.ilike(search_term),
                LogEntry.nivel.ilike(search_term),
                LogEntry.tipo.ilike(search_term),
                LogEntry.usuario_nombre.ilike(search_term),
            )
        )

    statement = statement.limit(limit).offset(offset)
    results = await db.exec(statement)
    logs = results.all()

    return [LogEntryResponse.model_validate(log.model_dump()) for log in logs]


@router.get("/stats", response_model=LogStatsResponse)
async def get_log_stats(
    db: AsyncSession = Depends(get_session),
):
    """Obtiene estadísticas de logs"""
    from sqlmodel import select

    ahora = datetime.now()
    hace_24h = ahora - timedelta(hours=24)
    hace_7d = ahora - timedelta(days=7)

    # Total últimos 7 días
    statement_total = select(func.count(LogEntry.id)).where(
        LogEntry.timestamp >= hace_7d
    )
    result = await db.exec(statement_total)
    total = result.one() or 0

    # Por nivel
    statement_nivel = (
        select(LogEntry.nivel, func.count(LogEntry.id))
        .where(LogEntry.timestamp >= hace_7d)
        .group_by(LogEntry.nivel)
    )
    results_nivel = await db.exec(statement_nivel)
    por_nivel = {row[0]: row[1] for row in results_nivel.all()}

    # Por tipo
    statement_tipo = (
        select(LogEntry.tipo, func.count(LogEntry.id))
        .where(LogEntry.timestamp >= hace_7d)
        .group_by(LogEntry.tipo)
    )
    results_tipo = await db.exec(statement_tipo)
    por_tipo = {row[0]: row[1] for row in results_tipo.all()}

    # Últimos errores
    statement_errores = (
        select(LogEntry)
        .where(LogEntry.nivel == "ERROR")
        .where(LogEntry.timestamp >= hace_24h)
        .order_by(desc(LogEntry.timestamp))
        .limit(10)
    )
    results_errores = await db.exec(statement_errores)
    ultimos_errores = results_errores.all()

    return LogStatsResponse(
        total=total,
        por_nivel=por_nivel,
        por_tipo=por_tipo,
        ultimos_errores=[
            LogEntryResponse.model_validate(e.model_dump()) for e in ultimos_errores
        ],
    )


@router.post("")
async def create_log(
    log_data: LogCreateRequest,
    db: AsyncSession = Depends(get_session),
    request: Optional[Request] = None,
):
    """Crea un log desde el frontend"""
    nivel = log_data.nivel
    tipo = log_data.tipo
    mensaje = log_data.mensaje
    detalle = log_data.detalle
    ip = log_data.ip
    navegador = log_data.navegador
    usuario_id = log_data.usuario_id
    usuario_nombre = log_data.usuario_nombre

    if request and not usuario_id:
        from src.services.auth_service import decode_token

        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            if payload:
                try:
                    usuario_id = int(payload.get("sub"))
                except Exception:
                    pass
                usuario_nombre = payload.get("nombre")

    log_data = {
        "nivel": nivel,
        "tipo": tipo,
        "mensaje": mensaje,
        "detalle": detalle,
        "ip": ip,
        "navegador": navegador,
        "usuario_id": usuario_id,
        "usuario_nombre": usuario_nombre,
    }

    db_obj = LogEntry(**log_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    broadcast_data = {
        "id": db_obj.id,
        "timestamp": db_obj.timestamp.isoformat(),
        "nivel": db_obj.nivel,
        "tipo": db_obj.tipo,
        "mensaje": db_obj.mensaje,
        "detalle": db_obj.detalle,
        "ip": db_obj.ip,
        "navegador": db_obj.navegador,
        "usuario_id": db_obj.usuario_id,
        "usuario_nombre": db_obj.usuario_nombre,
        "endpoint": db_obj.endpoint,
        "method": db_obj.method,
        "status_code": db_obj.status_code,
    }
    await broadcast_log(broadcast_data)

    return {"success": True}

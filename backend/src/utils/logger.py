import logging
from datetime import datetime
from typing import Optional, Any

logger = logging.getLogger(__name__)


class AppLogger:
    """Utility class para logging de negocio"""
    
    @staticmethod
    async def log_business(
        mensaje: str,
        nivel: str = "INFO",
        tipo: str = "BUSINESS",
        detalle: Optional[str] = None,
        usuario_id: Optional[int] = None,
        usuario_nombre: Optional[str] = None,
    ):
        """Guarda un log de negocio"""
        log_data = {
            "nivel": nivel,
            "tipo": tipo,
            "mensaje": mensaje,
            "detalle": detalle,
            "usuario_id": usuario_id,
            "usuario_nombre": usuario_nombre,
        }
        
        try:
            from src.database.connection import get_session
            from src.models.log import LogEntry
            
            async for db in get_session():
                db_obj = LogEntry(**log_data)
                db.add(db_obj)
                await db.commit()
                break
        except Exception as e:
            logger.error(f"Error saving business log: {e}")

    @staticmethod
    async def log_action(
        modulo: str,
        accion: str,
        detalle: Optional[dict] = None,
        usuario_id: Optional[int] = None,
        usuario_nombre: Optional[str] = None,
    ):
        """Guarda un log de acción de usuario"""
        import json
        mensaje = f"{modulo}: {accion}"
        
        await AppLogger.log_business(
            mensaje=mensaje,
            nivel="INFO",
            tipo="ACTION",
            detalle=json.dumps(detalle) if detalle else None,
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
        )

    @staticmethod
    async def log_error(
        mensaje: str,
        error: Optional[Any] = None,
        usuario_id: Optional[int] = None,
        usuario_nombre: Optional[str] = None,
    ):
        """Guarda un log de error"""
        error_str = str(error) if error else None
        
        await AppLogger.log_business(
            mensaje=mensaje,
            nivel="ERROR",
            tipo="ERROR",
            detalle=error_str,
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
        )

    @staticmethod
    async def log_frontend_error(
        mensaje: str,
        detalle: Optional[str] = None,
        navegador: Optional[str] = None,
        ip: Optional[str] = None,
        usuario_id: Optional[int] = None,
        usuario_nombre: Optional[str] = None,
    ):
        """Guarda un log de error del frontend"""
        log_data = {
            "nivel": "ERROR",
            "tipo": "FRONTEND",
            "mensaje": mensaje,
            "detalle": detalle,
            "navegador": navegador,
            "ip": ip,
            "usuario_id": usuario_id,
            "usuario_nombre": usuario_nombre,
        }
        
        try:
            from src.database.connection import get_session
            from src.models.log import LogEntry
            
            async for db in get_session():
                db_obj = LogEntry(**log_data)
                db.add(db_obj)
                await db.commit()
                break
        except Exception as e:
            logger.error(f"Error saving frontend log: {e}")
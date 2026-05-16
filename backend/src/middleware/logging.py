import time
import json
import logging
from datetime import datetime
from typing import Optional, Callable, Union
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

EXCLUDED_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}
EXCLUDED_PREFIXES = ("/docs", "/api/v1/logs")


def get_user_from_token(request: Request) -> tuple[Optional[int], Optional[str]]:
    """Decodifica el token JWT y retorna (usuario_id, usuario_nombre)"""
    try:
        from src.services.auth_service import decode_token
        
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None, None
        
        token = auth_header.replace("Bearer ", "")
        payload = decode_token(token)
        
        if payload:
            usuario_id = payload.get("sub") or payload.get("id_usuario")
            usuario_nombre = payload.get("nombre")
            return usuario_id, usuario_nombre
    except Exception as e:
        logger.debug(f"Error decoding token: {e}")
    
    return None, None


def generate_log_message(method: str, path: str, status_code: int, error_detail: Optional[str] = None) -> str:
    """Genera un mensaje descriptivo para el log basado en el endpoint y código de estado."""
    
    # Si tenemos el detail del error (del response body), usarlo directamente
    if error_detail:
        return error_detail
    
    # Mapeo de códigos de estado a mensajes por defecto
    status_messages = {
        401: "No autorizado",
        403: "Acceso denegado",
        404: "Recurso no encontrado",
        405: "Método no permitido",
        422: "Datos inválidos",
        429: "Demasiadas solicitudes",
        500: "Error interno del servidor",
        502: "Error de gateway",
        503: "Servicio no disponible",
    }
    
    # Mensajes específicos por endpoint
    endpoint_messages = {
        ("/auth/login", "POST"): "Credenciales inválidas",
        ("/auth/register", "POST"): "Error en registro",
        ("/auth/logout", "POST"): "Error al cerrar sesión",
        ("/auth/me", "GET"): "Token inválido o expirado",
    }
    
    # Verificar endpoint específico primero
    endpoint_key = (path, method)
    if endpoint_key in endpoint_messages:
        return endpoint_messages[endpoint_key]
    
    # Verificar si es un error conocido
    if status_code in status_messages:
        return status_messages[status_code]
    
    # Para succèsos, generar mensaje basado en la operación
    if 200 <= status_code < 300:
        if method == "POST":
            return "Recurso creado exitosamente"
        elif method == "PUT" or method == "PATCH":
            return "Recurso actualizado exitosamente"
        elif method == "DELETE":
            return "Recurso eliminado exitosamente"
        elif method == "GET":
            return "Datos obtenidos exitosamente"
    
    return f"Estado: {status_code}"


async def read_response_body(response: Response) -> tuple[bytes, Response]:
    """Lee el cuerpo de la respuesta y la restaura para poder enviarla."""
    if hasattr(response, 'body_iterator') and response.body_iterator is not None:
        try:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            
            # Restaurar el body iterator para que la respuesta pueda enviarse
            async def body_generator():
                yield body
            
            from starlette.responses import StreamingResponse
            if isinstance(response, StreamingResponse):
                new_response = StreamingResponse(
                    content=body_generator(),
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )
            else:
                new_response = response.__class__(
                    content=body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )
                new_response.body_iterator = body_generator()
            
            return body, new_response
        except Exception:
            pass
    
    return b"", response


class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in EXCLUDED_PATHS or request.url.path.startswith(EXCLUDED_PREFIXES):
            return await call_next(request)

        start_time = time.time()
        
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    request._body = body
            except Exception:
                pass

        ip_client = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "unknown")

        response = None
        error_detail = None
        try:
            response = await call_next(request)
        except Exception as e:
            error_detail = str(e)
            raise

        duration = time.time() - start_time
        status_code = response.status_code if response else 500

        # Try to extract error detail from response body
        response_detail = None
        try:
            if hasattr(response, 'body_iterator') and response.body_iterator is not None and status_code >= 400:
                response_body, response = await read_response_body(response)
                if response_body:
                    try:
                        error_json = json.loads(response_body)
                        response_detail = error_json.get("detail") or error_json.get("message")
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        pass
        except Exception as e:
            logger.debug(f"Error reading response body: {e}")

        usuario_id_raw, usuario_nombre = get_user_from_token(request)
        usuario_id = None
        if usuario_id_raw:
            try:
                usuario_id = int(usuario_id_raw)
            except (ValueError, TypeError):
                pass

        # Generate descriptive log message
        log_mensaje = generate_log_message(
            request.method, 
            request.url.path, 
            status_code, 
            response_detail or error_detail
        )

        if status_code >= 500 and not error_detail:
            return response

        log_data = {
            "nivel": "ERROR" if status_code >= 500 or error_detail else ("WARNING" if status_code >= 400 else "INFO"),
            "tipo": "REQUEST",
            "mensaje": log_mensaje,
            "detalle": json.dumps({
                "duration_ms": round(duration * 1000, 2),
                "error": error_detail,
                "query_params": dict(request.query_params),
            }),
            "ip": ip_client if ip_client and ip_client != "unknown" else None,
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "navegador": user_agent[:100] if user_agent and user_agent != "unknown" else None,
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
                await db.refresh(db_obj)
                
                try:
                    from src.services.log_sse import broadcast_log
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
                except Exception as be:
                    logger.debug(f"Broadcast error: {be}")
                break
        except Exception as e:
            error_str = str(e)
            if "no existe la relación" in error_str or "UndefinedTableError" in error_str or "log" in error_str:
                logger.debug(f"Tabla log no existe en tenant, saltando logging: {e}")
            else:
                logger.error(f"Error saving log: {e}")

        return response
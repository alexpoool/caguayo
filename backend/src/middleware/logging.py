import time
import json
import logging
from datetime import datetime
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

EXCLUDED_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in EXCLUDED_PATHS or request.url.path.startswith("/docs"):
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

        ip = request.client.host if request.client else "unknown"
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

        log_data = {
            "nivel": "ERROR" if status_code >= 500 or error_detail else "INFO",
            "tipo": "REQUEST",
            "mensaje": f"{request.method} {request.url.path} - {status_code}",
            "detalle": json.dumps({
                "duration_ms": round(duration * 1000, 2),
                "error": error_detail,
                "query_params": dict(request.query_params),
            }),
            "ip": ip,
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "navegador": user_agent[:100] if user_agent != "unknown" else None,
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
            logger.error(f"Error saving log: {e}")

        return response
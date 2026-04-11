import os
import sys
import logging
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import pathlib
from src.routes import api_router
from src.database.connection import set_current_db
from src.models import (
    Anexo,
    Categorias,
    Dependencia,
    Liquidacion,
    Moneda,
    Movimiento,
    Productos,
    Subcategorias,
    TipoDependencia,
    TipoMovimiento,
    Transaccion,
    Ventas,
    Provincia,
    Municipio,
    Cuenta,
    Grupo,
    Usuario,
    TipoContrato,
    EstadoContrato,
    ProductosEnLiquidacion,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

load_dotenv()

__all_models__ = [
    Anexo,
    Categorias,
    Dependencia,
    Liquidacion,
    Moneda,
    Movimiento,
    Productos,
    Subcategorias,
    TipoDependencia,
    TipoMovimiento,
    Transaccion,
    Ventas,
    Provincia,
    Municipio,
    Cuenta,
    Grupo,
    Usuario,
    TipoContrato,
    EstadoContrato,
    ProductosEnLiquidacion,
]

app = FastAPI(
    title="Caguayo",
    description="",
    version="1.0.0",
    redirect_slashes=False,
)

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

cors_origins_str = os.getenv("CORS_ORIGINS", "")
if cors_origins_str:
    cors_origins = [
        origin.strip() for origin in cors_origins_str.split(",") if origin.strip()
    ]
else:
    cors_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = pathlib.Path(__file__).parent.parent / "frontend" / "public" / "favicon.ico"
    return FileResponse(favicon_path)


@app.middleware("http")
async def database_middleware(request: Request, call_next):
    """Set the database context from the JWT token in the Authorization header."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "")
            from jose import jwt

            SECRET_KEY = os.getenv(
                "SECRET_KEY", "caguayo-secret-key-change-in-production"
            )
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            base_datos = payload.get("base_datos")
            if base_datos:
                set_current_db(base_datos)
    except Exception:
        pass
    response = await call_next(request)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/")
async def root():
    return {"message": "API de Caguayo funcionando"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

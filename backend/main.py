import os
import sys
import logging
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import api_router
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

@app.get("/")
async def root():
    return {"message": "API de Caguayo funcionando"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

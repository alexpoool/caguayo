import os
import sys
import logging
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

load_dotenv()

from src.routes import api_router  # noqa: E402

# Import all models to ensure they are registered with SQLModel
from src.models import (  # noqa: E402
    Anexo,
    Categorias,
    DatosGeneralesDependencia,
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
)

# Avoid F401 (unused imports) by listing them or using noqa, but listing is better for runtime debugging if needed
__all_models__ = [
    Anexo,
    Categorias,
    DatosGeneralesDependencia,
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
]

# Create database tables - Removed in favor of Alembic migrations
# SQLModel.metadata.create_all(engine)

app = FastAPI(
    title="API de Inventario",
    description="API para visualización y gestión de base de datos de inventario",
    version="1.0.0",
    redirect_slashes=False,
)

# Configure CORS
# Define defaults for development; in production, strict environment variables should be used.
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite default
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
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "PATCH",
    ],  # Specific methods instead of "*"
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "API de Inventario funcionando"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="API de Inventario",
    description="API para visualización y gestión de base de datos de inventario",
    version="1.0.0",
)

# Configure CORS
cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "API de Inventario funcionando"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "configured"}


@app.get("/api/v1/")
async def api_info():
    return {
        "message": "API de Inventario v1.0",
        "endpoints": {
            "productos": "/api/v1/productos",
            "dashboard": "/api/v1/dashboard/stats",
        },
    }


@app.options("/api/v1/dashboard/stats")
async def options_dashboard_stats():
    return {"detail": "OK"}


@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats():
    return {
        "total_productos": 42,
        "total_ventas": 10,
        "total_movimientos": 10,
        "total_categorias": 8,
        "ventas_mes_actual": 8567.89,
        "productos_stock_bajo": [
            {"id_producto": 1, "nombre": "iPhone 15 Pro", "precio_venta": 1299.99},
            {"id_producto": 2, "nombre": "Samsung Galaxy S24", "precio_venta": 999.99},
        ],
    }


@app.options("/api/v1/productos")
async def options_productos():
    return {"detail": "OK"}


@app.get("/api/v1/productos")
async def get_productos():
    return [
        {
            "id_producto": 1,
            "id_subcategoria": 1,
            "nombre": "iPhone 15 Pro",
            "descripcion": "Último modelo de iPhone con cámara profesional",
            "moneda_compra": 1,
            "precio_compra": 999.99,
            "moneda_venta": 1,
            "precio_venta": 1299.99,
            "precio_minimo": 1199.99,
        },
        {
            "id_producto": 2,
            "id_subcategoria": 1,
            "nombre": "Samsung Galaxy S24",
            "descripcion": "Flagship de Samsung con pantalla AMOLED",
            "moneda_compra": 1,
            "precio_compra": 799.99,
            "moneda_venta": 1,
            "precio_venta": 999.99,
            "precio_minimo": 899.99,
        },
        {
            "id_producto": 3,
            "id_subcategoria": 2,
            "nombre": "MacBook Air M2",
            "descripcion": "Ultrabook ligero con chip M2",
            "moneda_compra": 1,
            "precio_compra": 999.99,
            "moneda_venta": 1,
            "precio_venta": 1299.99,
            "precio_minimo": 1199.99,
        },
    ]


if __name__ == "__main__":
    uvicorn.run("main_simple:app", host="0.0.0.0", port=8001, reload=True)

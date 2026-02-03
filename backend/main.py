from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database.connection import engine
from sqlmodel import SQLModel
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

# Import all models to ensure they are registered with SQLModel
from src.models import *
from src.routes import api_router

# Create database tables
SQLModel.metadata.create_all(engine)

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

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEFAULT_MONEDA_ID: int = 277
    DEFAULT_DEPENDENCIA_ID: int = 4
    DEFAULT_PORCENTAJE_COMISION: float = 10.0
    DEFAULT_TRIBUTARIO: float = 5.0

    # Branding de la instalación: nombre corto de la empresa cliente y
    # su razón social para documentos. Cada despliegue lo configura en
    # su .env; el default de fábrica es el cliente de origen (Caguayo).
    EMPRESA_NOMBRE: str = "Caguayo"
    EMPRESA_RAZON_SOCIAL: str = "CAGUAYO S.A."

    SECRET_KEY: str = "change-me-in-production"

    # Messaging / thesis prototype.
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_MESSAGE_TOPIC: str = "caguayo.messages"

    # llama.cpp can expose an OpenAI-compatible HTTP API.
    LLM_PROVIDER: str = "llama.cpp"
    LLM_BASE_URL: str = "http://127.0.0.1:8080/v1"
    LLM_MODEL: str = "local-model"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

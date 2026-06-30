import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEFAULT_MONEDA_ID: int = 277
    DEFAULT_DEPENDENCIA_ID: int = 4
    DEFAULT_PORCENTAJE_CAGUAYO: float = 10.0
    DEFAULT_TRIBUTARIO: float = 5.0

    SECRET_KEY: str = "change-me-in-production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

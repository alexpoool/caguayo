# -*- coding: utf-8 -*-
"""El guard de identidad de bases de la migración.

Regresión de un fallo concreto: `comprobar_identidad()` comparaba el literal
"caguayo_sa" contra la base de la aplicación, porque `POSTGRES_DB` nunca está
en `os.environ` — el ETL la saca de `etl/config.py`, que a su vez la lee de los
`.env`. El guard no podía detectar nunca un ETL apuntado a otra base.

Aquí se comprueba que la comparación es real: cambia lo que cambie el `.env`,
la respuesta cambia.
"""
import os
from pathlib import Path

import pytest

from src.services import migracion_service
from src.services.migracion_service import (
    _base_destino_etl,
    cargar_config_etl,
    comprobar_identidad,
)

ETL_DIR = migracion_service.ETL_DIR
CONFIG_ETL = migracion_service.CONFIG_ETL


def _escribir_env(base: Path, nombre: str, lineas) -> Path:
    ruta = base / nombre
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    return ruta


@pytest.fixture
def proyecto(tmp_path, monkeypatch):
    """PROYECTO_DIR temporal y sin restos del entorno real."""
    monkeypatch.delenv("PROYECTO_DIR", raising=False)
    monkeypatch.delenv("PG_DB", raising=False)
    monkeypatch.delenv("POSTGRES_DB", raising=False)
    monkeypatch.delenv("PG_USER", raising=False)
    monkeypatch.delenv("POSTGRES_USER", raising=False)
    monkeypatch.delenv("PG_PASSWORD", raising=False)
    monkeypatch.delenv("POSTGRES_PASSWORD", raising=False)
    monkeypatch.delenv("DB_PORT", raising=False)
    monkeypatch.delenv("PG_PORT", raising=False)
    monkeypatch.delenv("PG_HOST", raising=False)
    monkeypatch.delenv("DB_HOST", raising=False)

    # `etl/config.py` se resuelve siempre por su ruta real; sólo cambia de dónde
    # lee el `.env`.
    monkeypatch.setenv("PROYECTO_DIR", str(tmp_path))
    return tmp_path


def _identidad(monkeypatch, base_app="caguayo_sa"):
    """La identidad tal y como la ve el guard, con la sesión fijada."""
    monkeypatch.setattr(
        "src.database.connection.get_current_db", lambda: base_app)
    return comprobar_identidad()


# --------------------------------------------------------------------------
# Lo que el ETL resuelve
# --------------------------------------------------------------------------
def test_etl_usa_backend_env(proyecto, monkeypatch):
    _escribir_env(proyecto, "backend/.env", ["POSTGRES_DB=desde_backend"])
    _escribir_env(proyecto, ".env", ["POSTGRES_DB=desde_raiz"])

    base, motivo = _base_destino_etl()

    assert motivo is None
    assert base == "desde_backend"


def test_etl_cae_al_env_de_la_raiz(proyecto):
    _escribir_env(proyecto, ".env", ["POSTGRES_DB=desde_raiz"])

    base, motivo = _base_destino_etl()

    assert motivo is None
    assert base == "desde_raiz"


def test_entorno_real_gana_a_los_ficheros(proyecto, monkeypatch):
    _escribir_env(proyecto, "backend/.env", ["POSTGRES_DB=desde_backend"])
    monkeypatch.setenv("PG_DB", "desde_entorno")

    base, motivo = _base_destino_etl()

    assert motivo is None
    assert base == "desde_entorno"


def test_sin_config_se_avisa_pero_no_revienta(proyecto, monkeypatch):
    monkeypatch.setattr(migracion_service, "CONFIG_ETL", proyecto / "no_existe.py")

    base, motivo = _base_destino_etl()

    assert base is None
    assert "no existe" in motivo
    assert cargar_config_etl()[0] is None


# --------------------------------------------------------------------------
# El guard
# --------------------------------------------------------------------------
def test_mismas_bases_es_coherente(proyecto, monkeypatch):
    _escribir_env(proyecto, "backend/.env", ["POSTGRES_DB=caguayo_sa"])

    identidad = _identidad(monkeypatch)

    assert identidad["coherente"] is True
    assert identidad["verificado"] is True
    assert identidad["detalle"] == []
    assert identidad["base_etl"] == identidad["base_app"] == "caguayo_sa"


def test_cambiar_solo_el_env_rompe_la_coherencia(proyecto, monkeypatch):
    """La regresión: el ETL apuntado a otra base tiene que verse.

    Con el guard anterior esto pasaba: `POSTGRES_DB` no está en `os.environ`, así
    que se comparaba contra el literal y salía coherente.
    """
    _escribir_env(proyecto, "backend/.env", ["POSTGRES_DB=otra_base"])

    identidad = _identidad(monkeypatch)

    assert identidad["coherente"] is False
    assert identidad["verificado"] is True
    assert "otra_base" in identidad["detalle"][0]
    assert "caguayo_sa" in identidad["detalle"][0]


def test_sesion_en_otra_base_tambien_cuenta(proyecto, monkeypatch):
    """La base que manda es la de la sesión, no la de una variable suelta."""
    _escribir_env(proyecto, "backend/.env", ["POSTGRES_DB=caguayo_sa"])

    identidad = _identidad(monkeypatch, base_app="tenant_01")

    assert identidad["coherente"] is False
    assert "tenant_01" in identidad["detalle"][0]


def test_sin_verificar_no_bloquea(proyecto, monkeypatch):
    """Despliegue sin `etl/`: avisa y deja migrar."""
    monkeypatch.setattr(migracion_service, "CONFIG_ETL", proyecto / "no_existe.py")

    identidad = _identidad(monkeypatch)

    assert identidad["coherente"] is True
    assert identidad["verificado"] is False
    assert identidad["base_etl"] == "(desconocida)"
    assert identidad["detalle"]


def test_proyecto_dir_se_restaura(proyecto):
    """Cargar la config del ETL no deja PROYECTO_DIR puesto en el entorno."""
    assert "PROYECTO_DIR" in os.environ

    cargar_config_etl()

    assert os.environ["PROYECTO_DIR"] == str(proyecto)


def test_config_etl_vive_donde_se_cree():
    """El path que usa el servicio es el de verdad, no uno inventado."""
    assert CONFIG_ETL == ETL_DIR / "config.py"
    assert CONFIG_ETL.exists(), "el ETL no está desplegado junto al backend"
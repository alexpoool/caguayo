import logging

import pytest

from src.access_log_filter import (
    SilenceNoisyAccessLog,
    install_access_log_filter,
)


def make_access_record(
    method: str,
    path: str,
    client: str = "127.0.0.1:44010",
    http_version: str = "1.1",
    status_code: int = 200,
) -> logging.LogRecord:
    """Construye un record con la misma forma que emite uvicorn.access."""
    return logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=483,
        msg='%s - "%s %s HTTP/%s" %d',
        args=(client, method, path, http_version, status_code),
        exc_info=None,
    )


# ── Rutas que SÍ se ocultan ────────────────────────────────────────────────


@pytest.mark.parametrize(
    "method, path",
    [
        ("POST", "/api/v1/logs"),
        ("GET", "/api/v1/logs"),
        ("POST", "/api/v1/logs/"),
        ("GET", "/api/v1/logs/stats"),
        ("GET", "/api/v1/logs/stream"),
    ],
)
def test_hides_all_logs_endpoint_traffic(method: str, path: str) -> None:
    assert SilenceNoisyAccessLog().filter(make_access_record(method, path)) is False


@pytest.mark.parametrize(
    "path", ["/api/v1/logs?tipo=REQUEST&limit=50", "/api/v1/logs/"]
)
def test_query_string_is_stripped_before_matching(path: str) -> None:
    """El access log incluye la query string; debe compararse solo el path."""
    assert SilenceNoisyAccessLog().filter(make_access_record("POST", path)) is False


@pytest.mark.parametrize("path", ["/", "/health"])
def test_hides_root_and_health(path: str) -> None:
    assert SilenceNoisyAccessLog().filter(make_access_record("GET", path)) is False


# ── Rutas que SÍ deben seguir apareciendo ───────────────────────────────────


@pytest.mark.parametrize(
    "method, path",
    [
        ("GET", "/api/v1/productos"),
        ("POST", "/api/v1/productos"),
        ("GET", "/api/v1/productos?search=cafe&limit=20"),
        ("POST", "/api/v1/ventas"),
        ("POST", "/api/v1/auth/login"),
        ("GET", "/api/v1/liquidaciones"),
        ("GET", "/api/v1/logsomething"),
    ],
)
def test_keeps_real_api_traffic(method: str, path: str) -> None:
    assert SilenceNoisyAccessLog().filter(make_access_record(method, path)) is True


def test_root_exact_match_does_not_swallow_every_other_path() -> None:
    """Regresión: '/' debe compararse por igualdad, no por prefijo.

    Si '/' se comparara con startswith, TODAS las rutas empezarían por '/'
    y el access log completo desaparecería, dejando la consola vacía.
    """
    log_filter = SilenceNoisyAccessLog()

    assert log_filter.filter(make_access_record("GET", "/")) is False
    assert log_filter.filter(make_access_record("GET", "/health")) is False
    # Cualquier otra ruta comparte el prefijo '/' y debe sobrevivir.
    assert log_filter.filter(make_access_record("GET", "/api/v1/productos")) is True
    assert log_filter.filter(make_access_record("POST", "/api/v1/logs")) is False


def test_keeps_records_that_are_not_access_records() -> None:
    """Un record sin args no viene del access log: no debe descartarse."""
    record = logging.LogRecord(
        name="uvicorn.error",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="Application startup complete.",
        args=None,
        exc_info=None,
    )

    assert SilenceNoisyAccessLog().filter(record) is True


# ── Instalación ────────────────────────────────────────────────────────────


def test_install_registers_filter_on_uvicorn_access() -> None:
    logger = logging.getLogger("uvicorn.access")
    logger.filters.clear()

    install_access_log_filter()

    assert any(isinstance(f, SilenceNoisyAccessLog) for f in logger.filters)


def test_install_is_idempotent() -> None:
    """Con --reload el módulo se reimporta; no deben acumularse filtros."""
    logger = logging.getLogger("uvicorn.access")
    logger.filters.clear()

    install_access_log_filter()
    install_access_log_filter()

    matching = [f for f in logger.filters if isinstance(f, SilenceNoisyAccessLog)]
    assert len(matching) == 1

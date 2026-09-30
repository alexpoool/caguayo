import logging
from typing import Iterable

# Paths que se ocultan solo si coinciden de forma exacta.
# "/" NO puede compararse por prefijo: toda ruta empieza por "/",
# y eso vaciaría el access log completo.
EXACT_PATHS = frozenset({"/", "/health"})

# Prefijos que se ocultan respetando la frontera de path:
# "/api/v1/logs" y "/api/v1/logs/..." se ocultan,
# pero "/api/v1/logsomething" se conserva.
PREFIXES = ("/api/v1/logs",)


def _record_path(record: logging.LogRecord) -> str | None:
    """Extrae el path de un record de uvicorn.access, o None si no lo es.

    uvicorn emite: logger.info('%s - "%s %s HTTP/%s" %d', client, method,
    path, http_version, status_code) — ver uvicorn/protocols/http/httptools_impl.py.
    El path es args[2] e incluye el query string.
    """
    args = record.args
    if not isinstance(args, tuple) or len(args) < 3:
        return None
    return args[2]


class SilenceNoisyAccessLog(logging.Filter):
    """Descarta del access log las peticiones de bajo ruido.

    El frontend reporta cada llamada a la API con un POST a /api/v1/logs
    (frontend/src/lib/api.ts:20), lo que genera más líneas de las que
    aporta el tráfico real de negocio.
    """

    def __init__(
        self,
        exact_paths: Iterable[str] = EXACT_PATHS,
        prefixes: Iterable[str] = PREFIXES,
    ):
        super().__init__()
        self.exact_paths = frozenset(exact_paths)
        self.prefixes = tuple(prefixes)

    def filter(self, record: logging.LogRecord) -> bool:
        path = _record_path(record)
        if path is None:
            return True

        path = path.split("?", 1)[0]

        if path in self.exact_paths:
            return False

        return not any(
            path == prefix or path.startswith(f"{prefix}/") for prefix in self.prefixes
        )


def install_access_log_filter() -> None:
    """Registra el filtro en uvicorn.access. Idempotente."""
    access_logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(f, SilenceNoisyAccessLog) for f in access_logger.filters):
        access_logger.addFilter(SilenceNoisyAccessLog())

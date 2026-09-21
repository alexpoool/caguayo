import pytest
from unittest.mock import AsyncMock, MagicMock

from src.repository.productos_en_liquidacion_repo import (
    productos_en_liquidacion_repo,
)


def _result_mock(codigos):
    result = MagicMock()
    result.all.return_value = codigos
    return result


class TestGetCodigoAnio:
    @pytest.mark.asyncio
    async def test_ignora_codigos_no_numericos(self):
        db = AsyncMock()
        db.exec.return_value = _result_mock(
            ["0001-LIQ-1", "001.002.0003-LIQ-7", "CAG.26.5", "26.V.3"]
        )
        assert await productos_en_liquidacion_repo.get_codigo_anio(db, 2026) == 6

    @pytest.mark.asyncio
    async def test_solo_codigos_liquidacion_ignorados(self):
        db = AsyncMock()
        db.exec.return_value = _result_mock(["0001-LIQ-1", "ANX-3-LIQ-7"])
        assert await productos_en_liquidacion_repo.get_codigo_anio(db, 2026) == 1

    @pytest.mark.asyncio
    async def test_sin_registros(self):
        db = AsyncMock()
        db.exec.return_value = _result_mock([])
        assert await productos_en_liquidacion_repo.get_codigo_anio(db, 2026) == 1

    @pytest.mark.asyncio
    async def test_maximo_estandar(self):
        db = AsyncMock()
        db.exec.return_value = _result_mock(["CAG.26.10", "OFI.26.42"])
        assert await productos_en_liquidacion_repo.get_codigo_anio(db, 2026) == 43
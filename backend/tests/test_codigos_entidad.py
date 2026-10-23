"""Test de regresión: siguiente_secuencia ignora códigos con segmento
final no numérico (ej. legacy '2014.006-CUC'), que antes reventaban con
InvalidTextRepresentationError al castear ::int."""

import pytest
from sqlalchemy import text

from src.utils.codigos_entidad import siguiente_secuencia


@pytest.mark.asyncio
async def test_siguiente_secuencia_ignora_segmento_no_numerico(db_session):
    # Tabla temporal: vive en la conexión de esta sesión, sin commit
    await db_session.exec(
        text("CREATE TEMP TABLE tmp_test_codigos (codigo varchar(50)) ON COMMIT DROP")
    )
    await db_session.exec(
        text(
            "INSERT INTO tmp_test_codigos (codigo) VALUES "
            "('FT.26.012'), ('2026.041'), ('2014.006-CUC'), (''), (NULL)"
        )
    )

    sec = await siguiente_secuencia(db_session, "tmp_test_codigos", "codigo")
    # MAX('012'=12, '041'=41, '-CUC' ignorado) + 1
    assert sec == 42

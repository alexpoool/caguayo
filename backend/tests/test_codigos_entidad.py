"""Test de regresión: siguiente_secuencia ignora códigos con segmento
final no numérico (ej. legacy '2014.006-CUC'), que antes reventaban con
InvalidTextRepresentationError al castear ::int."""

import pytest
from sqlalchemy import text

from src.utils.codigos_entidad import (
    generar_codigo_contrato,
    generar_codigo_correlativo,
    generar_numero_liquidacion_persona,
    secuencia_de_codigo,
    siguiente_secuencia,
    siguiente_secuencia_anio,
    siguiente_secuencia_liquidacion,
)


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


@pytest.mark.asyncio
async def test_siguiente_secuencia_anio_continua_la_serie(db_session):
    await db_session.exec(
        text("CREATE TEMP TABLE tmp_test_codigos_anio (codigo varchar(50)) ON COMMIT DROP")
    )
    await db_session.exec(
        text(
            "INSERT INTO tmp_test_codigos_anio (codigo) VALUES "
            "('FT.2026.045'), ('1.FT.2026.045'), ('2.FT.2026.045'), "
            "('FT.2026.045-123'), ('FT.2025.999'), ('FT.26.3728'), "
            "('2014.006-CUC'), (''), (NULL)"
        )
    )

    sec = await siguiente_secuencia_anio(
        db_session, "tmp_test_codigos_anio", "codigo", 2026
    )
    assert sec == 46


@pytest.mark.asyncio
async def test_siguiente_secuencia_anio_acepta_mes_y_sufijo(db_session):
    await db_session.exec(
        text("CREATE TEMP TABLE tmp_test_codigos_mes (codigo varchar(50)) ON COMMIT DROP")
    )
    await db_session.exec(
        text(
            "INSERT INTO tmp_test_codigos_mes (codigo) VALUES "
            "('CAG.2026.07.014'), ('FT.2026.07.014-99')"
        )
    )

    sec = await siguiente_secuencia_anio(
        db_session, "tmp_test_codigos_mes", "codigo", 2026
    )
    assert sec == 15


def test_codigos_etl_usan_anio_de_cuatro_digitos():
    assert generar_codigo_contrato("FT", 2026, 46) == "FT.2026.046"
    assert generar_codigo_correlativo("FT", 2026, 46) == "FT.2026.046"


@pytest.mark.asyncio
async def test_siguiente_secuencia_anio_sin_codigos(db_session):
    await db_session.exec(
        text("CREATE TEMP TABLE tmp_test_codigos_vacio (codigo varchar(50)) ON COMMIT DROP")
    )

    sec = await siguiente_secuencia_anio(
        db_session, "tmp_test_codigos_vacio", "codigo", 2027
    )
    assert sec == 1


@pytest.mark.parametrize(
    "codigo, esperado",
    [
        ("LEG-115-5662", 115),
        ("LEG-115", None),
        ("LEG-5662", None),
        ("LEG--238-1043", None),
        ("LEG-", None),
        ("FT.26.115", 115),
        ("FT.26.115-1043", 115),
        ("CAG.26.5.115", 115),
        ("1.CAG.26.5.115", 115),
        ("CAG.26.5.001", 1),
        ("CAG.26.5.000", None),
        ("FT.26.", None),
        ("", None),
        (None, None),
    ],
)
def test_secuencia_de_codigo_entiende_legacy_y_app(codigo, esperado):
    assert secuencia_de_codigo(codigo) == esperado


def test_generar_numero_liquidacion_persona():
    assert generar_numero_liquidacion_persona("FT", 2026, 116) == "FT.26.116"


@pytest.mark.asyncio
async def test_siguiente_secuencia_liquidacion_continua_legacy(db_session):
    await db_session.exec(
        text(
            "CREATE TEMP TABLE tmp_liq_legacy "
            "(codigo varchar(50), fecha_emision date) ON COMMIT DROP"
        )
    )
    await db_session.exec(
        text(
            "INSERT INTO tmp_liq_legacy (codigo, fecha_emision) VALUES "
            "('LEG-115-5662', '2026-01-01'), "
            "('CAG.26.5.001', '2026-02-01'), "
            "('LEG-114-5661', '2025-12-31')"
        )
    )

    assert (
        await siguiente_secuencia_liquidacion(
            db_session, "tmp_liq_legacy", "codigo", 2026
        )
        == 116
    )
    assert (
        await siguiente_secuencia_liquidacion(
            db_session, "tmp_liq_legacy", "codigo", 2025
        )
        == 115
    )


@pytest.mark.asyncio
async def test_siguiente_secuencia_liquidacion_proyectos(db_session):
    await db_session.exec(
        text(
            "CREATE TEMP TABLE tmp_liq_proyectos "
            "(numero varchar(50), fecha_emision date) ON COMMIT DROP"
        )
    )
    await db_session.exec(
        text(
            "INSERT INTO tmp_liq_proyectos (numero, fecha_emision) VALUES "
            "('FT.26.115', '2026-01-01'), "
            "('FT.26.115-1043', '2026-01-02'), "
            "('FT.25.900', '2025-12-31')"
        )
    )

    assert (
        await siguiente_secuencia_liquidacion(
            db_session, "tmp_liq_proyectos", "numero", 2026
        )
        == 116
    )
    assert (
        await siguiente_secuencia_liquidacion(
            db_session, "tmp_liq_proyectos", "numero", 2025
        )
        == 901
    )

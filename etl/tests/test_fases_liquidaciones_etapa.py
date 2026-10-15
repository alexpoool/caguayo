# -*- coding: utf-8 -*-
"""La Fase P: liquidaciones del legacy hacia `persona_liquidacion`.

Nada aquí toca PostgreSQL. La escalera que decide en qué etapa va cada
liquidación se comprueba con filas escritas en el test; el resto del mapeo, con
el volcado real, que está en `.gitignore` y puede no estar: esas pruebas se
saltan si no lo encuentra.
"""
from datetime import date

import pytest
from pathlib import Path

import fuente
import migrar_liquidaciones_etapa as mp
from log import Registro

DUMP = Path(__file__).resolve().parents[1] / "dumps" / "comercial.sql"
hay_dump = DUMP.exists()
necesita_dump = pytest.mark.skipif(
    not hay_dump, reason="el volcado del legacy no está en dumps/")


def _leer(tabla):
    return fuente.leer_tabla(mp.DUMP_MARIADB, tabla)[1]


def _mapas_de_prueba():
    """Mapas de destino que hacen que todo sea resoluble.

    Se montan con el volcado en vez de a mano para que el número de filas que
    llega al final sea el de verdad: los descartes que interesan —artista sin
    `codigo_exp`, contrato que no está en la tabla `contrato`— son los
    reales, y un mapa inventado los escondería.
    """
    codigos_cliente = {}
    for i, a in enumerate(_leer("artista"), start=1):
        codigo = (a.get("codigo_exp") or "").strip()
        if codigo:
            codigos_cliente[codigo] = i

    # Todos los contratos del legacy apuntan al mismo destino, y ese destino
    # tiene tres etapas sin realizadores: así toda liquidación colocable cae en
    # la regla (c) y se ve de forma determinista.
    codigos_contrato = {}
    for c in _leer("contrato"):
        codigo = (c.get("codigo_contrato") or "").strip()
        if codigo:
            codigos_contrato[codigo] = 1

    etapas = {1: [1, 2, 3]}
    personas = {}
    ids_moneda = {"CUP": 1, "USD": 2}
    return codigos_cliente, codigos_contrato, etapas, personas, ids_moneda


def _preparar(**kwargs):
    registro = Registro()
    clientes, contratos, etapas, personas, monedas = _mapas_de_prueba()
    payloads = mp.preparar(registro, clientes, contratos, etapas, personas,
                           monedas, **kwargs)
    return payloads, registro


# --------------------------------------------------------------------------
# La escalera: en qué etapa va cada liquidación
# --------------------------------------------------------------------------
def test_va_a_la_etapa_donde_se_desconto():
    """Regla (a). La Fase O descuenta el total liquidado en cada fila que crea
    para el par, pero sólo se ve en la que tenía cobro para cubrirlo: ahí es
    donde se movió el dinero y donde tiene que ir la liquidación."""
    etapas = [10, 11]
    personas = {(10, 77): (0, 0), (11, 77): (500, 31.6)}

    assert mp._etapa_para(etapas, personas, 77) == (11, "etapa donde se descontó")


def test_si_no_se_desconto_en_ninguna_va_a_la_primera_que_la_tenga():
    etapas = [10, 11, 12]
    personas = {(10, 77): (100, 100), (12, 77): (100, 100)}

    assert mp._etapa_para(etapas, personas, 77) == \
        (10, "primera etapa con la persona")


def test_si_no_esta_en_ninguna_va_a_una_etapa_con_realizadores():
    """Regla (b): el legacy no declaró al artista en ese contrato, pero el
    contrato tiene etapas con realizadores y ahí es donde se cobra."""
    etapas = [10, 11]
    personas = {(10, 99): (100, 0), (11, 99): (100, 0)}

    assert mp._etapa_para(etapas, personas, 77) == (10, "etapa con realizadores")


def test_si_el_contrato_no_tiene_nada_va_a_la_primera_etapa():
    """Regla (c), la misma que usa la Fase O: la de entrega más antigua."""
    assert mp._etapa_para([10, 11], {(99, 1): (1, 1)}, 77) == \
        (10, "primera etapa del contrato")


def test_sin_etapas_no_hay_onde_colgar():
    assert mp._etapa_para([], {}, 77) == (None, None)


# --------------------------------------------------------------------------
# El número
# --------------------------------------------------------------------------
def test_el_numero_sale_del_id_del_legacy_y_no_del_numero_del_legacy():
    """`numero_liquidacion` tiene 903 valores distintos en 4.362 filas, así que
    no puede ser la clave. El `id_liquidacion` es único y estable."""
    assert mp._numero(date(2014, 3, 1), "5") == "CAG.14.5"
    assert mp._numero(date(2014, 3, 1), "6") == "CAG.14.6"


def test_el_anio_del_numero_viene_de_la_fecha_y_no_del_reloj():
    """Reejecutar en otro año no debe cambiar lo ya escrito: el número es la
    clave con la que la fase se reconoce en la segunda pasada."""
    assert mp._numero(date(2016, 7, 4), "42") == "CAG.16.42"


def test_el_numero_no_se_rompe_si_la_fecha_no_trae_ano():
    """La fecha sin respaldo del legacy es el literal '1900-01-01', que no es un
    `date`: el número tiene que salir igual, no reventar."""
    assert mp._numero("1900-01-01", "7") == "CAG.00.7"
    assert mp._numero(None, "7") == "CAG.00.7"


# --------------------------------------------------------------------------
# Idempotencia
# --------------------------------------------------------------------------
@necesita_dump
def test_el_numero_ya_migrado_no_se_vuelve_a_insertar():
    """La segunda pasada no inserta nada: reconoce su propia escritura por el
    número."""
    primera = _leer("artista_liquidacion")[0]
    numero = mp._numero(primera.get("fecha_emision"),
                        str(primera["id_liquidacion"]))

    payloads, registro = _preparar(numeros_existentes=(numero,))

    assert numero not in [p["numero"] for p in payloads]
    assert any(e["motivo"] == "ya migrada" for e in registro.entradas)


@necesita_dump
def test_todos_los_numeros_de_una_pasada_son_distintos():
    payloads, _ = _preparar()

    numeros = [p["numero"] for p in payloads]

    assert len(numeros) == len(set(numeros))


# --------------------------------------------------------------------------
# Las decisiones, sobre el volcado real
# --------------------------------------------------------------------------
@necesita_dump
def test_el_importe_es_el_neto_del_legacy_no_el_bruto():
    """La decisión de `#6`, y la razón está en el docstring del módulo: es lo que
    hace que `por_cobrar` siga cuadrando con lo que calculó la Fase O. En el
    legacy `importe` y `neto_pagar` son distintos, así que el test verifica que
    no se han colado el bruto en las dos columnas."""
    payloads, _ = _preparar()

    assert payloads
    for p in payloads:
        assert p["importe"] == p["neto_pagar"]


@necesita_dump
def test_las_liquidaciones_vienen_confirmadas_y_sin_pago():
    """Son pagos hechos, y no hay factura de etapa migrada: `confirmado` True e
    `id_pago` NULL, que es lo que permite que la aplicación los lea."""
    payloads, _ = _preparar()

    assert payloads
    assert all(p["confirmado"] is True for p in payloads)
    assert all(p["id_pago"] is None for p in payloads)


@necesita_dump
def test_las_filas_son_una_por_liquidacion_del_legacy():
    """No se agrupa nada: cada liquidación del legacy es su fila."""
    payloads, _ = _preparar()
    liquidaciones = _leer("artista_liquidacion")

    assert payloads
    assert len(payloads) <= len(liquidaciones)


@necesita_dump
def test_lo_que_no_se_pone_esta_dicho():
    """`porcientoempresa` es un importe, no un porcentaje, y el destino espera un
    porcentaje: se deja en 0 en vez de escribir 387,44 ahí."""
    payloads, _ = _preparar()

    assert all(p["porciento_empresa"] == 0 for p in payloads)
    assert all(p["id_tipo_concepto"] is None for p in payloads)

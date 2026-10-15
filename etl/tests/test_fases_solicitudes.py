# -*- coding: utf-8 -*-
"""Las fases N y O: solicitudes, etapas, tareas y personas.

Nada aquí toca PostgreSQL. Se comprueban las reglas puras con filas escritas en
el test y el mapeo completo contra el volcado real, que está en `.gitignore` y
puede no estar: esas pruebas se saltan si no lo encuentra.
"""
import pytest
from pathlib import Path

import diagnostico
import migrar_contratos as mc
import migrar_etapas as me
import migrar_solicitudes as ms
from log import Registro

DUMP = Path(__file__).resolve().parents[1] / "dumps" / "comercial.sql"
hay_dump = DUMP.exists()
necesita_dump = pytest.mark.skipif(
    not hay_dump, reason="el volcado del legacy no está en dumps/")


# --------------------------------------------------------------------------
# Las columnas del legacy
# --------------------------------------------------------------------------
def test_el_codigo_de_la_solicitud_se_copia_tal_cual():
    """`codigo_solicitud` no es UNIQUE en el destino y seis del legacy vienen
    repetidos: se copian como están."""
    codigo, generado = ms._codigo("2014.001", "7", "2014-03-01")

    assert codigo == "2014.001"
    assert generado is False


def test_el_codigo_que_falta_sale_del_id_del_legacy():
    """El que se inventa tiene que ser el mismo en cada pasada.

    Si se sacara de `MAX(...) + 1` sobre lo que ya hay, la segunda pasada vería un
    número mayor, no reconocería lo que escribió la primera y duplicaría las 282
    solicitudes sin código. El `id_solicitudsc` es único, estable y está por
    encima del 581 del legacy."""
    codigo, generado = ms._codigo(None, "1543", "2014-03-01")

    assert generado is True
    assert codigo == "CAG.14.1543"


def test_el_anio_del_codigo_nuevo_viene_de_la_fecha_y_no_del_reloj():
    """Reejecutar en enero no debe cambiar los códigos ya escritos."""
    assert ms._codigo(None, "1543", "2014-03-01")[0] == \
        ms._codigo(None, "1543", "2014-03-01")[0]


# --------------------------------------------------------------------------
# codigo_proyecto
# --------------------------------------------------------------------------
class _CursorFalso:
    """Cursor que responde a las dos consultas de `_generar_codigos_proyecto`."""

    def __init__(self, candidatas, maximo):
        self._candidatas = candidatas
        self._maximo = maximo
        self.actualizado = []

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        if "codigo_proyecto IS NULL" in sql:
            self._filas = self._candidatas
        else:
            self._filas = [(self._maximo,)]

    def fetchall(self):
        return self._filas

    def fetchone(self):
        return self._filas[0]

    def executemany(self, sql, lote):
        self.actualizado.extend(lote)


class _ConexionFalsa:
    def __init__(self, candidatas, maximo):
        self.cursor_falso = _CursorFalso(candidatas, maximo)

    def cursor(self):
        return self.cursor_falso

    def commit(self):
        pass


@pytest.mark.parametrize("aprobado,con_contrato,debe_tener", [
    (True, True, True),
    (True, False, False),
    (False, True, False),
    (False, False, False),
])
def test_codigo_proyecto_solo_con_aprobado_y_contrato(aprobado, con_contrato,
                                                    debe_tener):
    """La misma regla que `servicio_service.py:187-190`.

    El filtro va en el SQL de la función, así que lo que se comprueba aquí es que
    sólo llegan candidatas las que lo cumplen; el `WHERE` completo seMira en la
    consulta de integración."""
    candidatas = [(1, 2018)] if (aprobado and con_contrato) else []
    conn = _ConexionFalsa(candidatas, 0)

    generadas = ms._generar_codigos_proyecto(conn, Registro())

    assert (generadas > 0) is debe_tener


def test_el_formato_del_codigo_de_proyecto_es_cag_aa_nnn():
    conn = _ConexionFalsa([(7, 2018)], 0)

    ms._generar_codigos_proyecto(conn, Registro())

    assert conn.cursor_falso.actualizado == [("CAG.18.001", 7)]


def test_la_serie_empieza_despues_del_maximo_que_haya():
    """La serie de la app es global (`siguiente_secuencia` toma el MAX de toda la
    columna), así que arrancar en 1 repetiría un código ya escrito."""
    conn = _ConexionFalsa([(7, 2018), (8, 2022)], 50)

    ms._generar_codigos_proyecto(conn, Registro())

    assert conn.cursor_falso.actualizado == [("CAG.18.051", 7),
                                             ("CAG.22.052", 8)]


def test_sin_candidatas_no_escribe_nada():
    """La segunda pasada: 0 filas, 0 actualizaciones, y ni un `executemany`."""
    conn = _ConexionFalsa([], 97)

    assert ms._generar_codigos_proyecto(conn, Registro()) == 0
    assert conn.cursor_falso.actualizado == []


def test_los_tres_valores_de_material_asumido():
    """El legacy tiene tres y el destino un booleano. Los dos raros avisan,
    porque esto es leer un nombre de columna, no un dato."""
    assert ms._material_asumido("Artista") == (True, [])
    assert ms._material_asumido("Cliente") == (False, [])
    assert ms._material_asumido(None) == (False, [])
    assert ms._material_asumido("")[0] is False

    booleano, avisos = ms._material_asumido("Artista Cliente")
    assert booleano is True
    assert len(avisos) == 1


def test_el_estado_siempre_en_proceso():
    """El estado se inventa para que la fila se vea en proyectos."""
    assert ms.ESTADO_MIGRACION == "EN PROCESO"


def test_la_revision_aprueba_siempre():
    """Todas las solicitudes se dan por aprobadas y ninguna queda para revisar."""
    assert ms._revision() == (True, False, None)


# --------------------------------------------------------------------------
# El autodiagnóstico
# --------------------------------------------------------------------------
def test_el_informe_dice_donde_y_por_que():
    """Un fallo sin dónde y sin por qué no se puede arreglar."""
    d = diagnostico.Diagnostico()
    d.falla("O etapas", "3 etapas no llegan a ninguna solicitud",
            "etapas_cs.id_contrato / etapas_cs.id_suplemento", "3 de 2058 (0,1%)",
            "id_etapa 111",
            "el complemento no tiene contrato, y sin contrato no hay "
            "id_solicitudsc con el que llegar a la solicitud",
            "se descartan")

    assert len(d.fallos) == 1
    linea = d.lineas[0]
    assert linea[0] == "FALLA"
    assert linea[3]["donde"].startswith("etapas_cs")
    assert "id_solicitudsc" in linea[3]["porque"]
    assert linea[3]["efecto"]


def test_el_informe_no_verde_si_falla():
    d = diagnostico.Diagnostico()
    d.ok("N", "todo bien")
    assert d.imprimir() == 0

    d2 = diagnostico.Diagnostico()
    d2.falla("O", "algo mal", "tabla.columna", "1 de 1", None, "porque", "efecto")
    assert d2.imprimir() == 1


def test_el_autodiagnostico_coge_los_repetidos():
    """La clave primaria de `persona_etapa` es (id_etapa, id_persona) y el
    servicio rechaza el duplicado, así que tiene que salir como fallo."""
    d = diagnostico.Diagnostico()
    personas = [
        {"id_etapa": 7, "id_persona": 1, "asignada_por_migracion": False,
         "motivo_asignacion": None},
        {"id_etapa": 7, "id_persona": 1, "asignada_por_migracion": False,
         "motivo_asignacion": None},
    ]
    revisar = diagnostico.revisar_etapas
    # `ids_etapa` es el mapa {indice_del_payload: id_etapa}; sus valores son
    # los ids válidos, que es lo que se contrasta con el id de cada persona.
    revisar(d, [{"id_solicitud_servicio": 1, "valor": 1, "nombre_etapa": "x"}],
            {0: 7}, [], personas, None)

    fallos = [f[2] for f in d.fallos]
    assert any("repetidos" in t for t in fallos), fallos


# --------------------------------------------------------------------------
# Contra el volcado real
# --------------------------------------------------------------------------
def _arnes():
    """Los mismos mapas que leen de PostgreSQL, sacados del dump."""
    import fuente

    _, clientes = fuente.leer_tabla(str(DUMP), "cliente")
    ids_cliente = {}
    for i, c in enumerate(clientes, start=1):
        codigo = (c.get("codigo") or "").strip() or ms._codigo_de_rescate(
            {"_id": c["id_cliente"]})
        ids_cliente[codigo] = i
    for j, a in enumerate(fuente.leer_artistas(str(DUMP)),
                          start=len(clientes) + 1):
        codigo = (a.get("codigo_exp") or "").strip()
        if codigo and codigo not in ids_cliente:
            ids_cliente[codigo] = j

    _, contratos = fuente.leer_tabla(str(DUMP), "contrato")
    usados, ids_contrato = set(), {}
    for i, c in enumerate(contratos, start=1):
        codigo = (c.get("codigo_contrato") or "").strip() or "LEG-%s" % c["id_contrato"]
        if codigo in usados:
            codigo = "%s-%s" % (codigo, c["id_contrato"])
        usados.add(codigo)
        ids_contrato[codigo] = i
    return ids_cliente, ids_contrato


@necesita_dump
def test_el_mapeo_completo_no_tiene_duplicados_ni_huerfanos():
    ids_cliente, ids_contrato = _arnes()
    registro = Registro()
    monsoon = {"USD": 1, "CUP": 3}

    solicitudes, id_legacy = ms.preparar(registro, ids_cliente, set())
    ids_solicitud = {p["codigo_solicitud"]: 1000 + i
                     for i, p in enumerate(solicitudes)}
    etapas, primera, reales = me.preparar_etapas(
        registro, ids_contrato, ids_solicitud, monsoon, id_legacy)
    personas = me.preparar_personas(registro, etapas, list(range(len(etapas))),
                                    primera, reales, ids_cliente, monsoon)

    assert solicitudes, "no entró ninguna solicitud"
    assert all(p["id_cliente"] for p in solicitudes)
    assert all(p["estado"] == "EN PROCESO" for p in solicitudes)
    assert all(e["id_solicitud_servicio"] for e in etapas)
    assert all(p["valor"] is not None for p in etapas)

    pares = {(p["id_etapa"], p["id_persona"]) for p in personas}
    assert len(pares) == len(personas), "hay pares (etapa, persona) repetidos"

    marcados = [p for p in personas if p["asignada_por_migracion"]]
    assert marcados, "ninguna persona quedó marcada como concentrada"
    assert all(p["motivo_asignacion"] for p in marcados)


@necesita_dump
def test_las_solicitudes_vienen_todas_aprobadas():
    ids_cliente, _ = _arnes()
    solicitudes, _ = ms.preparar(Registro(), ids_cliente, set())

    assert solicitudes, "el dump no trajo solicitudes"
    assert all(p["aprobado"] for p in solicitudes)
    assert not [p for p in solicitudes if p["estado_por_revisar"]]
    assert all(p["motivo_revision"] is None for p in solicitudes)
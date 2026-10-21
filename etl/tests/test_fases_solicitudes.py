# -*- coding: utf-8 -*-
"""Las fases N y O: solicitudes, etapas, tareas y personas.

Nada aquí toca PostgreSQL. Se comprueban las reglas puras con filas escritas en
el test y el mapeo completo contra el volcado real, que está en `.gitignore` y
puede no estar: esas pruebas se saltan si no lo encuentra.
"""
import pytest
from pathlib import Path

import diagnostico
import migrar_etapas as me
import migrar_solicitudes as ms
import reglas_legacy as rl
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
def _contratos_destino():
    """Replica lo que la Fase L dejó en el destino: código -> (id del legacy,
    fila, símbolo). Un contrato con las dos monedas sale dos veces, con `1.` y
    `2.`, como en PostgreSQL."""
    import fuente

    _, contratos = fuente.leer_tabla(str(DUMP), "contrato")
    usados, salida = set(), {}
    for c in contratos:
        id_legacy = str(c["id_contrato"])
        base = (c.get("codigo_contrato") or "").strip() or "LEG-%s" % id_legacy
        importes, _ = rl.importes_por_moneda(
            c.get("valor_contratocuc"), c.get("valor_contratocup"))
        hay_dos = len(importes) == 2
        for _monto, simbolo in importes:
            codigo = rl.codigo_de_copia(base, simbolo, hay_dos)
            if codigo in usados:
                codigo = "%s-%s" % (codigo, id_legacy)
            usados.add(codigo)
            salida[codigo] = (id_legacy, c, simbolo)
    return salida


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

    ids_contrato = {codigo: i
                    for i, codigo in enumerate(_contratos_destino(), start=1)}
    return ids_cliente, ids_contrato


@necesita_dump
def test_el_mapeo_completo_no_tiene_duplicados_ni_huerfanos():
    ids_cliente, ids_contrato = _arnes()
    registro = Registro()
    monsoon = {"USD": 1, "CUP": 3, "CUC": 2}

    solicitudes, enlaces = ms.preparar(registro, ids_cliente, ids_contrato, set())
    ids_solicitud = {p["codigo_solicitud"]: 1000 + i
                     for i, p in enumerate(solicitudes)}

    destinos = _contratos_destino()
    solicitud_por_contrato, contrato_por_solicitud = {}, {}
    for cod_sol, cod_dest in enlaces.items():
        id_legacy, c, simbolo = destinos[cod_dest]
        id_sol = ids_solicitud[cod_sol]
        solicitud_por_contrato.setdefault(id_legacy, {})[simbolo] = id_sol
        contrato_por_solicitud[id_sol] = (id_legacy, c, simbolo)

    etapas, primera, reales = me.preparar_etapas(
        registro, solicitud_por_contrato, contrato_por_solicitud,
        set(ids_solicitud.values()), monsoon)
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
    solicitudes, _ = ms.preparar(Registro(), ids_cliente, set(), set())

    assert solicitudes, "el dump no trajo solicitudes"
    assert all(p["aprobado"] for p in solicitudes)
    assert not [p for p in solicitudes if p["estado_por_revisar"]]
    assert all(p["motivo_revision"] is None for p in solicitudes)


# --------------------------------------------------------------------------
# Resolución del cliente: por código -> por NIT -> pivote
# --------------------------------------------------------------------------
def _origen(monkeypatch, **tablas):
    """Sustituye `fuente.leer_tabla` por `{tabla: (columnas, filas)}`."""
    import fuente

    def _leer(_ruta, nombre, *a, **k):
        columnas, filas = tablas[nombre]
        return list(columnas), filas

    monkeypatch.setattr(fuente, "leer_tabla", _leer)


def _solicitud(**cambios):
    fila = {
        "id_solicitudsc": "10", "descripcion": "Proyecto",
        "codigo_solicitudsc": "2014.010", "fecha_solicitudsc": "2014-02-12",
        "id_cliente": "5", "mat_asumidos": "", "aprobada": "Si",
    }
    fila.update(cambios)
    return fila


def test_solicitud_cliente_recuperado_por_nit(monkeypatch):
    """La Fase B descartó al cliente por código duplicado, pero el superviviente
    tiene el mismo NIT: la solicitud se recupera por NIT en vez de descartarse."""
    _origen(monkeypatch,
            solicitud_sc=([], [_solicitud()]),
            cliente=([], [{"id_cliente": "5", "codigo": "NO-EXISTE",
                           "nit": "10001007106"}]),
            contrato=([], []))

    registro = Registro()
    payloads, _ = ms.preparar(
        registro, {"OTRO": 1, "SIN-CLIENTE": 99}, set(), set(),
        {"10001007106": 77})

    assert payloads[0]["id_cliente"] == 77
    assert any(e["motivo"] == "cliente recuperado por NIT"
               for e in registro.entradas)


def test_solicitud_sin_cliente_migrado_va_al_pivote(monkeypatch):
    """Sin código ni NIT que resuelvan, la solicitud se cuelga del pivote en vez
    de descartarse."""
    _origen(monkeypatch,
            solicitud_sc=([], [_solicitud()]),
            cliente=([], [{"id_cliente": "5", "codigo": "NO-EXISTE",
                           "nit": "00000000000"}]),
            contrato=([], []))

    registro = Registro()
    payloads, _ = ms.preparar(
        registro, {"SIN-CLIENTE": 99}, set(), set(), {})

    assert payloads[0]["id_cliente"] == 99
    assert any(e["motivo"] == "cliente pivote" for e in registro.entradas)


def test_solicitud_sin_fecha_va_con_la_de_su_contrato(monkeypatch):
    """329 solicitudes del legacy no traen fecha; las 329 tienen contrato y el
    contrato sí la trae: la dateless toma la de su contrato, no la de sus
    hermanas del cliente."""
    contrato = {
        "id_solicitudsc": "10", "id_contrato": "3",
        "codigo_contrato": "CON-1", "fecha": "2019-03-14 00:00:00",
        "valor_contratocuc": "100.00", "valor_contratocup": "0.00",
    }
    _origen(monkeypatch,
            solicitud_sc=([], [_solicitud(fecha_solicitudsc="0000-00-00")]),
            cliente=([], [{"id_cliente": "5", "codigo": "CLIENTE",
                           "nit": None}]),
            contrato=([], [contrato]))

    registro = Registro()
    payloads, _ = ms.preparar(
        registro, {"CLIENTE": 11}, {"CON-1": 1}, set())

    assert payloads[0]["fecha_solicitud"] == "2019-03-14"
    aviso = next((e for e in registro.entradas
                  if e["motivo"] == "fecha 0000-00-00 en el legacy"), None)
    assert aviso, registro.entradas
    assert "documento del que viene" in aviso["detalle"]


def test_solicitud_sin_fecha_y_su_contrato_tambien(monkeypatch):
    """La cascada no cambia para el caso raro: contrato sin fecha -> la fecha
    más antigua de las solicitudes del mismo cliente."""
    contrato = {
        "id_solicitudsc": "10", "id_contrato": "3",
        "codigo_contrato": "CON-1", "fecha": "0000-00-00",
        "valor_contratocuc": "100.00", "valor_contratocup": "0.00",
    }
    hermana = _solicitud(codigo_solicitudsc="2014.011",
                         fecha_solicitudsc="2014-02-12")
    _origen(monkeypatch,
            solicitud_sc=([], [
                hermana,
                _solicitud(fecha_solicitudsc="0000-00-00"),
            ]),
            cliente=([], [{"id_cliente": "5", "codigo": "CLIENTE",
                           "nit": None}]),
            contrato=([], [contrato]))

    registro = Registro()
    payloads, _ = ms.preparar(
        registro, {"CLIENTE": 11}, {"CON-1": 1}, set())

    por_codigo = {p["codigo_solicitud"]: p for p in payloads}
    assert por_codigo["2014.010"]["fecha_solicitud"] == "2014-02-12"

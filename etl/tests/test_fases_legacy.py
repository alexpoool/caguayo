# -*- coding: utf-8 -*-
"""Las fases K, L y M: liquidaciones, contratos y suplementos.

Nada aquí toca PostgreSQL: se prueban las reglas puras de `reglas_legacy` y el
armado de payloads con el `leer_tabla` sustituido por filas escritas aquí. El
dump real no se usa, para que los tests no dependan de un fichero de varios MB
que además lleva datos personales y está en `.gitignore`.
"""
import migrar_contratos
import migrar_etapas
import migrar_liquidaciones
import migrar_suplementos
import pytest
import reglas_legacy as rl
from log import Registro


# --------------------------------------------------------------------------
# Moneda
# --------------------------------------------------------------------------
@pytest.mark.parametrize("cuc,cup,simbolo,monto", [
    ("0.00", "1500.00", "CUP", "1500.00"),
    ("2500.00", "0.00", "USD", "2500.00"),
    ("2500.00", "1500.00", "CUP", "1500.00"),
    ("0.00", "0.00", "USD", "0.00"),
])
def test_monto_y_moneda(cuc, cup, simbolo, monto):
    """CUP manda cuando hay las dos: el destino no tiene CUC y no hay tipo de
    cambio con el que convertirlo."""
    valor, simbolo_elegido, avisos = rl.monto_y_moneda(cuc, cup)

    assert str(valor) == monto
    assert simbolo_elegido == simbolo
    if cup != "0.00" and cuc != "0.00":
        assert any(m == "moneda CUC traducida a USD" for m, _, _ in avisos)


def test_las_dos_monedas_avisan_del_importe_perdido():
    _, _, avisos = rl.monto_y_moneda("2500.00", "1500.00")

    assert len(avisos) == 1
    motivo, _, detalle = avisos[0]
    assert "cuc" in detalle and "cup" in detalle


def test_sin_importe_avisa():
    _, simbolo, avisos = rl.monto_y_moneda("0.00", "0.00")

    assert simbolo == "USD"
    assert avisos[0][0] == "sin importe en el legacy"


def test_simbolo_destino_traduce_cuc():
    """La liquidación trae la moneda en su propia columna: no hay dos importes
    que elegir, sólo uno y la moneda en la que está."""
    simbolo, avisos = rl.simbolo_destino("CUC")

    assert simbolo == "USD"
    assert avisos[0][0] == "moneda CUC traducida a USD"


def test_simbolo_destino_deja_cup():
    assert rl.simbolo_destino("CUP")[0] == "CUP"


def test_simbolo_desconocido_no_reventa():
    simbolo, avisos = rl.simbolo_destino("XYZ")

    assert simbolo == "USD"
    assert avisos, "una moneda desconocida tiene que avisar, no decidirse en silencio"


# --------------------------------------------------------------------------
# Estado
# --------------------------------------------------------------------------
ESTADOS = {"ACTIVO": 1, "CANCELADO": 2, "FINALIZADO": 3, "PENDIENTE": 4}


@pytest.mark.parametrize("id_legacy,id_destino,avisa", [
    ("1", 4, False),
    ("2", 3, False),
    ("3", 2, False),
    ("0", 4, True),
])
def test_estado_legacy(id_legacy, id_destino, avisa):
    valor, avisos = rl.estado_legacy(id_legacy, ESTADOS)

    assert valor == id_destino
    assert bool(avisos) is avisa


def test_estado_inexistente_en_el_destino_reventa():
    """Callar aquí dejaría contratos con un id de estado que no existe, que es
    justo lo que la puerta de calidad no puede ver porque mira el payload."""
    with pytest.raises(RuntimeError):
        rl.estado_legacy("2", {"ACTIVO": 1})


# --------------------------------------------------------------------------
# Fechas
# --------------------------------------------------------------------------
def test_la_fecha_del_legacy_se_usa_tal_cual():
    fecha, avisos = rl.fecha_con_respaldo("2014-02-17 00:00:00", [])

    assert fecha == "2014-02-17"
    assert avisos == []


@pytest.mark.parametrize("vacio", ["0000-00-00 00:00:00", "", None])
def test_fecha_cero_toma_la_mas_antigua_del_grupo(vacio):
    fecha, avisos = rl.fecha_con_respaldo(vacio, ["2016-05-14", "2014-02-17", "2015-01-29"])

    assert fecha == "2014-02-17"
    assert avisos[0][0] == "fecha 0000-00-00 en el legacy"


def test_sin_fecha_y_sin_grupo_usa_la_fecha_fija():
    fecha, avisos = rl.fecha_con_respaldo("0000-00-00 00:00:00", [])

    assert fecha == rl.FECHA_SIN_RESPALDO
    assert avisos


# --------------------------------------------------------------------------
# Códigos
# --------------------------------------------------------------------------
def test_codigo_legado_lleva_siempre_el_id():
    """`numero_liquidacion` se repite 746 veces y 7 filas lo tienen negativo:
    sin el id detrás no hay código único."""
    assert rl.codigo_legado("8", "24") == "LEG-8-24"
    assert rl.codigo_legado("-238", "1043") == "LEG--238-1043"
    assert rl.codigo_legado(None, "7") == "LEG-7"


def test_codigo_unico_deja_el_del_legacy_si_no_choca():
    codigo, choca = rl.codigo_unico("2014.023", "7", {"2014.001"})

    assert codigo == "2014.023"
    assert choca is False


def test_codigo_unico_anade_el_id_si_choca():
    codigo, choca = rl.codigo_unico("2014.023", "7", {"2014.023"})

    assert codigo == "2014.023-7"
    assert choca is True


def test_dos_codigos_chocados_entre_si_no_se_pisan():
    """El caso real del legacy: `2014.019` lo usan dos contratos."""
    ya_usados = set()
    primero, _ = rl.codigo_unico("2014.019", "25", ya_usados)
    ya_usados.add(primero)
    segundo, choca = rl.codigo_unico("2014.019", "5433", ya_usados)

    assert segundo == "2014.019-5433"
    assert choca is True
    assert primero != segundo


def test_la_segunda_pasada_reconoce_sus_propias_filas():
    """Si en la segunda pasada sólo se mirara si el código limpio choca,
    chocaría con su propia fila de la primera, se le añadiría el sufijo del id y
    se insertarían 3.387 contratos duplicados."""
    previos = {"2014.023", "2014.019-5433"}

    assert rl.codigo_previo("2014.023", "7", previos) == "2014.023"
    assert rl.codigo_previo("2014.019", "5433", previos) == "2014.019-5433"
    assert rl.codigo_previo("2014.019", "25", previos) is None
    assert rl.codigo_previo("2015.001", "99", previos) is None


def test_el_codigo_previo_de_una_fila_sin_codigo():
    """Las que entraron por la reserva: `LEG-{id}` y nada más."""
    assert rl.codigo_previo("", "7", {"LEG-7"}) == "LEG-7"
    assert rl.codigo_previo("", "7", {"LEG-8"}) is None


# --------------------------------------------------------------------------
# Fase B: los clientes sin código
# --------------------------------------------------------------------------
def test_el_codigo_de_rescate_no_colisiona_con_los_reales():
    """El prefijo LEG no lo usa ningún `cliente.codigo` ni ningún
    `artista.codigo_exp`: ver test_los_codigos_de_rescate_no_chocan en el dump."""
    from migrar_clientes import _codigo_de_rescate

    assert _codigo_de_rescate({"_id": 726}) == "LEG-726"


# --------------------------------------------------------------------------
# Fases: armado de payloads con el origen sustituido
# --------------------------------------------------------------------------
def _origen(monkeypatch, **tablas):
    """Sustituye `fuente.leer_tabla` por un diccionario de filas.

    Se pasan `{tabla: (columnas, filas)}`. Las columnas no se usan —el parser
    devuelve las que hay— pero hacen falta para la tupla.
    """
    import fuente

    def _leer(_ruta, nombre, *args, **kwargs):
        columnas, filas = tablas[nombre]
        return list(columnas), filas

    monkeypatch.setattr(fuente, "leer_tabla", _leer)


def _liquidacion(**cambios):
    fila = {
        "id_liquidacion": "24",
        "numero_liquidacion": "8",
        "id_artista": "511",
        "liquidada": "Si",
        "fecha_emision": "2015-01-07 00:00:00",
        "fecha_liquidacion": "2015-01-07 00:00:00",
        "descripcion": "Pago 100%",
        "porcientocaguayo": "17.00",
        "devengado": "4316.00",
        "tributario": "5.00",
        "comision_bancaria": "0.00",
        "neto_pagar": "4100.20",
        "importe": "5200.00",
        "cheque": "416",
        "observacion": "",
        "moneda": "CUC",
        "id_tipoconcepto": "3",
    }
    fila.update(cambios)
    return fila


def test_la_liquidacion_mapea_las_columnas_que_son_suyas(monkeypatch):
    fila = _liquidacion()
    _origen(monkeypatch,
            artista_liquidacion=(fila, [fila]),
            tipo_concepto=(["id_tipoconcepto", "nombre_tipoconcepto"],
                           [{"id_tipoconcepto": "3",
                             "nombre_tipoconcepto": "Por representación"}]))
    monkeypatch.setattr(migrar_liquidaciones, "_artista_por_codigo",
                        lambda: {"511": "ART-511"})
    monkeypatch.setattr(migrar_liquidaciones, "_fechas_por_artista",
                        lambda filas: {})

    registro = Registro()
    payloads = migrar_liquidaciones.preparar(
        registro, {"ART-511": 42}, {"USD": 1, "CUP": 3},
        {"descripcion", "tipo_concepto"})

    assert len(payloads) == 1
    p = payloads[0]
    assert p["codigo"] == "LEG-8-24"
    assert p["id_cliente"] == 42
    assert p["id_moneda"] == 1          # CUC
    assert p["liquidada"] is True
    assert p["fecha_emision"] == "2015-01-07"
    assert p["tipo_pago"] == "CHEQUE"  # porque trae número de cheque
    assert p["tipo_concepto"] == "Por representación"
    assert p["descripcion"] == "Pago 100%"
    assert str(p["neto_pagar"]) == "4100.20"


def test_liquidada_no_es_true(monkeypatch):
    """`liquidada` es un varchar(2) con 'Si'/'No': siete filas del legacy tienen
    'No' y si se castea a booleano sin mirar, salen True."""
    fila = _liquidacion(liquidada="No")
    _origen(monkeypatch,
            artista_liquidacion=(fila, [fila]),
            tipo_concepto=(["id_tipoconcepto", "nombre_tipoconcepto"],
                           [{"id_tipoconcepto": "3", "nombre_tipoconcepto": "x"}]))
    monkeypatch.setattr(migrar_liquidaciones, "_artista_por_codigo",
                        lambda: {"511": "ART-511"})
    monkeypatch.setattr(migrar_liquidaciones, "_fechas_por_artista", lambda filas: {})

    payloads = migrar_liquidaciones.preparar(
        Registro(), {"ART-511": 42}, {"USD": 1}, set())

    assert payloads[0]["liquidada"] is False


def test_liquidacion_de_artista_no_migrado_se_descarta(monkeypatch):
    fila = _liquidacion()
    _origen(monkeypatch,
            artista_liquidacion=(fila, [fila]),
            tipo_concepto=(["id_tipoconcepto", "nombre_tipoconcepto"],
                           [{"id_tipoconcepto": "3", "nombre_tipoconcepto": "x"}]))
    monkeypatch.setattr(migrar_liquidaciones, "_artista_por_codigo",
                        lambda: {"511": "ART-511"})
    monkeypatch.setattr(migrar_liquidaciones, "_fechas_por_artista", lambda filas: {})

    registro = Registro()
    payloads = migrar_liquidaciones.preparar(registro, {}, {"USD": 1}, set())

    assert payloads == []
    assert registro.entradas[0]["motivo"] == "artista no migrado"


def test_liquidacion_sin_concepto_va_a_otros(monkeypatch):
    """150 filas del legacy traen `id_tipoconcepto = 0`, que no existe en el
    catálogo. Meterles el concepto mayoritario sería inventarles un concepto."""
    fila = _liquidacion(id_tipoconcepto="0")
    _origen(monkeypatch,
            artista_liquidacion=(fila, [fila]),
            tipo_concepto=(["id_tipoconcepto", "nombre_tipoconcepto"],
                           [{"id_tipoconcepto": "3", "nombre_tipoconcepto": "x"}]))
    monkeypatch.setattr(migrar_liquidaciones, "_artista_por_codigo",
                        lambda: {"511": "ART-511"})
    monkeypatch.setattr(migrar_liquidaciones, "_fechas_por_artista", lambda filas: {})

    registro = Registro()
    payloads = migrar_liquidaciones.preparar(
        registro, {"ART-511": 42}, {"USD": 1}, {"tipo_concepto"})

    assert payloads[0]["tipo_concepto"] == migrar_liquidaciones.CONCEPTO_POR_DEFECTO
    assert any("concepto" in e["motivo"] for e in registro.entradas)


def test_liquidacion_sin_fecha_toma_la_de_su_artista(monkeypatch):
    fila = _liquidacion(fecha_emision="0000-00-00 00:00:00")
    _origen(monkeypatch,
            artista_liquidacion=(fila, [fila]),
            tipo_concepto=(["id_tipoconcepto", "nombre_tipoconcepto"],
                           [{"id_tipoconcepto": "3", "nombre_tipoconcepto": "x"}]))
    monkeypatch.setattr(migrar_liquidaciones, "_artista_por_codigo",
                        lambda: {"511": "ART-511"})
    monkeypatch.setattr(migrar_liquidaciones, "_fechas_por_artista",
                        lambda filas: {"511": ["2014-03-24", "2015-01-07"]})

    registro = Registro()
    payloads = migrar_liquidaciones.preparar(
        registro, {"ART-511": 42}, {"USD": 1}, set())

    assert payloads[0]["fecha_emision"] == "2014-03-24"
    assert any("fecha" in e["motivo"] for e in registro.entradas)


def test_contrato_sin_solicitud_se_descarta(monkeypatch):
    """`contrato` no guarda el cliente: lo guarda la solicitud. Sin solicitud no
    hay `id_cliente`, y la columna es NOT NULL."""
    fila = {
        "id_contrato": "6", "nombre_contrato": "Para la comercializacion",
        "documento": "", "valor_contratocuc": "0.00", "valor_contratocup": "0.00",
        "id_oferta": "0", "id_tipocontrato": "3", "id_estadocontrato": "2",
        "numero": "21", "codigo_contrato": "2014.021", "id_solicitudsc": "0",
        "fecha": "0000-00-00 00:00:00", "proforma": "",
    }
    monkeypatch.setattr(migrar_contratos, "_clientes_legacy", lambda: {})
    monkeypatch.setattr(migrar_contratos, "_solicitudes", lambda: {})
    monkeypatch.setattr(migrar_contratos, "_tipos_legacy", lambda: {})
    import fuente as f
    monkeypatch.setattr(f, "leer_tabla", lambda r, t, *a, **k: (list(fila), [fila]))

    registro = Registro()
    payloads = migrar_contratos.preparar(
        registro, {}, {"USD": 1}, ESTADOS, {}, set())

    assert payloads == []
    assert registro.entradas[0]["motivo"] == "sin solicitud"


def test_contrato_con_nombre_de_300_caracteres_no_se_trunca(monkeypatch):
    """El destino es VARCHAR(300) desde `contrato_nombre_300`. Si algún día se
    vuelve a 200, este test falla antes de que lo haga un INSERT."""
    nombre = "x" * 300
    fila = {
        "id_contrato": "7", "nombre_contrato": nombre,
        "documento": "", "valor_contratocuc": "100.00", "valor_contratocup": "0.00",
        "id_oferta": "0", "id_tipocontrato": "3", "id_estadocontrato": "2",
        "numero": "23", "codigo_contrato": "2014.023", "id_solicitudsc": "5",
        "fecha": "2014-02-12 00:00:00", "proforma": "",
    }
    monkeypatch.setattr(migrar_contratos, "_clientes_legacy",
                        lambda: {"5": "CLI-5"})
    monkeypatch.setattr(migrar_contratos, "_solicitudes",
                        lambda: {"5": "5"})
    monkeypatch.setattr(migrar_contratos, "_tipos_legacy",
                        lambda: {"3": "Compra-Venta"})
    import fuente as f
    monkeypatch.setattr(f, "leer_tabla", lambda r, t, *a, **k: (list(fila), [fila]))

    payloads = migrar_contratos.preparar(
        Registro(), {"CLI-5": 7}, {"USD": 1}, ESTADOS, {"Compra-Venta": 3}, set())

    assert payloads[0]["nombre"] == nombre
    assert payloads[0]["vigencia"] == payloads[0]["fecha"] == "2014-02-12"


def test_suplemento_de_contrato_inexistente_se_descarta(monkeypatch):
    """Cinco de las 48 filas del legacy cuelgan de un contrato que no existe."""
    fila = {
        "id_suplemento": "1", "nombre_suplemento": "Suplemento I",
        "valor_suplementocuc": "2000.00", "valor_suplementocup": "0.00",
        "documento": "", "id_contrato": "0", "id_oferta": "0", "numero": "1",
        "codigo_suplemento": "2014.001", "id_estadosuplemento": "2",
        "id_solicitudsc": "3", "fecha": "2014-02-17 00:00:00",
    }
    import fuente as f
    monkeypatch.setattr(f, "leer_tabla", lambda r, t, *a, **k: (list(fila), [fila]))
    monkeypatch.setattr(migrar_suplementos, "_codigos_legacy_contratos", lambda: {})

    registro = Registro()
    payloads = migrar_suplementos.preparar(registro, {}, ESTADOS, {"USD": 1})

    assert payloads == []
    assert registro.entradas[0]["motivo"] == "contrato no migrado"


def test_suplemento_cuelga_del_contrato_migrado(monkeypatch):
    fila = {
        "id_suplemento": "1", "nombre_suplemento": "Suplemento I",
        "valor_suplementocuc": "0.00", "valor_suplementocup": "2000.00",
        "documento": "SUP.doc", "id_contrato": "4", "id_oferta": "0", "numero": "2",
        "codigo_suplemento": "2014.002", "id_estadosuplemento": "2",
        "id_solicitudsc": "20", "fecha": "2014-02-20 00:00:00",
    }
    import fuente as f
    monkeypatch.setattr(f, "leer_tabla", lambda r, t, *a, **k: (list(fila), [fila]))
    monkeypatch.setattr(migrar_suplementos, "_codigos_legacy_contratos",
                        lambda: {"4": "2014.016"})

    payloads = migrar_suplementos.preparar(
        Registro(), {"2014.016": 88}, ESTADOS, {"USD": 1, "CUP": 3})

    assert len(payloads) == 1
    assert payloads[0]["id_contrato"] == 88
    assert payloads[0]["codigo"] == "LEG-2014.002-1"
    assert payloads[0]["fecha_vigencia"] == payloads[0]["fecha"]


def test_el_suplemento_encuentra_el_contrato_cuyo_codigo_choco(monkeypatch):
    """Cuando la Fase L tuvo que añadir el id al código por duplicado, el
    suplemento tiene que encontrarlo por ese código y no sólo por el limpio."""
    fila = {
        "id_suplemento": "1", "nombre_suplemento": "S",
        "valor_suplementocuc": "0.00", "valor_suplementocup": "1.00",
        "documento": "", "id_contrato": "75", "id_oferta": "0", "numero": "1",
        "codigo_suplemento": "2014.001", "id_estadosuplemento": "1",
        "id_solicitudsc": "0", "fecha": "2014-02-17 00:00:00",
    }
    import fuente as f
    monkeypatch.setattr(f, "leer_tabla", lambda r, t, *a, **k: (list(fila), [fila]))
    monkeypatch.setattr(migrar_suplementos, "_codigos_legacy_contratos",
                        lambda: {"75": "2014.016"})

    payloads = migrar_suplementos.preparar(
        Registro(), {"2014.016-75": 99}, ESTADOS, {"CUP": 3})

    assert payloads[0]["id_contrato"] == 99

# --------------------------------------------------------------------------
# El servicio genérico de la fase O
# --------------------------------------------------------------------------
class _CursorFalso:
    def __init__(self, existente=None, id_nuevo=42):
        self._existente = existente
        self._id_nuevo = id_nuevo
        self.insertado = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        if sql.lstrip().startswith("INSERT"):
            self.insertado = params
            self._filas = [(self._id_nuevo,)]
        else:
            # El SELECT de comprobación: si ya hay `GEN`, devuelve su id y no
            # debe llegar a insertar nada.
            self._filas = [] if self._existente is None else [(self._existente,)]

    def fetchone(self):
        # psycopg2 devuelve None y no revienta cuando no hay filas.
        return self._filas[0] if self._filas else None


class _ConexionFalsa:
    def __init__(self, existente=None, id_nuevo=42):
        self.cursor_falso = _CursorFalso(existente, id_nuevo)
        self.commit = lambda: None
        self.rollback = lambda: None

    def cursor(self):
        return self.cursor_falso


def test_el_servicio_generico_se_crea_si_no_existe():
    conn = _ConexionFalsa(existente=None, id_nuevo=42)

    id_servicio = migrar_etapas._id_servicio_generico(conn, Registro())

    assert id_servicio == 42
    assert conn.cursor_falso.insertado[0] == "GEN"


def test_el_servicio_generico_se_reutiliza_en_la_segunda_pasada():
    """`codigo_servicio` es UNIQUE: un segundo `GEN` reventaría el INSERT."""
    conn = _ConexionFalsa(existente=7)

    id_servicio = migrar_etapas._id_servicio_generico(conn, Registro())

    assert id_servicio == 7
    assert conn.cursor_falso.insertado is None, "no debe intentar insertar"


def test_la_tarea_apunta_al_servicio_generico():
    etapas = [{"id_etapa": 3, "nombre_etapa": "Montaje", "valor": "1500.00",
              "id_moneda": 1}]

    tareas = migrar_etapas.preparar_tareas(etapas, 42)

    assert tareas[0]["id_servicio"] == 42
    assert tareas[0]["codigo_extendido"] == "GEN"
    # El concepto no se toca: es lo que muestran la tabla y los PDF.
    assert tareas[0]["concepto_modificado"] == "Montaje"


def test_sin_servicio_generico_la_tarea_se_queda_sin_codigo():
    """Si el catálogo no se pudo crear, es preferible la columna vacía a
    apuntar a un servicio que no existe."""
    etapas = [{"id_etapa": 3, "nombre_etapa": "Montaje", "valor": "1500.00",
              "id_moneda": 1}]

    tareas = migrar_etapas.preparar_tareas(etapas, None)

    assert tareas[0]["id_servicio"] is None
    assert tareas[0]["codigo_extendido"] is None

# -*- coding: utf-8 -*-
"""`generar_dumps`: qué volcados pide, cómo se validan y cómo se fabrican.

La red de seguridad de este módulo es que valida con `fuente.leer_tabla`, el
mismo parser que usa la migración. Un volcado que no pase por aquí no llega a
`main.py`, y un volcado a medias se queda sin dejar fichero con nombre de bueno.
"""
import re
import stat
from pathlib import Path

import pytest

import config
import generar_dumps

ETL = Path(generar_dumps.__file__).resolve().parent


# --------------------------------------------------------------------------
# Los flags, según el sabor del cliente
# --------------------------------------------------------------------------
def test_los_flags_de_mysql_no_se_pasan_a_mariadb(monkeypatch):
    monkeypatch.setattr(generar_dumps, "version_mysqldump",
                        lambda b: "mysqldump  Ver 8.4.11 for Linux on x86_64")

    flags = generar_dumps.flags_mysqldump("mysqldump")

    assert "--skip-column-statistics" in flags
    assert "--set-gtid-purged=OFF" in flags


def test_a_mariadb_no_se_le_pasan_los_flags_de_mysql(monkeypatch):
    monkeypatch.setattr(generar_dumps, "version_mysqldump",
                        lambda b: "mariadb-dump  Ver 10.4.11-MariaDB")

    flags = generar_dumps.flags_mysqldump("mariadb-dump")

    # No existen en mariadb-dump: pasarlos aborta el comando entero.
    assert "--skip-column-statistics" not in flags
    assert "--set-gtid-purged=OFF" not in flags
    assert "--complete-insert" in flags
    assert "--default-character-set=utf8mb4" in flags


def test_a_mysql_5_no_se_le_pasan_los_de_mysql_8(monkeypatch):
    """`--set-gtid-purged` no existe hasta MySQL 8: ahí también rompe."""
    monkeypatch.setattr(generar_dumps, "version_mysqldump",
                        lambda b: "mysqldump  Ver 5.7.42 for Linux")

    flags = generar_dumps.flags_mysqldump("mysqldump")

    assert "--set-gtid-purged=OFF" not in flags
    assert "--skip-column-statistics" not in flags
    assert "--complete-insert" in flags


def test_sin_version_conocida_no_se_inventan_flags(monkeypatch):
    """Si no se sabe qué cliente es, se usa el juego que funciona en todos."""
    monkeypatch.setattr(generar_dumps, "version_mysqldump", lambda b: "")

    flags = generar_dumps.flags_mysqldump("lo-que-sea")

    assert "--complete-insert" in flags
    assert "--set-gtid-purged=OFF" not in flags


@pytest.mark.skipif(not generar_dumps.buscar_binario(),
                    reason="no hay mysqldump ni mariadb-dump en esta máquina")
def test_el_cliente_real_acepta_los_flags():
    """El shim demuestra el.fontanero; esto demuestra que los flags valen.

    Un shim no sabe distinguir un flag válido de uno que aborta el comando, y
    así es como se coló `--skip-set-gtid-purged`: verde en los tests y
    reventando contra el cliente de verdad. Aquí se lanza el binario real
    contra un puerto donde no hay nada: lo que tiene que decir es que no
    puede conectar, nunca "Unknown option".
    """
    import subprocess

    binario = generar_dumps.buscar_binario()
    flags = generar_dumps.flags_mysqldump(binario)
    for rol in generar_dumps.TABLAS:
        salida = subprocess.run(
            # Puerto 1: no hay nada escuchando. Importa que el cliente acepte
            # todos sus argumentos, no que la conexión funcione.
            [binario] + flags + ["-h127.0.0.1", "-P1", "-u", "nadie",
                                 generar_dumps.BASES[rol]]
            + list(generar_dumps.TABLAS[rol]),
            capture_output=True, text=True, timeout=60,
        )
        texto = (salida.stdout + salida.stderr).lower()
        assert "unknown option" not in texto, (
            "el cliente %s rechaza un flag: %s" % (binario, texto.strip())
        )
        assert "unknown variable" not in texto, (
            "el cliente %s rechaza una variable: %s" % (binario, texto.strip())
        )


# --------------------------------------------------------------------------
# Validación
# --------------------------------------------------------------------------
def _dump(rol, filas=2):
    """Un volcado mínimo pero válido para el parser del ETL."""
    return "\n".join(
        "INSERT INTO `%s` (`id`) VALUES %s;" % (
            tabla, ", ".join("(%d)" % i for i in range(filas)))
        for tabla in generar_dumps.TABLAS[rol]
    ) + "\n"


def test_validar_cuenta_filas(tmp_path):
    ruta = tmp_path / "d.sql"
    ruta.write_text(_dump("comercial", filas=3), encoding="utf-8")

    counts = generar_dumps.validar(ruta, "comercial")

    assert counts["artista"] == 3
    assert set(counts) == set(generar_dumps.TABLAS["comercial"])


def test_validar_rechaza_un_dump_sin_las_tablas(tmp_path):
    """La regresión de `save.sql`: 121 INSERT y ninguno de los que se buscan."""
    ruta = tmp_path / "basura.sql"
    ruta.write_text(
        "INSERT INTO `employees_example` (`id`) VALUES (1);\n", encoding="utf-8")

    with pytest.raises(generar_dumps.DumpInvalido) as exc:
        generar_dumps.validar(ruta, "comercial")

    assert "artista" in str(exc.value)


def test_validar_rechaza_un_dump_a_medias(tmp_path):
    """mysqldump interrumpido deja las tablas, pero vacías."""
    ruta = tmp_path / "medio.sql"
    ruta.write_text(_dump("comercial").replace("VALUES (0), (1);",
                                               "VALUES;"), encoding="utf-8")

    with pytest.raises(generar_dumps.DumpInvalido):
        generar_dumps.validar(ruta, "comercial")


def test_validar_rechaza_una_tabla_vacia(tmp_path):
    ruta = tmp_path / "vacio.sql"
    cuerpo = []
    for tabla in generar_dumps.TABLAS["comercial"]:
        valores = "" if tabla == "grupo" else "(1), (2)"
        cuerpo.append("INSERT INTO `%s` (`id`) VALUES %s;" % (tabla, valores))
    ruta.write_text("\n".join(cuerpo) + "\n", encoding="utf-8")

    with pytest.raises(generar_dumps.DumpInvalido) as exc:
        generar_dumps.validar(ruta, "comercial")

    assert "grupo" in str(exc.value)
    assert "vacías" in str(exc.value)


# --------------------------------------------------------------------------
# Volcar y adoptar
# --------------------------------------------------------------------------
def _shim(tmp_path, cuerpo="", codigo=0):
    """Un mysqldump de mentira: emite `cuerpo` y sale con `codigo`."""
    ruta = tmp_path / "dump-de-mentira"
    ruta.write_text("#!/bin/sh\ncat <<'FIN'\n%s\nFIN\nexit %d\n"
                    % (cuerpo, codigo), encoding="utf-8")
    ruta.chmod(ruta.stat().st_mode | stat.S_IEXEC)
    return str(ruta)


def test_volcar_deja_el_fichero_ya_validado(tmp_path, monkeypatch):
    dumps = tmp_path / "dumps"
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", dumps)
    binario = _shim(tmp_path, cuerpo=_dump("comercial"))

    destino = generar_dumps.volcar("comercial", binario=binario, password="x")

    assert destino == dumps / "comercial.sql"
    assert generar_dumps.validar(destino, "comercial")["artista"] == 2
    assert not (dumps / "comercial.sql.tmp").exists()


def test_volcar_no_deja_nada_si_mysqldump_falla(tmp_path, monkeypatch):
    dumps = tmp_path / "dumps"
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", dumps)
    binario = _shim(tmp_path, cuerpo="algo", codigo=2)

    with pytest.raises(generar_dumps.DumpInvalido):
        generar_dumps.volcar("comercial", binario=binario, password="x")

    assert not (dumps / "comercial.sql").exists()
    assert not (dumps / "comercial.sql.tmp").exists()


def test_volcar_no_deja_nada_si_el_dump_sale_incompleto(tmp_path, monkeypatch):
    dumps = tmp_path / "dumps"
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", dumps)
    binario = _shim(tmp_path, cuerpo=_dump("comercial").replace("artista", "x"))

    with pytest.raises(generar_dumps.DumpInvalido):
        generar_dumps.volcar("comercial", binario=binario, password="x")

    assert not (dumps / "comercial.sql").exists()
    assert not (dumps / "comercial.sql.tmp").exists()


def test_volcar_no_sobrescribe_sin_forzar(tmp_path, monkeypatch):
    dumps = tmp_path / "dumps"
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", dumps)
    destino = generar_dumps.ruta_destino("comercial")
    dumps.mkdir(parents=True)
    destino.write_text("contenido que no se debe tocar", encoding="utf-8")
    binario = _shim(tmp_path, cuerpo=_dump("comercial"))

    with pytest.raises(generar_dumps.DumpInvalido) as exc:
        generar_dumps.volcar("comercial", binario=binario, password="x")

    assert "--forzar" in str(exc.value)
    assert destino.read_text(encoding="utf-8") == "contenido que no se debe tocar"


def test_adoptar_copia_el_volcado(tmp_path, monkeypatch):
    dumps = tmp_path / "dumps"
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", dumps)
    origen = tmp_path / "respaldo.sql"
    origen.write_text(_dump("principal"), encoding="utf-8")

    destino = generar_dumps.adoptar(str(origen), "principal")

    assert destino.read_text(encoding="utf-8") == origen.read_text(encoding="utf-8")
    assert generar_dumps.validar(destino, "principal")["tipo_convenio"] == 2


def test_adoptar_rechaza_uno_que_no_sirve(tmp_path, monkeypatch):
    monkeypatch.setattr(generar_dumps, "DIR_DUMPS", tmp_path / "dumps")
    origen = tmp_path / "basura.sql"
    origen.write_text("INSERT INTO `animals` (`id`) VALUES (1);\n",
                      encoding="utf-8")

    with pytest.raises(generar_dumps.DumpInvalido):
        generar_dumps.adoptar(str(origen), "comercial")

    assert not (tmp_path / "dumps" / "comercial.sql").exists()


# --------------------------------------------------------------------------
# Las tablas no se pudren
# --------------------------------------------------------------------------
def test_las_tablas_del_generador_cubren_las_que_lee_el_etl():
    """Si una fase nueva lee una tabla, tiene que estar aquí.

    Sin este test, un volcado podría no bringing esa tabla y la migración
    reventaría en pleno `--commit`, con el volcado ya en su sitio y validado.
    """
    patron = re.compile(r'leer_tabla\([^,]+,\s*"(\w+)"')
    leidas = set()
    for modulo in sorted(ETL.glob("migrar_*.py")):
        leidas |= set(patron.findall(modulo.read_text(encoding="utf-8")))

    # Los catálogos no pasan por leer_tabla con un literal: salen de CATALOGOS.
    leidas |= {nombre for nombre, _rutas in config.CATALOGOS}

    exportadas = {t for tablas in generar_dumps.TABLAS.values() for t in tablas}

    assert leidas, "el escaneo no encontró ninguna lectura: el patrón ha caducado"
    assert leidas <= exportadas, (
        "el ETL lee tablas que generar_dumps no exporta: %s"
        % sorted(leidas - exportadas)
    )


def test_los_lectores_de_fuente_tambien_estan_cubiertos():
    """`leer_artistas` y `leer_clientes` llevan el nombre dentro de sí mismas."""
    texto = (ETL / "fuente.py").read_text(encoding="utf-8")
    literales = set(re.findall(r'leer_tabla\(ruta_dump,\s*"(\w+)"\)', texto))

    exportadas = {t for tablas in generar_dumps.TABLAS.values() for t in tablas}

    assert literales
    assert literales <= exportadas


# --------------------------------------------------------------------------
# El guard de volcados
# --------------------------------------------------------------------------
def test_comprobar_dumps_dice_donde_busco(monkeypatch, tmp_path):
    ausente = tmp_path / "comercial.sql"
    monkeypatch.setattr(config, "DUMPS", {
        "comercial": ausente, "principal": tmp_path / "principal.sql"})

    with pytest.raises(config.DumpAusente) as exc:
        config.comprobar_dumps(("comercial", "principal"))

    mensaje = str(exc.value)
    assert str(ausente) in mensaje
    assert "DUMP_MARIADB" in mensaje
    assert "--generar-dumps" in mensaje
    assert "--adoptar" in mensaje


def test_comprobar_dumps_solo_mira_lo_que_se_le_pide(monkeypatch, tmp_path):
    comercial = tmp_path / "comercial.sql"
    comercial.write_text("x", encoding="utf-8")
    principal = tmp_path / "p.sql"
    monkeypatch.setattr(config, "DUMPS", {
        "comercial": comercial, "principal": principal})

    config.comprobar_dumps(("comercial",))  # el principal no está y no se mira

    with pytest.raises(config.DumpAusente):
        config.comprobar_dumps(("comercial", "principal"))


def test_main_solo_exige_el_comercial_cuando_no_toca_los_catalogos():
    import main

    assert main._dumps_necesarios([]) == ("comercial", "principal")
    assert main._dumps_necesarios(["--commit"]) == ("comercial", "principal")
    assert main._dumps_necesarios(["--solo-grupos", "--commit"]) == ("comercial",)
    # La Fase I lee tipo_contrato en los dos ficheros.
    assert main._dumps_necesarios(["--solo-catalogo"]) == ("comercial", "principal")
"""Registro de usuarios eligiendo grupo.

El endpoint /auth/register es público, así que estos tests crean usuarios
reales en la base de datos configurada. Cada test usa un alias/CI único y
borra el usuario al terminar para no dejar basura.
"""

import os
import uuid

import psycopg2
import pytest

DB_NAME = os.getenv("ADMIN_DB_NAME", "caguayo_sa")


def _db_conn():
    return psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        database=DB_NAME,
        client_encoding="utf8",
    )


def _limpiar_usuario(alias: str) -> None:
    conn = _db_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM sesion WHERE id_usuario IN "
            "(SELECT id_usuario FROM usuarios WHERE alias = %s)",
            (alias,),
        )
        cur.execute("DELETE FROM usuarios WHERE alias = %s", (alias,))
        conn.commit()
        cur.close()
    finally:
        conn.close()


def _datos_base():
    conn = _db_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_dependencia FROM dependencia ORDER BY id_dependencia LIMIT 1")
        id_dependencia = cur.fetchone()[0]
        cur.execute("SELECT id_grupo, nombre FROM grupo ORDER BY id_grupo")
        grupos = cur.fetchall()
        cur.close()
        return id_dependencia, grupos
    finally:
        conn.close()


def _payload(alias: str, ci: str, id_dependencia: int, id_grupo: int | None):
    data = {
        "ci": ci,
        "nombre": "Test",
        "primer_apellido": "Registro",
        "segundo_apellido": "Pytest",
        "cargo": "Tester",
        "alias": alias,
        "contrasenia": "clave123",
        "base_datos": DB_NAME,
        "id_dependencia": id_dependencia,
    }
    if id_grupo is not None:
        data["id_grupo"] = id_grupo
    return data


@pytest.mark.usefixtures("db_session")
def test_grupos_por_base_de_datos(client):
    resp = client.get(f"/api/v1/conexiones/{DB_NAME}/grupos")
    assert resp.status_code == 200, resp.text
    nombres = [g["nombre"] for g in resp.json()]
    assert "ADMINISTRADOR" in nombres
    assert all("id_grupo" in g for g in resp.json())


@pytest.mark.usefixtures("db_session")
def test_registro_usa_el_grupo_elegido(client):
    id_dependencia, grupos = _datos_base()
    # Preferir un grupo no administrador para probar que NO se fuerza el 1.
    grupo = next((g for g in grupos if g[1] != "ADMINISTRADOR"), grupos[0])
    sufijo = uuid.uuid4().hex[:10]
    alias = f"test_reg_{sufijo}"
    ci = f"9{sufijo[:9]}"

    try:
        resp = client.post(
            "/api/v1/auth/register",
            json=_payload(alias, ci, id_dependencia, grupo[0]),
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert (body["usuario"].get("grupo") or {}).get("id_grupo") == grupo[0]

        conn = _db_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id_grupo FROM usuarios WHERE alias = %s", (alias,))
            assert cur.fetchone()[0] == grupo[0]
            cur.close()
        finally:
            conn.close()
    finally:
        _limpiar_usuario(alias)


@pytest.mark.usefixtures("db_session")
def test_registro_grupo_inexistente_falla(client):
    id_dependencia, _ = _datos_base()
    sufijo = uuid.uuid4().hex[:10]
    alias = f"test_reg_{sufijo}"
    ci = f"8{sufijo[:9]}"

    try:
        resp = client.post(
            "/api/v1/auth/register",
            json=_payload(alias, ci, id_dependencia, 999999),
        )
        assert resp.status_code == 400, resp.text
        # No debe haber creado el usuario.
        conn = _db_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM usuarios WHERE alias = %s", (alias,))
            assert cur.fetchone() is None
            cur.close()
        finally:
            conn.close()
    finally:
        _limpiar_usuario(alias)

"""
Tests for /auth/register endpoint.

Verifies that registration works correctly:
- Successful registration with valid data
- Rejection of duplicate alias
- Rejection of invalid dependencia
- Rejection of missing required fields
- Token generation and session creation
"""

import pytest
import time


class TestRegisterEndpoint:
    """Tests for POST /auth/register."""

    def test_register_exitoso(self, client):
        """POST /auth/register con datos válidos → 200 con token."""
        # Use unique CI and alias to avoid conflicts
        unique_alias = f"testuser_{int(time.time())}"
        unique_ci = f"{int(time.time())}010"[-11:]  # 11 digits

        response = client.post("/api/v1/auth/register", json={
            "ci": unique_ci,
            "nombre": "Juan",
            "primer_apellido": "Perez",
            "segundo_apellido": "Lopez",
            "cargo": "Operador",
            "alias": unique_alias,
            "contrasenia": "password123",
            "base_datos": "caguayosa",
            "id_dependencia": 1,
        })

        assert response.status_code == 200, (
            f"Register exitoso: esperado 200, obtenido {response.status_code} - {response.json()}"
        )

        data = response.json()
        assert "token" in data, "Response debe contener token"
        assert "usuario" in data, "Response debe contener usuario"
        assert "funcionalidades" in data, "Response debe contener funcionalidades"
        assert "base_datos" in data, "Response debe contener base_datos"

        # Verify user info
        assert data["usuario"]["alias"] == unique_alias
        assert data["usuario"]["nombre"] == "Juan"
        assert data["usuario"]["primer_apellido"] == "Perez"
        assert data["base_datos"] == "caguayosa"

        # Verify token is a string
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0

    def test_register_alias_duplicado(self, client):
        """POST /auth/register con alias ya existente → 400."""
        # Pre-insert a user via direct SQL to avoid event loop issues
        import psycopg2
        import os
        unique_alias = f"duplicate_{int(time.time())}"
        unique_ci = f"{int(time.time())}001"[-11:]

        conn = psycopg2.connect(
            host=os.getenv('ADMIN_DB_HOST', 'localhost'),
            port=int(os.getenv('ADMIN_DB_PORT', 5432)),
            user=os.getenv('ADMIN_DB_USER', 'postgres'),
            password=os.getenv('ADMIN_DB_PASSWORD'),
            database='caguayosa',
            client_encoding='utf8'
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO usuarios (ci, nombre, primer_apellido, cargo, alias, contrasenia, id_grupo, id_dependencia) "
            "VALUES (%s, 'Test', 'User', 'Tester', %s, '$2b$12$fakehash', 1, 1)",
            (unique_ci, unique_alias)
        )
        cur.close()
        conn.close()

        # Try to register again with same alias but different CI
        response = client.post("/api/v1/auth/register", json={
            "ci": f"{int(time.time())}002"[-11:],
            "nombre": "Test2",
            "primer_apellido": "User2",
            "cargo": "Tester2",
            "alias": unique_alias,
            "contrasenia": "password456",
            "base_datos": "caguayosa",
            "id_dependencia": 1,
        })

        assert response.status_code == 400, (
            f"Alias duplicado: esperado 400, obtenido {response.status_code} - {response.json()}"
        )

    def test_register_dependencia_invalida(self, client):
        """POST /auth/register con dependencia que no existe → 400."""
        response = client.post("/api/v1/auth/register", json={
            "ci": "33333333333",
            "nombre": "Test",
            "primer_apellido": "User",
            "cargo": "Tester",
            "alias": f"invaliddep_{int(time.time())}",
            "contrasenia": "password123",
            "base_datos": "caguayosa",
            "id_dependencia": 99999,  # Non-existent
        })

        assert response.status_code == 400, (
            f"Dependencia inválida: esperado 400, obtenido {response.status_code} - {response.json()}"
        )

    def test_register_campos_requeridos_faltantes(self, client):
        """POST /auth/register sin campos requeridos → 422."""
        # Missing 'nombre'
        response = client.post("/api/v1/auth/register", json={
            "ci": "44444444444",
            "primer_apellido": "User",
            "cargo": "Tester",
            "alias": f"missing_{int(time.time())}",
            "contrasenia": "password123",
            "base_datos": "caguayosa",
            "id_dependencia": 1,
        })

        assert response.status_code == 422, (
            f"Campo faltante: esperado 422, obtenido {response.status_code} - {response.json()}"
        )

    def test_register_base_datos_invalida(self, client):
        """POST /auth/register con base de datos que no existe → 400 o 500."""
        response = client.post("/api/v1/auth/register", json={
            "ci": "55555555555",
            "nombre": "Test",
            "primer_apellido": "User",
            "cargo": "Tester",
            "alias": f"invalidbd_{int(time.time())}",
            "contrasenia": "password123",
            "base_datos": "nonexistent_db_xyz",
            "id_dependencia": 1,
        })

        # Should fail - either 400 (depends not found) or 500 (connection error)
        assert response.status_code in [400, 500], (
            f"BD inválida: esperado 400 o 500, obtenido {response.status_code} - {response.json()}"
        )

    def test_register_respuesta_grupo_administrador(self, client):
        """POST /auth/register debe asignar grupo ADMINISTRADOR."""
        unique_alias = f"admintest_{int(time.time())}"
        unique_ci = f"{int(time.time())}020"[-11:]  # 11 digits

        response = client.post("/api/v1/auth/register", json={
            "ci": unique_ci,
            "nombre": "Admin",
            "primer_apellido": "Test",
            "cargo": "Administrador",
            "alias": unique_alias,
            "contrasenia": "admin123",
            "base_datos": "caguayosa",
            "id_dependencia": 1,
        })

        assert response.status_code == 200
        data = response.json()

        # User should have grupo ADMINISTRADOR
        assert data["usuario"]["grupo"] is not None
        assert data["usuario"]["grupo"]["nombre"] == "ADMINISTRADOR"

        # Should have funcionalidades
        assert len(data["funcionalidades"]) > 0

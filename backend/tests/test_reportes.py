"""
Tests de integración para el módulo de reportes.

Cubre:
  1. Endpoints preview rechazan sin token (401)
  2. Endpoints PDF rechazan sin token (401)
  3. Endpoints preview funcionan con token simulado
  4. Errores internos no exponen detalles sanitizados
  5. PDF generation con notas (StreamingResponse)
  6. PDFTemplate unit test (construcción, empty state, firmas, landscape, format_quantity)

Estrategia:
  - Usa ``app.dependency_overrides`` para reemplazar ``require_auth`` (con
    función sincrónica) y ``get_session`` (con async generator), evitando
    depender de BD real para la autenticación.
  - Usa ``unittest.mock.patch.object`` para interceptar las funciones del
    servicio en el namespace de ``reportes_router`` (donde son importadas
    por nombre con ``from ... import``).
  - Tests con ``pytest.mark.parametrize`` para cubrir los 4 endpoints sin
    duplicar código.
"""

import pytest
from unittest.mock import AsyncMock, patch, PropertyMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from io import BytesIO
from datetime import date

from main import app
from src.utils.dependencies import require_auth
from src.database.connection import get_session
from src.dto.auth_dto import UsuarioInfo, DependenciaInfo, GrupoInfo
from src.utils.pdf_template import PDFTemplate, format_quantity
from sqlalchemy.ext.asyncio import AsyncSession

# Referencia al módulo del router para parchear correctamente las funciones
# importadas por nombre (from ... import <func>)
from src.routes import reportes_router


# ═══════════════════════════════════════════════════════════════════════════════
#  FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture
def mock_usuario():
    """Retorna un ``UsuarioInfo`` ficticio para simular autenticación exitosa."""
    return UsuarioInfo(
        id_usuario=1,
        ci="12345678901",
        nombre="Admin",
        primer_apellido="Test",
        segundo_apellido="",
        alias="admin.test",
        cargo="Administrador",
        dependencia=DependenciaInfo(
            id_dependencia=1,
            nombre="Dependencia Test",
            base_datos="test_db",
            host="localhost",
            puerto=5432,
        ),
        grupo=GrupoInfo(id_grupo=1, nombre="ADMINISTRADOR"),
    )


@pytest.fixture
def mock_db_session():
    """Retorna un ``AsyncSession`` mockeado para evitar depender de BD real."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def auth_success(mock_usuario, mock_db_session):
    """
    Override ``require_auth`` (función sincrónica) y ``get_session``
    (async generator) → flujo de autenticación exitosa sin BD real.
    """
    def _override_require_auth():
        return mock_usuario

    async def _override_get_session():
        yield mock_db_session

    app.dependency_overrides.update({
        require_auth: _override_require_auth,
        get_session: _override_get_session,
    })
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def auth_fail(mock_db_session):
    """
    Override ``require_auth`` → lanza ``HTTPException(401)``.
    También mockea ``get_session`` para evitar dependencia de BD.
    """
    async def _override_get_session():
        yield mock_db_session

    app.dependency_overrides.update({
        require_auth: lambda: (_ for _ in ()).throw(
            HTTPException(status_code=401, detail="Token de autenticación requerido")
        ),
        get_session: _override_get_session,
    })
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    """TestClient para la aplicación FastAPI."""
    return TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  DATOS DE PRUEBA COMPARTIDOS
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_DEPENDENCIA: dict = {"nombre": "DEP-001 Test", "direccion": "Calle 123 #456"}

SAMPLE_EXISTENCIAS: list = [
    {"codigo": "PROD001", "descripcion": "Producto de prueba 1", "cantidad": 100},
    {"codigo": "PROD002", "descripcion": "Producto de prueba 2", "cantidad": 50.5},
]

SAMPLE_MOVIMIENTOS: list = [
    {
        "fecha": date(2024, 6, 1),
        "operacion": "Compra",
        "producto": "PROD001",
        "tipo": "Entrada",
        "cantidad": 10,
    },
    {
        "fecha": date(2024, 6, 2),
        "operacion": "Venta",
        "producto": "PROD001",
        "tipo": "Salida",
        "cantidad": 3,
    },
]

SAMPLE_PROVEEDORES: list = [
    {
        "codigo": "PROV001",
        "nombre": "Proveedor Test S.A.",
        "direccion": "Av. Principal #789",
        "carnet_identidad": "12345678901",
        "vigencia": "2024-12-31",
        "provincia": "La Habana",
        "municipio": "Plaza",
    },
]

SAMPLE_PRODUCTO: dict = {"codigo": "PROD001", "nombre": "Producto de prueba 1"}


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 1 – Endpoints preview rechazan sin token (401)
# ═══════════════════════════════════════════════════════════════════════════════


class TestPreviewRechazoSinToken:
    """Test 1: Los 4 endpoints **preview** retornan 401 sin token de auth."""

    @pytest.mark.parametrize("path,params", [
        (
            "/api/v1/reportes/existencias/preview",
            {"id_dependencia": 1},
        ),
        (
            "/api/v1/reportes/movimientos-dependencia/preview",
            {"id_dependencia": 1, "fecha_inicio": "2024-01-01",
             "fecha_fin": "2024-12-31"},
        ),
        (
            "/api/v1/reportes/movimientos-producto/preview",
            {"id_dependencia": 1, "id_producto": 1,
             "fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
        ),
        (
            "/api/v1/reportes/proveedores-dependencia/preview",
            {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
        ),
    ])
    def test_preview_rechaza_sin_token(self, client, auth_fail, path, params):
        """Verifica que cada preview retorna 401 cuando la auth falla."""
        response = client.get(path, params=params)
        assert response.status_code == 401, (
            f"[{path}] Esperaba 401, obtuvo {response.status_code}: "
            f"{response.text[:200]}"
        )
        data = response.json()
        assert "detail" in data
        assert "Token" in data["detail"] or "autenticación" in data["detail"].lower(), (
            f"[{path}] El detail debería mencionar el token: {data['detail']}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 2 – Endpoints PDF rechazan sin token (401)
# ═══════════════════════════════════════════════════════════════════════════════


class TestPDFRechazoSinToken:
    """Test 2: Los 4 endpoints **PDF** retornan 401 sin token de auth."""

    @pytest.mark.parametrize("path,params", [
        (
            "/api/v1/reportes/proveedores-dependencia",
            {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
        ),
        (
            "/api/v1/reportes/existencias",
            {"id_dependencia": 1},
        ),
        (
            "/api/v1/reportes/movimientos-dependencia",
            {"id_dependencia": 1, "fecha_inicio": "2024-01-01",
             "fecha_fin": "2024-12-31"},
        ),
        (
            "/api/v1/reportes/movimientos-producto",
            {"id_dependencia": 1, "id_producto": 1,
             "fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
        ),
    ])
    def test_pdf_rechaza_sin_token(self, client, auth_fail, path, params):
        """Verifica que cada endpoint PDF retorna 401 cuando la auth falla."""
        response = client.get(path, params=params)
        assert response.status_code == 401, (
            f"[{path}] Esperaba 401, obtuvo {response.status_code}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 3 – Endpoints preview funcionan con token simulado
# ═══════════════════════════════════════════════════════════════════════════════


class TestPreviewConToken:
    """Test 3: Los 4 preview retornan 200 y estructura JSON correcta con auth."""

    @pytest.mark.parametrize("path,params,func_name,mock_return,expected_keys", [
        (
            "/api/v1/reportes/existencias/preview",
            {"id_dependencia": 1},
            "get_existencias",
            (SAMPLE_EXISTENCIAS, SAMPLE_DEPENDENCIA),
            ["dependencia", "items", "total_items", "total_cantidad"],
        ),
        (
            "/api/v1/reportes/movimientos-dependencia/preview",
            {"id_dependencia": 1, "fecha_inicio": "2024-01-01",
             "fecha_fin": "2024-12-31"},
            "get_movimientos_dependencia",
            (SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA),
            ["dependencia", "items", "total_items",
             "total_entradas", "total_salidas"],
        ),
        (
            "/api/v1/reportes/movimientos-producto/preview",
            {"id_dependencia": 1, "id_producto": 1,
             "fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
            "get_movimientos_producto",
            (SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA, SAMPLE_PRODUCTO),
            ["dependencia", "producto", "items", "total_items",
             "total_entradas", "total_salidas"],
        ),
        (
            "/api/v1/reportes/proveedores-dependencia/preview",
            {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
            "get_proveedores_por_dependencia",
            (SAMPLE_PROVEEDORES, SAMPLE_DEPENDENCIA),
            ["dependencia", "items", "total_items"],
        ),
    ])
    def test_preview_con_token(
        self, client, auth_success, path, params,
        func_name, mock_return, expected_keys,
    ):
        """Verifica que cada preview con token retorna 200 + claves esperadas."""
        with patch.object(reportes_router, func_name,
                          new=AsyncMock(return_value=mock_return)):
            response = client.get(path, params=params)

        assert response.status_code == 200, (
            f"[{path}] Esperaba 200, obtuvo {response.status_code}: "
            f"{response.text[:200]}"
        )
        data = response.json()
        for key in expected_keys:
            assert key in data, (
                f"[{path}] Respuesta debería contener '{key}', "
                f"claves actuales: {list(data.keys())}"
            )
        assert isinstance(data["total_items"], int)
        if "total_cantidad" in expected_keys:
            assert isinstance(data["total_cantidad"], (int, float))
        if "total_entradas" in expected_keys:
            assert isinstance(data["total_entradas"], (int, float))
            assert isinstance(data["total_salidas"], (int, float))


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 4 – Errores internos no exponen detalles
# ═══════════════════════════════════════════════════════════════════════════════


class TestErrorSanitizado:
    """Test 4: Excepción interna → 500 + mensaje genérico (sin leak)."""

    DETALLE_INTERNO = "CONEXION_BD_PERDIDA_CRITICA"

    @pytest.mark.parametrize("path,params,func_name", [
        (
            "/api/v1/reportes/existencias/preview",
            {"id_dependencia": 1},
            "get_existencias",
        ),
        (
            "/api/v1/reportes/movimientos-dependencia/preview",
            {"id_dependencia": 1, "fecha_inicio": "2024-01-01",
             "fecha_fin": "2024-12-31"},
            "get_movimientos_dependencia",
        ),
        (
            "/api/v1/reportes/movimientos-producto/preview",
            {"id_dependencia": 1, "id_producto": 1,
             "fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
            "get_movimientos_producto",
        ),
        (
            "/api/v1/reportes/proveedores-dependencia/preview",
            {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
            "get_proveedores_por_dependencia",
        ),
        (
            "/api/v1/reportes/existencias",
            {"id_dependencia": 1},
            "get_existencias",
        ),
        (
            "/api/v1/reportes/proveedores-dependencia",
            {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
            "get_proveedores_por_dependencia",
        ),
    ])
    def test_error_interno_no_expone_detalle(
        self, client, auth_success, path, params, func_name,
    ):
        """Verifica que el mensaje de error NO contiene el detalle interno."""
        with patch.object(
            reportes_router, func_name,
            new=AsyncMock(side_effect=Exception(self.DETALLE_INTERNO)),
        ):
            response = client.get(path, params=params)

        assert response.status_code == 500, (
            f"[{path}] Esperaba 500, obtuvo {response.status_code}: "
            f"{response.text[:200]}"
        )
        data = response.json()
        detail = data.get("detail", "")
        assert self.DETALLE_INTERNO not in detail, (
            f"[{path}] El detalle interno NO debe exponerse: {detail}"
        )
        assert "Error interno" in detail, (
            f"[{path}] El mensaje debe ser genérico, obtuvo: {detail}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 5 – PDF generation con notas
# ═══════════════════════════════════════════════════════════════════════════════


class TestPDFGeneration:
    """Test 5: Endpoints PDF retornan ``StreamingResponse`` PDF con notas."""

    def test_pdf_existencias_con_notas(self, client, auth_success):
        """PDF existencias → StreamingResponse con ``application/pdf`` + notas."""
        with patch.object(
            reportes_router, "get_existencias",
            new=AsyncMock(return_value=(SAMPLE_EXISTENCIAS, SAMPLE_DEPENDENCIA)),
        ):
            params = {
                "id_dependencia": 1,
                "notas": "Observación de prueba para existencias.",
                "aprobado_por_nombre": "Juan Perez",
                "aprobado_por_cargo": "Director de Operaciones",
            }
            response = client.get(
                "/api/v1/reportes/existencias", params=params,
            )

        assert response.status_code == 200, (
            f"Esperaba 200, obtuvo {response.status_code}: {response.text[:200]}"
        )
        ct = response.headers.get("content-type", "")
        assert ct.startswith("application/pdf"), (
            f"Esperaba Content-Type application/pdf, obtuvo: {ct}"
        )
        assert len(response.content) > 0, "El PDF no debe estar vacío"

    def test_pdf_movimientos_dependencia_con_notas(self, client, auth_success):
        """PDF movimientos-dependencia → StreamingResponse con PDF."""
        with patch.object(
            reportes_router, "get_movimientos_dependencia",
            new=AsyncMock(return_value=(SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA)),
        ):
            params = {
                "id_dependencia": 1,
                "fecha_inicio": "2024-01-01",
                "fecha_fin": "2024-12-31",
                "notas": "Observaciones del período.",
                "aprobado_por_nombre": "Maria Lopez",
                "aprobado_por_cargo": "Jefe de Almacén",
            }
            response = client.get(
                "/api/v1/reportes/movimientos-dependencia", params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_movimientos_producto_con_notas(self, client, auth_success):
        """PDF movimientos-producto → StreamingResponse con PDF."""
        with patch.object(
            reportes_router, "get_movimientos_producto",
            new=AsyncMock(return_value=(
                SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA, SAMPLE_PRODUCTO,
            )),
        ):
            params = {
                "id_dependencia": 1,
                "id_producto": 1,
                "fecha_inicio": "2024-01-01",
                "fecha_fin": "2024-12-31",
                "notas": "Notas del producto específico.",
            }
            response = client.get(
                "/api/v1/reportes/movimientos-producto", params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_proveedores_dependencia_con_notas(self, client, auth_success):
        """PDF proveedores-dependencia → StreamingResponse con PDF."""
        with patch.object(
            reportes_router, "get_proveedores_por_dependencia",
            new=AsyncMock(return_value=(SAMPLE_PROVEEDORES, SAMPLE_DEPENDENCIA)),
        ):
            params = {
                "id_dependencia": 1,
                "tipo_entidad": "NATURAL",
                "notas": "Notas sobre proveedores.",
                "aprobado_por_nombre": "Carlos Ruiz",
                "aprobado_por_cargo": "Director Financiero",
            }
            response = client.get(
                "/api/v1/reportes/proveedores-dependencia", params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 6 – PDFTemplate unit test
# ═══════════════════════════════════════════════════════════════════════════════


class TestPDFTemplate:
    """Test 6: Tests unitarios directos de ``PDFTemplate`` y ``format_quantity``."""

    def test_template_build_basic(self):
        """``build()`` retorna un ``BytesIO`` con cabecera ``%PDF``."""
        template = PDFTemplate(title="REPORTE DE PRUEBA", landscape_mode=False)
        template.set_company_header(
            name="Caguayo Test",
            address="Calle Falsa 123",
        )
        template.set_filters({"Dependencia": "DEP-001", "Período": "2024"})

        headers = ["CÓDIGO", "DESCRIPCIÓN", "CANTIDAD"]
        data = [["P001", "Producto A", "100"], ["P002", "Producto B", "50"]]
        template.add_table(headers, data, code_columns=[0], numeric_columns=[2])
        template.add_notes_section("Nota de prueba para el template.")

        result = template.build()
        assert isinstance(result, BytesIO), "build() debe retornar BytesIO"
        assert result.tell() == 0, "El buffer debe estar al inicio (seek=0)"
        content = result.read()
        assert len(content) > 0, "El PDF generado no debe estar vacío"
        assert content.startswith(b"%PDF"), "Debe comenzar con la cabecera PDF"

    def test_template_empty_state(self):
        """Sin tablas, muestra mensaje de 'sin datos'."""
        template = PDFTemplate(title="REPORTE VACÍO")
        template.set_company_header(name="Caguayo Test")
        result = template.build()
        content = result.read()
        assert len(content) > 0
        assert content.startswith(b"%PDF")

    def test_template_with_signatures(self):
        """``add_signature_section`` incluye bloque de firmas en el PDF."""
        template = PDFTemplate(title="REPORTE CON FIRMAS")
        template.set_company_header(name="Caguayo Test")

        headers = ["ITEM", "VALOR"]
        data = [["Test", "123"]]
        template.add_table(headers, data)
        template.add_signature_section(
            created_by="Admin Test",
            approved_by="Jefe Test",
            approved_role="Director",
        )

        result = template.build()
        content = result.read()
        assert len(content) > 0
        assert content.startswith(b"%PDF")

    def test_template_landscape_mode(self):
        """Modo ``landscape=True`` genera página con ancho > alto."""
        template = PDFTemplate(title="REPORTE HORIZONTAL", landscape_mode=True)
        template.set_company_header(name="Caguayo Test")

        headers = ["COL1", "COL2", "COL3", "COL4", "COL5"]
        data = [["A", "B", "C", "D", "E"]]
        template.add_table(headers, data)

        result = template.build()
        content = result.read()
        assert len(content) > 0
        assert content.startswith(b"%PDF")
        assert template.page_size[0] > template.page_size[1], (
            "En landscape, el ancho debe ser mayor que el alto"
        )

    def test_format_quantity(self):
        """``format_quantity`` formatea correctamente enteros, decimales y errores."""
        assert format_quantity(1000) == "1,000"
        assert format_quantity(1000.5) == "1,000.50"
        assert format_quantity(0) == "0"
        assert format_quantity("no numerico") == "no numerico"
        assert format_quantity("") == ""
        assert format_quantity(None) == "None"

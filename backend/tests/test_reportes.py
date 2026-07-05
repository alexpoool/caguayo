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
  - Usa ``app.dependency_overrides`` para reemplazar ``get_optional_user`` (en
    ambos routers: ``reportes_router`` y ``proyecto_router``) y ``get_session``
    (con async generator), evitando depender de BD real para la autenticación.
  - Usa ``unittest.mock.patch.object`` para interceptar las funciones del
    servicio en el namespace correcto (``reportes_router`` o ``proyecto_router``,
    según dónde sean importadas con ``from ... import``).
  - Tests con ``pytest.mark.parametrize`` para cubrir los 4 endpoints sin
    duplicar código.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from io import BytesIO
from datetime import date

from main import app
from src.database.connection import get_session
from src.dto.auth_dto import UsuarioInfo, DependenciaInfo, GrupoInfo
from src.utils.pdf_template import PDFTemplate, format_quantity
from sqlalchemy.ext.asyncio import AsyncSession

# Referencia al módulo del router para parchear correctamente las funciones
# importadas por nombre (from ... import <func>)
from src.routes import reportes_router, proyecto_router


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
    Override ``get_optional_user`` en ambos routers (reportes y proyecto)
    y ``get_session`` (async generator) → flujo de autenticación exitosa sin BD real.
    """

    async def _override_optional_user():
        return mock_usuario

    async def _override_get_session():
        yield mock_db_session

    app.dependency_overrides.update(
        {
            reportes_router.get_optional_user: _override_optional_user,
            proyecto_router.get_optional_user: _override_optional_user,
            get_session: _override_get_session,
        }
    )
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def auth_fail(mock_db_session):
    """
    Override ``get_optional_user`` en ambos routers → lanza ``HTTPException(401)``.
    También mockea ``get_session`` para evitar dependencia de BD.
    """

    async def _override_optional_user_401():
        raise HTTPException(
            status_code=401, detail="Token de autenticación requerido"
        )

    async def _override_get_session():
        yield mock_db_session

    app.dependency_overrides.update(
        {
            reportes_router.get_optional_user: _override_optional_user_401,
            proyecto_router.get_optional_user: _override_optional_user_401,
            get_session: _override_get_session,
        }
    )
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

    @pytest.mark.parametrize(
        "path,params",
        [
            (
                "/api/v1/reportes/existencias/preview",
                {"id_dependencia": 1},
            ),
            (
                "/api/v1/reportes/movimientos-dependencia/preview",
                {
                    "id_dependencia": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
            ),
            (
                "/api/v1/reportes/movimientos-producto/preview",
                {
                    "id_dependencia": 1,
                    "id_producto": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
            ),
            (
                "/api/v1/reportes/proveedores-dependencia/preview",
                {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
            ),
        ],
    )
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

    @pytest.mark.parametrize(
        "path,params",
        [
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
                {
                    "id_dependencia": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
            ),
            (
                "/api/v1/reportes/movimientos-producto",
                {
                    "id_dependencia": 1,
                    "id_producto": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
            ),
        ],
    )
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

    @pytest.mark.parametrize(
        "path,params,func_name,mock_return,expected_keys",
        [
            (
                "/api/v1/reportes/existencias/preview",
                {"id_dependencia": 1},
                "get_existencias",
                (SAMPLE_EXISTENCIAS, SAMPLE_DEPENDENCIA),
                ["dependencia", "items", "total_items", "total_cantidad"],
            ),
            (
                "/api/v1/reportes/movimientos-dependencia/preview",
                {
                    "id_dependencia": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
                "get_movimientos_dependencia",
                (SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA),
                [
                    "dependencia",
                    "items",
                    "total_items",
                    "total_entradas",
                    "total_salidas",
                ],
            ),
            (
                "/api/v1/reportes/movimientos-producto/preview",
                {
                    "id_dependencia": 1,
                    "id_producto": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
                "get_movimientos_producto",
                (SAMPLE_MOVIMIENTOS, SAMPLE_DEPENDENCIA, SAMPLE_PRODUCTO),
                [
                    "dependencia",
                    "producto",
                    "items",
                    "total_items",
                    "total_entradas",
                    "total_salidas",
                ],
            ),
            (
                "/api/v1/reportes/proveedores-dependencia/preview",
                {"id_dependencia": 1, "tipo_entidad": "NATURAL"},
                "get_proveedores_por_dependencia",
                (SAMPLE_PROVEEDORES, SAMPLE_DEPENDENCIA),
                ["dependencia", "items", "total_items"],
            ),
        ],
    )
    def test_preview_con_token(
        self,
        client,
        auth_success,
        path,
        params,
        func_name,
        mock_return,
        expected_keys,
    ):
        """Verifica que cada preview con token retorna 200 + claves esperadas."""
        with patch.object(
            reportes_router, func_name, new=AsyncMock(return_value=mock_return)
        ):
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

    @pytest.mark.parametrize(
        "path,params,func_name",
        [
            (
                "/api/v1/reportes/existencias/preview",
                {"id_dependencia": 1},
                "get_existencias",
            ),
            (
                "/api/v1/reportes/movimientos-dependencia/preview",
                {
                    "id_dependencia": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
                "get_movimientos_dependencia",
            ),
            (
                "/api/v1/reportes/movimientos-producto/preview",
                {
                    "id_dependencia": 1,
                    "id_producto": 1,
                    "fecha_inicio": "2024-01-01",
                    "fecha_fin": "2024-12-31",
                },
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
        ],
    )
    def test_error_interno_no_expone_detalle(
        self,
        client,
        auth_success,
        path,
        params,
        func_name,
    ):
        """Verifica que el mensaje de error NO contiene el detalle interno."""
        with patch.object(
            reportes_router,
            func_name,
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
            reportes_router,
            "get_existencias",
            new=AsyncMock(return_value=(SAMPLE_EXISTENCIAS, SAMPLE_DEPENDENCIA)),
        ):
            params = {
                "id_dependencia": 1,
                "notas": "Observación de prueba para existencias.",
                "aprobado_por_nombre": "Juan Perez",
                "aprobado_por_cargo": "Director de Operaciones",
            }
            response = client.get(
                "/api/v1/reportes/existencias",
                params=params,
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
            reportes_router,
            "get_movimientos_dependencia",
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
                "/api/v1/reportes/movimientos-dependencia",
                params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_movimientos_producto_con_notas(self, client, auth_success):
        """PDF movimientos-producto → StreamingResponse con PDF."""
        with patch.object(
            reportes_router,
            "get_movimientos_producto",
            new=AsyncMock(
                return_value=(
                    SAMPLE_MOVIMIENTOS,
                    SAMPLE_DEPENDENCIA,
                    SAMPLE_PRODUCTO,
                )
            ),
        ):
            params = {
                "id_dependencia": 1,
                "id_producto": 1,
                "fecha_inicio": "2024-01-01",
                "fecha_fin": "2024-12-31",
                "notas": "Notas del producto específico.",
            }
            response = client.get(
                "/api/v1/reportes/movimientos-producto",
                params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_proveedores_dependencia_con_notas(self, client, auth_success):
        """PDF proveedores-dependencia → StreamingResponse con PDF."""
        with patch.object(
            reportes_router,
            "get_proveedores_por_dependencia",
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
                "/api/v1/reportes/proveedores-dependencia",
                params=params,
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


# ═══════════════════════════════════════════════════════════════════════════════
#  DATOS DE PRUEBA – NUEVOS REPORTES (7 reportes × 2 endpoints c/u)
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_CLIENTES: list = [
    {
        "id_cliente": 1,
        "nombre": "Cliente Test S.A.",
        "reeup": "REUP001",
        "nit": "NIT001",
        "direccion": "Calle 1 #123",
    },
]

SAMPLE_META_CLIENTES: dict = {"total": 1}

SAMPLE_PROYECTOS: list = [
    {
        "id_contrato": 1,
        "codigo": "PROJ001",
        "nombre": "Proyecto Alpha",
        "cliente": "Cliente Test",
        "fecha": date(2024, 6, 1),
        "valor": 1000.0,
        "moneda": "CUP (Peso Cubano)",
        "tipo_contrato": "Servicios",
        "estado": "Activo",
    },
]

SAMPLE_META_PROYECTOS: dict = {
    "total": 1,
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-12-31",
}

SAMPLE_CREADORES: list = [
    {
        "id_cliente": 1,
        "carnet_identidad": "12345678901",
        "nombre_completo": "Juan Perez Lopez",
        "direccion": "Calle 456",
        "municipio": "Plaza",
        "provincia": "La Habana",
        "numero_registro": "REG001",
        "codigo": "CRE001",
        "vigencia": "SÍ",
        "vigencia_fecha": "",
        "fecha_baja": "",
        "en_baja": False,
    },
]

SAMPLE_META_CREADORES: dict = {"total": 1, "grupos_municipio": {"Plaza": 1}}

SAMPLE_DESEMPENO: list = [
    {
        "id_persona": 1,
        "persona_nombre": "Juan Perez",
        "persona_codigo": "CRE001",
        "codigo_proyecto": "PROJ001",
        "proyecto_descripcion": "Proyecto Alpha",
        "nombre_etapa": "Etapa 1",
        "numero_etapa": 1,
        "etapa_valor": 500.0,
        "cobro": 250.0,
        "por_cobrar": 250.0,
        "fecha_pago": date(2024, 6, 1),
        "pagada": False,
        "fecha_solicitud": date(2024, 5, 1),
    },
]

SAMPLE_META_DESEMPENO: dict = {
    "total_items": 1,
    "total_personas": 1,
    "totales_por_persona": {
        "Juan Perez": {
            "total_cobro": 250.0,
            "total_valor": 500.0,
            "id_persona": 1,
        },
    },
    "gran_total_cobro": 250.0,
    "gran_total_valor": 500.0,
}

SAMPLE_ONAT: list = [
    {
        "id_liquidacion": 1,
        "numero": "LIQ001",
        "fecha_emision": date(2024, 6, 1),
        "fecha_liquidacion": date(2024, 6, 15),
        "persona_nombre": "Juan Perez",
        "carnet_identidad": "12345678901",
        "numero_registro": "REG001",
        "nit": "",
        "direccion": "Calle 123",
        "moneda": "CUP (Peso Cubano)",
        "importe": 1000.0,
        "devengado": 800.0,
        "porcentaje_caguayo": 10.0,
        "importe_caguayo": 80.0,
        "porciento_gestion": 5.0,
        "porciento_empresa": 5.0,
        "tributario": 15.0,
        "tributario_monto": 120.0,
        "comision_bancaria": 10.0,
        "gasto_empresa": 20.0,
        "neto_pagar": 650.0,
        "tipo_pago": "Transferencia",
        "confirmado": True,
    },
]

SAMPLE_META_ONAT: dict = {
    "total_items": 1,
    "totales": {
        "total_importe": 1000.0,
        "total_devengado": 800.0,
        "total_importe_caguayo": 80.0,
        "total_tributario_monto": 120.0,
        "total_comision_bancaria": 10.0,
        "total_gasto_empresa": 20.0,
        "total_neto_pagar": 650.0,
    },
}

SAMPLE_BRACKETS: list = [
    {
        "bracket": "Hasta 100",
        "desde": 0,
        "hasta": 100,
        "cantidad": 5,
        "total_devengado": 250.0,
        "cantidad_artistas": 3,
    },
    {
        "bracket": "De 101 a 500",
        "desde": 101,
        "hasta": 500,
        "cantidad": 2,
        "total_devengado": 600.0,
        "cantidad_artistas": 2,
    },
]

SAMPLE_META_MINCULT: dict = {
    "total_liquidaciones": 7,
    "total_devengado_general": 850.0,
}

SAMPLE_LIQUIDACIONES: list = [
    {
        "id_liquidacion": 1,
        "codigo": "LIQ001",
        "fecha_emision": date(2024, 6, 1),
        "fecha_liquidacion": date(2024, 6, 15),
        "cliente_nombre": "Cliente Test",
        "cliente_nit": "NIT001",
        "cliente_codigo": "CLI001",
        "moneda": "CUP (Peso Cubano)",
        "devengado": 800.0,
        "tributario": 15.0,
        "comision_bancaria": 10.0,
        "gasto_empresa": 20.0,
        "importe": 1000.0,
        "neto_pagar": 650.0,
        "porcentaje_caguayo": 10.0,
        "importe_caguayo": 80.0,
        "tributario_monto": 120.0,
        "tipo_pago": "Transferencia",
        "liquidada": True,
        "productos": [],
    },
]

SAMPLE_META_LIQUIDACIONES: dict = {
    "total_items": 1,
    "totales": {
        "total_devengado": 800.0,
        "total_tributario": 15.0,
        "total_comision_bancaria": 10.0,
        "total_gasto_empresa": 20.0,
        "total_importe": 1000.0,
        "total_neto_pagar": 650.0,
        "total_importe_caguayo": 80.0,
        "total_tributario_monto": 120.0,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 7 – Auth rejection: 7 nuevos preview endpoints (401)
# ═══════════════════════════════════════════════════════════════════════════════


class TestPreviewRechazoSinTokenNuevos:
    """Test 7: Los 7 nuevos endpoints **preview** retornan 401 sin token."""

    @pytest.mark.parametrize(
        "path,params",
        [
            ("/api/v1/reportes/clientes/preview", {}),
            ("/api/v1/reportes/proyectos/preview", {}),
            ("/api/v1/proyecto/preview", {}),
            ("/api/v1/reportes/desempeno/preview", {}),
            ("/api/v1/reportes/onat/preview", {}),
            ("/api/v1/reportes/mincult/preview", {}),
            ("/api/v1/reportes/liquidaciones/preview", {}),
        ],
    )
    def test_preview_rechaza_sin_token(self, client, auth_fail, path, params):
        """Verifica que cada nuevo preview retorna 401 cuando la auth falla."""
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
#  TEST 8 – Auth rejection: 7 nuevos PDF endpoints (401)
# ═══════════════════════════════════════════════════════════════════════════════


class TestPDFRechazoSinTokenNuevos:
    """Test 8: Los 7 nuevos endpoints **PDF** retornan 401 sin token."""

    @pytest.mark.parametrize(
        "path,params",
        [
            ("/api/v1/reportes/clientes", {}),
            ("/api/v1/reportes/proyectos", {}),
            ("/api/v1/proyecto/", {}),
            ("/api/v1/reportes/desempeno", {}),
            ("/api/v1/reportes/onat", {}),
            ("/api/v1/reportes/mincult", {}),
            ("/api/v1/reportes/liquidaciones", {}),
        ],
    )
    def test_pdf_rechaza_sin_token(self, client, auth_fail, path, params):
        """Verifica que cada nuevo PDF retorna 401 cuando la auth falla."""
        response = client.get(path, params=params)
        assert response.status_code == 401, (
            f"[{path}] Esperaba 401, obtuvo {response.status_code}: "
            f"{response.text[:200]}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 9 – Preview nuevos endpoints con token (200 + estructura JSON)
# ═══════════════════════════════════════════════════════════════════════════════


class TestPreviewConTokenNuevos:
    """Test 9: 7 nuevos preview retornan 200 y estructura JSON correcta con auth."""

    @pytest.mark.parametrize(
        "path,params,func_name,mock_return,expected_keys",
        [
            (
                "/api/v1/reportes/clientes/preview",
                {},
                "get_registro_clientes",
                (SAMPLE_CLIENTES, SAMPLE_META_CLIENTES),
                ["items", "total_items"],
            ),
            (
                "/api/v1/reportes/proyectos/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_registro_proyectos",
                (SAMPLE_PROYECTOS, SAMPLE_META_PROYECTOS),
                ["items", "total_items"],
            ),
            (
                "/api/v1/proyecto/preview",
                {},
                "get_registro_creadores",
                (SAMPLE_CREADORES, SAMPLE_META_CREADORES),
                ["items", "total_items", "grupos_municipio"],
            ),
            (
                "/api/v1/reportes/desempeno/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_informe_desempeno",
                (SAMPLE_DESEMPENO, SAMPLE_META_DESEMPENO),
                [
                    "items",
                    "total_items",
                    "totales_por_persona",
                    "gran_total_cobro",
                    "gran_total_valor",
                ],
            ),
            (
                "/api/v1/reportes/onat/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_reporte_onat",
                (SAMPLE_ONAT, SAMPLE_META_ONAT),
                ["items", "total_items", "totales"],
            ),
            (
                "/api/v1/reportes/mincult/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_reporte_mincult",
                (SAMPLE_BRACKETS, SAMPLE_META_MINCULT),
                [
                    "items",
                    "total_brackets",
                    "total_liquidaciones",
                    "total_devengado_general",
                ],
            ),
            (
                "/api/v1/reportes/liquidaciones/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_resumen_liquidaciones",
                (SAMPLE_LIQUIDACIONES, SAMPLE_META_LIQUIDACIONES),
                ["items", "total_items", "totales"],
            ),
        ],
    )
    def test_preview_con_token(
        self,
        client,
        auth_success,
        path,
        params,
        func_name,
        mock_return,
        expected_keys,
    ):
        """Verifica que cada nuevo preview con token retorna 200 + claves esperadas."""
        target_module = (
            proyecto_router if func_name == "get_registro_creadores"
            else reportes_router
        )
        with patch.object(
            target_module, func_name, new=AsyncMock(return_value=mock_return)
        ):
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
        if "total_items" in data:
            assert isinstance(data["total_items"], int), (
                f"[{path}] total_items debe ser int, obtuvo {type(data['total_items'])}"
            )
        if "total_brackets" in data:
            assert isinstance(data["total_brackets"], int), (
                f"[{path}] total_brackets debe ser int, "
                f"obtuvo {type(data['total_brackets'])}"
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  TEST 10 – Error sanitizado en nuevos endpoints
# ═══════════════════════════════════════════════════════════════════════════════


class TestErrorSanitizadoNuevos:
    """Test 10: Excepción interna en nuevos endpoints → 500 + mensaje genérico."""

    DETALLE_INTERNO = "FALLO_CRITICO_EN_NUEVO_REPORTE"

    @pytest.mark.parametrize(
        "path,params,func_name",
        [
            # 2 preview endpoints
            (
                "/api/v1/reportes/clientes/preview",
                {},
                "get_registro_clientes",
            ),
            (
                "/api/v1/reportes/proyectos/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_registro_proyectos",
            ),
            # 2 PDF endpoints
            (
                "/api/v1/reportes/clientes",
                {},
                "get_registro_clientes",
            ),
            (
                "/api/v1/reportes/proyectos",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_registro_proyectos",
            ),
            # 2 additional: creadores PDF + desempeno preview
            (
                "/api/v1/proyecto/",
                {},
                "get_registro_creadores",
            ),
            (
                "/api/v1/reportes/desempeno/preview",
                {"fecha_inicio": "2024-01-01", "fecha_fin": "2024-12-31"},
                "get_informe_desempeno",
            ),
        ],
    )
    def test_error_interno_no_expone_detalle(
        self,
        client,
        auth_success,
        path,
        params,
        func_name,
    ):
        """Verifica que el mensaje de error NO contiene el detalle interno."""
        target_module = (
            proyecto_router if func_name == "get_registro_creadores"
            else reportes_router
        )
        with patch.object(
            target_module,
            func_name,
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
#  TEST 11 – PDF generation con notas para nuevos reportes
# ═══════════════════════════════════════════════════════════════════════════════


class TestPDFGenerationNuevos:
    """Test 11: 4 nuevos endpoints PDF retornan ``StreamingResponse`` PDF."""

    def test_pdf_clientes_con_notas(self, client, auth_success):
        """PDF clientes → StreamingResponse con ``application/pdf`` + notas."""
        with patch.object(
            reportes_router,
            "get_registro_clientes",
            new=AsyncMock(return_value=(SAMPLE_CLIENTES, SAMPLE_META_CLIENTES)),
        ):
            params = {
                "notas": "Observaciones para el reporte de clientes.",
                "aprobado_por_nombre": "Ana Martinez",
                "aprobado_por_cargo": "Directora Comercial",
            }
            response = client.get(
                "/api/v1/reportes/clientes",
                params=params,
            )

        assert response.status_code == 200, (
            f"Esperaba 200, obtuvo {response.status_code}: {response.text[:200]}"
        )
        ct = response.headers.get("content-type", "")
        assert ct.startswith("application/pdf"), (
            f"Esperaba Content-Type application/pdf, obtuvo: {ct}"
        )
        assert len(response.content) > 0, "El PDF no debe estar vacío"

    def test_pdf_proyectos_con_notas(self, client, auth_success):
        """PDF proyectos → StreamingResponse con ``application/pdf``."""
        with patch.object(
            reportes_router,
            "get_registro_proyectos",
            new=AsyncMock(
                return_value=(
                    SAMPLE_PROYECTOS,
                    SAMPLE_META_PROYECTOS,
                )
            ),
        ):
            params = {
                "fecha_inicio": "2024-01-01",
                "fecha_fin": "2024-12-31",
                "notas": "Resumen de proyectos del período.",
                "aprobado_por_nombre": "Carlos Ruiz",
                "aprobado_por_cargo": "Gerente de Proyectos",
            }
            response = client.get(
                "/api/v1/reportes/proyectos",
                params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_creadores_con_notas(self, client, auth_success):
        """PDF creadores → StreamingResponse con ``application/pdf``."""
        with patch.object(
            proyecto_router,
            "get_registro_creadores",
            new=AsyncMock(
                return_value=(
                    SAMPLE_CREADORES,
                    SAMPLE_META_CREADORES,
                )
            ),
        ):
            params = {
                "notas": "Registro de creadores activos.",
                "aprobado_por_nombre": "Laura Vega",
                "aprobado_por_cargo": "Coordinadora de Registro",
            }
            response = client.get(
                "/api/v1/proyecto/",
                params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

    def test_pdf_desempeno_con_notas(self, client, auth_success):
        """PDF desempeño → StreamingResponse con ``application/pdf``."""
        with patch.object(
            reportes_router,
            "get_informe_desempeno",
            new=AsyncMock(
                return_value=(
                    SAMPLE_DESEMPENO,
                    SAMPLE_META_DESEMPENO,
                )
            ),
        ):
            params = {
                "fecha_inicio": "2024-01-01",
                "fecha_fin": "2024-12-31",
                "notas": "Informe de desempeño del primer semestre.",
                "aprobado_por_nombre": "Mario Diaz",
                "aprobado_por_cargo": "Director de Operaciones",
            }
            response = client.get(
                "/api/v1/reportes/desempeno",
                params=params,
            )

        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0

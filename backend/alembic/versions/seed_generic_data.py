"""seed generic catalog data

Revision ID: seed_generic_data
Revises: merge_cuentas_and_estadoventa
Create Date: 2026-08-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "seed_generic_data"
down_revision: Union[str, None] = "merge_cuentas_and_estadoventa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


MONEDAS = [
    ("Dólar Americano", "Dólar Estadounidense", "USD"),
    ("Euro", "Euro de la Unión Europea", "EUR"),
]

TIPOS_CONTRATO = [
    ("SERVICIO", "Contrato de servicios"),
    ("OBRA", "Contrato de obra"),
    ("MANTENIMIENTO", "Contrato de mantenimiento"),
    ("ALQUILER", "Contrato de alquiler"),
    ("COMPRA", "Contrato de compraventa"),
]

TIPOS_CONVENIO = [
    ("COMPRA VENTA", "Convenio de compraventa de productos"),
    ("CONSIGNACION", "Consignación de productos para liquidación posterior"),
]

ESTADOS_CONTRATO = [
    ("ACTIVO", "Contrato vigente"),
    ("CANCELADO", "Contrato cancelado"),
    ("FINALIZADO", "Contrato finalizado"),
    ("PENDIENTE", "Contrato pendiente de aprobación"),
]

TIPOS_MOVIMIENTO = [
    ("compra", 1),
    ("venta", -1),
    ("RECEPCION", 1),
    ("MERMA", -1),
    ("DONACION", -1),
    ("DEVOLUCION", -1),
    ("AJUSTE_QUITAR", -1),
    ("AJUSTE_AGREGAR", 1),
]

TIPOS_ENTIDAD = [
    ("OSDE", "Organización Superior de Dirección Empresarial"),
    ("UEB", "Unidad Empresarial de Base"),
    ("Empresas Presupuestadas", "Entidades presupuestadas del Estado"),
    ("Instituciones MINSAP", "Instituciones rectoras del Ministerio de Salud Pública"),
]

TIPOS_PROVEEDOR = [
    ("Nacional", "Proveedor nacional"),
    ("Internacional", "Proveedor internacional"),
    ("Persona Natural", "Persona física como proveedor"),
    ("Persona Jurídica", "Empresa o entidad jurídica como proveedor"),
]

CATEGORIAS = [
    ("General", "Categoría general de productos"),
]

SUBCATEGORIAS = [
    (1, "General", "Subcategoría general de productos"),
]

PROVINCIAS = [
    "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
    "Cienfuegos", "Villa Clara", "Sancti Spiritus", "Ciego de Ávila",
    "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
    "Guantánamo", "Isla de la Juventud",
]

MUNICIPIOS = {
    1: [  # Pinar del Río
        "Sandino", "Mantua", "Minas de Matahambre", "Viñales", "La Palma",
        "Los Palacios", "Consolación del Sur", "Pinar del Río", "San Luis",
        "San Juan y Martínez", "Guane",
    ],
    2: [  # Artemisa
        "Bahía Honda", "Mariel", "Guanajay", "Caimito", "Bauta",
        "San Antonio de los Baños", "Güira de Melena", "Artemisa",
        "Candelaria", "San Cristóbal", "Alquízar", "Güines",
        "Batabanó", "Melena del Sur", "Quivicán",
    ],
    3: [  # La Habana
        "Playa", "Plaza de la Revolución", "Centro Habana",
        "La Habana Vieja", "Regla", "La Habana del Este",
        "Guanabacoa", "San Miguel del Padrón", "Diez de Octubre",
        "Cerro", "Marianao", "La Lisa", "Boyeros", "Arroyo Naranjo",
        "Cotorro",
    ],
    4: [  # Mayabeque
        "Bejucal", "San José de las Lajas", "Jaruco",
        "Santa Cruz del Norte", "Madruga", "Nueva Paz",
        "San Nicolás", "Güines", "Melena del Sur", "Batabanó",
    ],
    5: [  # Matanzas
        "Matanzas", "Cárdenas", "Martí", "Colón", "Perico",
        "Jovellanos", "Pedro Betancourt", "Limonar",
        "Unión de Reyes", "Ciénaga de Zapata", "Jagüey Grande",
        "Calimete", "Los Arabos",
    ],
    6: [  # Cienfuegos
        "Aguada de Pasajeros", "Rodas", "Palmira", "Lajas",
        "Cruces", "Cumanayagua", "Cienfuegos", "Abreus",
    ],
    7: [  # Villa Clara
        "Corralillo", "Quemado de Güines", "Sagua la Grande",
        "Encrucijada", "Camajuaní", "Caibarién", "Remedios",
        "Placetas", "Santa Clara", "Cifuentes", "Santo Domingo",
        "Ranchuelo", "Manicaragua",
    ],
    8: [  # Sancti Spiritus
        "Yaguajay", "Jatibonico", "Taguasco", "Cabaiguán",
        "Fomento", "Trinidad", "Sancti Spíritus", "La Sierpe",
    ],
    9: [  # Ciego de Ávila
        "Chambas", "Morón", "Bolivia", "Primero de Enero",
        "Ciro Redondo", "Florencia", "Majagua", "Ciego de Ávila",
        "Venezuela", "Baraguá",
    ],
    10: [  # Camagüey
        "Carlos Manuel de Céspedes", "Esmeralda", "Sierra de Cubitas",
        "Minas", "Nuevitas", "Guáimaro", "Sibanicú", "Najasa",
        "Santa Cruz del Sur", "Camagüey", "Florida", "Vertientes",
        "Jimaguayú",
    ],
    11: [  # Las Tunas
        "Manatí", "Puerto Padre", "Jesús Menéndez", "Majibacoa",
        "Las Tunas", "Jobabo", "Colombia", "Amancio",
    ],
    12: [  # Holguín
        "Gibara", "Rafael Freyre", "Banes", "Antilla", "Báguanos",
        "Holguín", "Calixto García", "Cacocum", "Urbano Noris",
        "Cueto", "Mayarí", "Frank País", "Sagua de Tánamo", "Moa",
    ],
    13: [  # Granma
        "Río Cauto", "Cauto Cristo", "Jiguaní", "Bayamo", "Yara",
        "Manzanillo", "Media Luna", "Campechuela", "Niquero",
        "Pilón", "Bartolomé Masó", "Buey Arriba", "Guisa",
    ],
    14: [  # Santiago de Cuba
        "Contramaestre", "Mella", "San Luis", "Segundo Frente",
        "Songo-La Maya", "Santiago de Cuba", "Palma Soriano",
        "Tercer Frente", "Guama",
    ],
    15: [  # Guantánamo
        "Yateras", "Baracoa", "Maisí", "Imías",
        "San Antonio del Sur", "Caimanera", "Guantánamo",
        "Niceto Pérez", "Manuel Tames", "El Salvador",
    ],
    16: [  # Isla de la Juventud
        "Isla de la Juventud",
    ],
}

FUNCIONALIDADES = [
    "movimientos", "pendientes", "productos", "configuracion", "monedas",
    "usuarios", "grupos", "proveedores", "convenios", "anexos",
    "liquidaciones", "productos_liquidacion", "clientes", "contratos",
    "suplementos", "facturas", "venta_efectivo", "servicios", "solicitudes",
    "realizadores", "proyectos", "facturas_servicio", "ofertas",
    "pre_facturas", "liquidaciones_servicio", "dependencias", "cuentas",
    "reporte_existencias", "reporte_movimientos_dependencia",
    "reporte_movimientos_producto", "reporte_proveedores",
    "reporte_clientes", "reporte_proyectos", "reporte_creadores",
    "reporte_desempeno", "reporte_liquidaciones", "reporte_onat",
    "reporte_mincult",
]

TIPOS_DEPENDENCIA = [
    ("SUCURSAL", "Sucursal o agencia"),
    ("ALMACEN", "Almacén de productos"),
]


def _insert_if_not_exists(conn, table, columns, values, unique_col=None):
    """Inserta solo si no existe un registro con el mismo valor en unique_col."""
    for val in values:
        if unique_col:
            check = conn.execute(
                sa.text(f"SELECT 1 FROM {table} WHERE {unique_col} = :val"),
                {"val": val[columns.index(unique_col)] if isinstance(val, tuple) else val},
            )
            if check.fetchone() is not None:
                continue
        if isinstance(val, tuple):
            cols_str = ", ".join(columns)
            placeholders = ", ".join([f":p{i}" for i in range(len(val))])
            params = {f"p{i}": v for i, v in enumerate(val)}
            conn.execute(
                sa.text(f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})"),
                params,
            )
        else:
            conn.execute(
                sa.text(f"INSERT INTO {table} ({columns[0]}) VALUES (:val)"),
                {"val": val},
            )


def upgrade() -> None:
    conn = op.get_bind()

    # Monedas
    _insert_if_not_exists(conn, "moneda", ["nombre", "denominacion", "simbolo"], MONEDAS, "nombre")

    # Tipos de Contrato
    _insert_if_not_exists(conn, "tipo_contrato", ["nombre", "descripcion"], TIPOS_CONTRATO, "nombre")

    # Tipos de Convenio
    _insert_if_not_exists(conn, "tipo_convenio", ["nombre", "descripcion"], TIPOS_CONVENIO, "nombre")

    # Estados de Contrato
    _insert_if_not_exists(conn, "estado_contrato", ["nombre", "descripcion"], ESTADOS_CONTRATO, "nombre")

    # Tipos de Movimiento
    _insert_if_not_exists(conn, "tipo_movimiento", ["tipo", "factor"], TIPOS_MOVIMIENTO, "tipo")

    # Tipos de Entidad
    _insert_if_not_exists(conn, "tipo_entidad", ["nombre", "descripcion"], TIPOS_ENTIDAD, "nombre")

    # Tipos de Proveedor
    _insert_if_not_exists(conn, "tipo_proveedor", ["nombre", "descripcion"], TIPOS_PROVEEDOR, "nombre")

    # Categorías
    _insert_if_not_exists(conn, "categorias", ["nombre", "descripcion"], CATEGORIAS, "nombre")

    # Subcategorías
    for id_cat, nombre, desc in SUBCATEGORIAS:
        check = conn.execute(
            sa.text("SELECT 1 FROM subcategorias WHERE id_categoria = :id_cat AND nombre = :nombre"),
            {"id_cat": id_cat, "nombre": nombre},
        )
        if check.fetchone() is None:
            conn.execute(
                sa.text("INSERT INTO subcategorias (id_categoria, nombre, descripcion) VALUES (:id_cat, :nombre, :desc)"),
                {"id_cat": id_cat, "nombre": nombre, "desc": desc},
            )

    # Provincias
    for nombre in PROVINCIAS:
        check = conn.execute(
            sa.text("SELECT 1 FROM provincia WHERE nombre = :nombre"),
            {"nombre": nombre},
        )
        if check.fetchone() is None:
            conn.execute(
                sa.text("INSERT INTO provincia (nombre) VALUES (:nombre)"),
                {"nombre": nombre},
            )

    # Municipios
    for id_prov, municipios in MUNICIPIOS.items():
        for nombre in municipios:
            check = conn.execute(
                sa.text("SELECT 1 FROM municipio WHERE id_provincia = :id_prov AND nombre = :nombre"),
                {"id_prov": id_prov, "nombre": nombre},
            )
            if check.fetchone() is None:
                conn.execute(
                    sa.text("INSERT INTO municipio (id_provincia, nombre) VALUES (:id_prov, :nombre)"),
                    {"id_prov": id_prov, "nombre": nombre},
                )

    # Grupo ADMINISTRADOR
    check = conn.execute(
        sa.text("SELECT 1 FROM grupo WHERE nombre = :nombre"),
        {"nombre": "ADMINISTRADOR"},
    )
    if check.fetchone() is None:
        conn.execute(
            sa.text("INSERT INTO grupo (nombre, descripcion) VALUES (:nombre, :desc)"),
            {"nombre": "ADMINISTRADOR", "desc": "Grupo con acceso total al sistema"},
        )

    # Grupo LECTOR (solo lectura)
    check = conn.execute(
        sa.text("SELECT 1 FROM grupo WHERE nombre = :nombre"),
        {"nombre": "LECTOR"},
    )
    if check.fetchone() is None:
        conn.execute(
            sa.text("INSERT INTO grupo (nombre, descripcion) VALUES (:nombre, :desc)"),
            {"nombre": "LECTOR", "desc": "Grupo de solo lectura para consultas"},
        )

    # Funcionalidades
    for nombre in FUNCIONALIDADES:
        check = conn.execute(
            sa.text("SELECT 1 FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": nombre},
        )
        if check.fetchone() is None:
            conn.execute(
                sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
                {"nombre": nombre},
            )

    # Asignar todas las funcionalidades al grupo ADMINISTRADOR
    result = conn.execute(
        sa.text("SELECT id_grupo FROM grupo WHERE nombre = :nombre"),
        {"nombre": "ADMINISTRADOR"},
    )
    grupo_row = result.fetchone()
    if grupo_row:
        id_grupo = grupo_row[0]
        funcionalidades = conn.execute(
            sa.text("SELECT id_funcionalidad FROM funcionalidad")
        ).fetchall()
        for (id_func,) in funcionalidades:
            check = conn.execute(
                sa.text("SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = :id_grupo AND id_funcionalidad = :id_func"),
                {"id_grupo": id_grupo, "id_func": id_func},
            )
            if check.fetchone() is None:
                conn.execute(
                    sa.text("INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) VALUES (:id_grupo, :id_func)"),
                    {"id_grupo": id_grupo, "id_func": id_func},
                )

    # Asignar funcionalidades de solo lectura al grupo LECTOR
    LECTOR_FUNCIONALIDADES = [
        "movimientos", "productos", "clientes", "convenios", "anexos",
        "liquidaciones", "contratos", "suplementos", "facturas",
        "venta_efectivo", "servicios", "solicitudes", "realizadores",
        "proyectos", "dependencias", "cuentas",
        "reporte_existencias", "reporte_movimientos_dependencia",
        "reporte_movimientos_producto", "reporte_proveedores",
        "reporte_clientes", "reporte_proyectos", "reporte_creadores",
        "reporte_desempeno", "reporte_liquidaciones", "reporte_onat",
        "reporte_mincult",
    ]
    result = conn.execute(
        sa.text("SELECT id_grupo FROM grupo WHERE nombre = :nombre"),
        {"nombre": "LECTOR"},
    )
    lector_row = result.fetchone()
    if lector_row:
        id_grupo = lector_row[0]
        for func_name in LECTOR_FUNCIONALIDADES:
            result_func = conn.execute(
                sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
                {"nombre": func_name},
            )
            func_row = result_func.fetchone()
            if func_row:
                id_func = func_row[0]
                check = conn.execute(
                    sa.text("SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = :id_grupo AND id_funcionalidad = :id_func"),
                    {"id_grupo": id_grupo, "id_func": id_func},
                )
                if check.fetchone() is None:
                    conn.execute(
                        sa.text("INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) VALUES (:id_grupo, :id_func)"),
                        {"id_grupo": id_grupo, "id_func": id_func},
                    )

    # Tipos de Dependencia
    _insert_if_not_exists(conn, "tipo_dependencia", ["nombre", "descripcion"], TIPOS_DEPENDENCIA, "nombre")


def downgrade() -> None:
    conn = op.get_bind()

    # Eliminar en orden inverso de dependencias
    conn.execute(sa.text("DELETE FROM grupo_funcionalidad"))
    conn.execute(sa.text("DELETE FROM funcionalidad"))
    conn.execute(sa.text("DELETE FROM grupo WHERE nombre = 'ADMINISTRADOR'"))
    conn.execute(sa.text("DELETE FROM municipio"))
    conn.execute(sa.text("DELETE FROM provincia"))
    conn.execute(sa.text("DELETE FROM subcategorias"))
    conn.execute(sa.text("DELETE FROM categorias"))
    conn.execute(sa.text("DELETE FROM tipo_proveedor"))
    conn.execute(sa.text("DELETE FROM tipo_entidad"))
    conn.execute(sa.text("DELETE FROM tipo_movimiento"))
    conn.execute(sa.text("DELETE FROM estado_contrato"))
    conn.execute(sa.text("DELETE FROM tipo_convenio"))
    conn.execute(sa.text("DELETE FROM tipo_contrato"))
    conn.execute(sa.text("DELETE FROM moneda"))
    conn.execute(sa.text("DELETE FROM tipo_dependencia"))

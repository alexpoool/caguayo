from logging.config import fileConfig
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database.connection import DATABASE_URL
from src.models import SQLModel

config = context.config
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def _is_fresh_db(connection) -> bool:
    """Check if this is a fresh database with no alembic_version table or no rows.

    Uses information_schema to safely detect the table without failing
    if it doesn't exist (which would poison the transaction).
    """
    result = connection.execute(text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables "
        "WHERE table_name = 'alembic_version')"
    ))
    table_exists = result.scalar()
    if not table_exists:
        return True
    result = connection.execute(text("SELECT COUNT(*) FROM alembic_version"))
    count = result.scalar()
    return count == 0


def _stamp_to_head(connection):
    """Create alembic_version table and stamp to the current head revision."""
    # Create alembic_version table if it doesn't exist
    connection.execute(text(
        "CREATE TABLE IF NOT EXISTS alembic_version ("
        "version_num VARCHAR(32) NOT NULL)"
    ))
    # Delete any stale rows
    connection.execute(text("DELETE FROM alembic_version"))
    from alembic.script import ScriptDirectory
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    if heads:
        for head in heads:
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
                {"rev": head},
            )


def _insert_if_not_exists(conn, table, columns, values, unique_col=None):
    """Insert only if no record with the same value in unique_col exists."""
    import sqlalchemy as sa
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


def _seed_generic_data(connection):
    """Insert seed catalog data from seed_generic_data migration."""
    import sqlalchemy as sa

    print("  🌱 Seeding catalog data...")

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
        ("compra", 1), ("venta", -1), ("RECEPCION", 1), ("MERMA", -1),
        ("DONACION", -1), ("DEVOLUCION", -1), ("AJUSTE_QUITAR", -1), ("AJUSTE_AGREGAR", 1),
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
    CATEGORIAS = [("General", "Categoría general de productos")]
    SUBCATEGORIAS = [(1, "General", "Subcategoría general de productos")]
    PROVINCIAS = [
        "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
        "Cienfuegos", "Villa Clara", "Sancti Spiritus", "Ciego de Ávila",
        "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
        "Guantánamo", "Isla de la Juventud",
    ]
    MUNICIPIOS = {
        1: ["Sandino", "Mantua", "Minas de Matahambre", "Viñales", "La Palma",
            "Los Palacios", "Consolación del Sur", "Pinar del Río", "San Luis",
            "San Juan y Martínez", "Guane"],
        2: ["Bahía Honda", "Mariel", "Guanajay", "Caimito", "Bauta",
            "San Antonio de los Baños", "Güira de Melena", "Artemisa",
            "Candelaria", "San Cristóbal", "Alquízar", "Güines",
            "Batabanó", "Melena del Sur", "Quivicán"],
        3: ["Playa", "Plaza de la Revolución", "Centro Habana",
            "La Habana Vieja", "Regla", "La Habana del Este",
            "Guanabacoa", "San Miguel del Padrón", "Diez de Octubre",
            "Cerro", "Marianao", "La Lisa", "Boyeros", "Arroyo Naranjo", "Cotorro"],
        4: ["Bejucal", "San José de las Lajas", "Jaruco",
            "Santa Cruz del Norte", "Madruga", "Nueva Paz",
            "San Nicolás", "Güines", "Melena del Sur", "Batabanó"],
        5: ["Matanzas", "Cárdenas", "Martí", "Colón", "Perico",
            "Jovellanos", "Pedro Betancourt", "Limonar",
            "Unión de Reyes", "Ciénaga de Zapata", "Jagüey Grande",
            "Calimete", "Los Arabos"],
        6: ["Aguada de Pasajeros", "Rodas", "Palmira", "Lajas",
            "Cruces", "Cumanayagua", "Cienfuegos", "Abreus"],
        7: ["Corralillo", "Quemado de Güines", "Sagua la Grande",
            "Encrucijada", "Camajuaní", "Caibarién", "Remedios",
            "Placetas", "Santa Clara", "Cifuentes", "Santo Domingo",
            "Ranchuelo", "Manicaragua"],
        8: ["Yaguajay", "Jatibonico", "Taguasco", "Cabaiguán",
            "Fomento", "Trinidad", "Sancti Spíritus", "La Sierpe"],
        9: ["Chambas", "Morón", "Bolivia", "Primero de Enero",
            "Ciro Redondo", "Florencia", "Majagua", "Ciego de Ávila",
            "Venezuela", "Baraguá"],
        10: ["Carlos Manuel de Céspedes", "Esmeralda", "Sierra de Cubitas",
             "Minas", "Nuevitas", "Guáimaro", "Sibanicú", "Najasa",
             "Santa Cruz del Sur", "Camagüey", "Florida", "Vertientes", "Jimaguayú"],
        11: ["Manatí", "Puerto Padre", "Jesús Menéndez", "Majibacoa",
             "Las Tunas", "Jobabo", "Colombia", "Amancio"],
        12: ["Gibara", "Rafael Freyre", "Banes", "Antilla", "Báguanos",
             "Holguín", "Calixto García", "Cacocum", "Urbano Noris",
             "Cueto", "Mayarí", "Frank País", "Sagua de Tánamo", "Moa"],
        13: ["Río Cauto", "Cauto Cristo", "Jiguaní", "Bayamo", "Yara",
             "Manzanillo", "Media Luna", "Campechuela", "Niquero",
             "Pilón", "Bartolomé Masó", "Buey Arriba", "Guisa"],
        14: ["Contramaestre", "Mella", "San Luis", "Segundo Frente",
             "Songo-La Maya", "Santiago de Cuba", "Palma Soriano",
             "Tercer Frente", "Guama"],
        15: ["Yateras", "Baracoa", "Maisí", "Imías",
             "San Antonio del Sur", "Caimanera", "Guantánamo",
             "Niceto Pérez", "Manuel Tames", "El Salvador"],
        16: ["Isla de la Juventud"],
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

    _insert_if_not_exists(connection, "moneda", ["nombre", "denominacion", "simbolo"], MONEDAS, "nombre")
    _insert_if_not_exists(connection, "tipo_contrato", ["nombre", "descripcion"], TIPOS_CONTRATO, "nombre")
    _insert_if_not_exists(connection, "tipo_convenio", ["nombre", "descripcion"], TIPOS_CONVENIO, "nombre")
    _insert_if_not_exists(connection, "estado_contrato", ["nombre", "descripcion"], ESTADOS_CONTRATO, "nombre")
    _insert_if_not_exists(connection, "tipo_movimiento", ["tipo", "factor"], TIPOS_MOVIMIENTO, "tipo")
    _insert_if_not_exists(connection, "tipo_entidad", ["nombre", "descripcion"], TIPOS_ENTIDAD, "nombre")
    _insert_if_not_exists(connection, "tipo_proveedor", ["nombre", "descripcion"], TIPOS_PROVEEDOR, "nombre")
    _insert_if_not_exists(connection, "categorias", ["nombre", "descripcion"], CATEGORIAS, "nombre")

    for id_cat, nombre, desc in SUBCATEGORIAS:
        check = connection.execute(
            sa.text("SELECT 1 FROM subcategorias WHERE id_categoria = :id_cat AND nombre = :nombre"),
            {"id_cat": id_cat, "nombre": nombre},
        )
        if check.fetchone() is None:
            connection.execute(
                sa.text("INSERT INTO subcategorias (id_categoria, nombre, descripcion) VALUES (:id_cat, :nombre, :desc)"),
                {"id_cat": id_cat, "nombre": nombre, "desc": desc},
            )

    for nombre in PROVINCIAS:
        check = connection.execute(
            sa.text("SELECT 1 FROM provincia WHERE nombre = :nombre"), {"nombre": nombre}
        )
        if check.fetchone() is None:
            connection.execute(
                sa.text("INSERT INTO provincia (nombre) VALUES (:nombre)"), {"nombre": nombre}
            )

    for id_prov, municipios in MUNICIPIOS.items():
        for nombre in municipios:
            check = connection.execute(
                sa.text("SELECT 1 FROM municipio WHERE id_provincia = :id_prov AND nombre = :nombre"),
                {"id_prov": id_prov, "nombre": nombre},
            )
            if check.fetchone() is None:
                connection.execute(
                    sa.text("INSERT INTO municipio (id_provincia, nombre) VALUES (:id_prov, :nombre)"),
                    {"id_prov": id_prov, "nombre": nombre},
                )

    # Grupo ADMINISTRADOR
    check = connection.execute(
        sa.text("SELECT 1 FROM grupo WHERE nombre = :nombre"), {"nombre": "ADMINISTRADOR"}
    )
    if check.fetchone() is None:
        connection.execute(
            sa.text("INSERT INTO grupo (nombre, descripcion) VALUES (:nombre, :desc)"),
            {"nombre": "ADMINISTRADOR", "desc": "Grupo con acceso total al sistema"},
        )

    # Grupo LECTOR
    check = connection.execute(
        sa.text("SELECT 1 FROM grupo WHERE nombre = :nombre"), {"nombre": "LECTOR"}
    )
    if check.fetchone() is None:
        connection.execute(
            sa.text("INSERT INTO grupo (nombre, descripcion) VALUES (:nombre, :desc)"),
            {"nombre": "LECTOR", "desc": "Grupo de solo lectura para consultas"},
        )

    # Funcionalidades
    for nombre in FUNCIONALIDADES:
        check = connection.execute(
            sa.text("SELECT 1 FROM funcionalidad WHERE nombre = :nombre"), {"nombre": nombre}
        )
        if check.fetchone() is None:
            connection.execute(
                sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"), {"nombre": nombre}
            )

    # Asignar funcionalidades al grupo ADMINISTRADOR
    result = connection.execute(
        sa.text("SELECT id_grupo FROM grupo WHERE nombre = :nombre"), {"nombre": "ADMINISTRADOR"}
    )
    grupo_row = result.fetchone()
    if grupo_row:
        id_grupo = grupo_row[0]
        funcionalidades = connection.execute(sa.text("SELECT id_funcionalidad FROM funcionalidad")).fetchall()
        for (id_func,) in funcionalidades:
            check = connection.execute(
                sa.text("SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = :id_grupo AND id_funcionalidad = :id_func"),
                {"id_grupo": id_grupo, "id_func": id_func},
            )
            if check.fetchone() is None:
                connection.execute(
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
    result = connection.execute(
        sa.text("SELECT id_grupo FROM grupo WHERE nombre = :nombre"), {"nombre": "LECTOR"}
    )
    lector_row = result.fetchone()
    if lector_row:
        id_grupo = lector_row[0]
        for func_name in LECTOR_FUNCIONALIDADES:
            result_func = connection.execute(
                sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
                {"nombre": func_name},
            )
            func_row = result_func.fetchone()
            if func_row:
                id_func = func_row[0]
                check = connection.execute(
                    sa.text("SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = :id_grupo AND id_funcionalidad = :id_func"),
                    {"id_grupo": id_grupo, "id_func": id_func},
                )
                if check.fetchone() is None:
                    connection.execute(
                        sa.text("INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) VALUES (:id_grupo, :id_func)"),
                        {"id_grupo": id_grupo, "id_func": id_func},
                    )

    _insert_if_not_exists(connection, "tipo_dependencia", ["nombre", "descripcion"], TIPOS_DEPENDENCIA, "nombre")

    print("  ✅ Catalog data seeded successfully")


def create_all_and_seed(connection):
    """For fresh databases: create all tables from models, seed data, and stamp to head."""
    print("  🆕 Fresh database detected — creating tables from models...")
    target_metadata.create_all(connection)
    print("  ✅ Tables created successfully")

    # Seed catalog data (monedas, provincias, grupos, funcionalidades, etc.)
    _seed_generic_data(connection)

    # Stamp alembic to head so future migrations know we're up to date
    _stamp_to_head(connection)
    print("  ✅ Alembic stamped to head")

    # Explicitly commit — async connections auto-begin a transaction,
    # and without begin_transaction() it won't auto-commit.
    connection.commit()


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    if _is_fresh_db(connection):
        # Fresh DB — skip migration chain (which has conflicts between
        # bootstrap and incremental migrations) and create everything
        # directly from the SQLAlchemy models.
        create_all_and_seed(connection)
    else:
        # Existing DB — run migrations normally
        with context.begin_transaction():
            context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    import asyncio

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

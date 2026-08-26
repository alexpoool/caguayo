import os
import sys
import re
import logging
from typing import List
import psycopg2
import contextlib
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ALEMBIC_CFG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "alembic.ini",
)


def validar_nombre_bd(nombre: str) -> str:
    """Valida que el nombre de la base de datos sea seguro (sin SQL injection)."""
    if not nombre:
        raise ValueError("El nombre de la base de datos no puede estar vacío")
    if len(nombre) > 63:
        raise ValueError("El nombre de la base de datos no puede tener más de 63 caracteres")
    if not re.match(r'^[a-zA-Z0-9_]+$', nombre):
        raise ValueError(f"Nombre de base de datos inválido: '{nombre}'. Solo se permiten letras, números y guiones bajos")
    return nombre


@contextlib.contextmanager
def get_db_connection(database: str):
    """Context manager para conexiones psycopg2 que garantiza el cierre."""
    conn = psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        database=database,
        client_encoding="utf8",
    )
    try:
        yield conn
    finally:
        conn.close()


class DatabaseService:
    @staticmethod
    def get_admin_connection():
        return psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD"),
            database=os.getenv("ADMIN_DB_NAME", "postgres"),
            client_encoding="utf8",
        )

    @staticmethod
    def _remove_comments(sql: str) -> str:
        lines = []
        for line in sql.split("\n"):
            if not line.strip().startswith("--"):
                lines.append(line)
        return "\n".join(lines)

    @staticmethod
    def _split_sql_statements(sql: str) -> List[str]:
        sql = DatabaseService._remove_comments(sql)
        sql = sql.strip()
        statements = []
        current = []
        in_string = False
        escape_next = False

        for char in sql:
            if escape_next:
                current.append(char)
                escape_next = False
                continue
            if char == "\\":
                escape_next = True
                current.append(char)
                continue
            if char == "'" and not in_string:
                in_string = True
            elif char == "'" and in_string:
                in_string = False
            elif char == ";" and not in_string:
                stmt = "".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
                continue
            current.append(char)

        last_stmt = "".join(current).strip()
        if last_stmt:
            statements.append(last_stmt)

        return statements

    @staticmethod
    def crear_base_datos(base_datos: str, init_office: bool = True) -> List[str]:
        """Crea una base de datos y aplica migraciones Alembic.

        Args:
            base_datos: Nombre de la base de datos a crear.
            init_office: Si True, ejecuta init_office.py después de las migraciones.
        """
        validar_nombre_bd(base_datos)

        # 1. Crear la base de datos
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            try:
                cur.execute(
                    f"CREATE DATABASE {base_datos} WITH ENCODING 'UTF8' TEMPLATE template0"
                )
                logger.info("Database %s created successfully", base_datos)
            except psycopg2.errors.DuplicateDatabase:
                logger.info("Database %s already exists", base_datos)
                cur.close()
                return DatabaseService.obtener_tablas(base_datos)
            except Exception as e:
                logger.error("Error creating database %s: %s", base_datos, e)
                raise
            finally:
                cur.close()

        # 2. Configurar extensiones y servidor FDW
        with get_db_connection(base_datos) as conn:
            conn.autocommit = True
            cur = conn.cursor()

            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS postgres_fdw;")
                logger.info("Extension postgres_fdw created in %s", base_datos)
            except Exception as e:
                logger.warning("Error creating postgres_fdw extension: %s", e)

            admin_user = os.getenv("ADMIN_DB_USER", "postgres")
            admin_password = os.getenv("ADMIN_DB_PASSWORD")
            try:
                cur.execute("DROP SERVER IF EXISTS servidor_central CASCADE;")
                central_db_fdw = os.getenv("CENTRAL_DATABASE", "caguayosa")
                cur.execute("""
                    CREATE SERVER servidor_central
                    FOREIGN DATA WRAPPER postgres_fdw
                    OPTIONS (
                        host %s,
                        dbname %s,
                        port %s
                    );
                """, (admin_host, central_db_fdw, str(admin_port)))
                cur.execute(
                    "CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER "
                    "SERVER servidor_central "
                    "OPTIONS (user %s, password %s)",
                    (admin_user, admin_password),
                )
                logger.info("Server and user mapping created in %s", base_datos)
            except Exception as e:
                logger.error("Error creating server in %s: %s", base_datos, e)

            cur.close()

        # 3. Create schema via pg_dump from central database, then stamp alembic
        central_db = os.getenv("CENTRAL_DATABASE", "caguayosa")
        admin_user = os.getenv("ADMIN_DB_USER", "postgres")
        admin_password = os.getenv("ADMIN_DB_PASSWORD", "")
        admin_host = os.getenv("ADMIN_DB_HOST", "localhost")
        admin_port = os.getenv("ADMIN_DB_PORT", "5432")

        try:
            central_url = f"postgresql://{admin_user}:{admin_password}@{admin_host}:{admin_port}/{central_db}"
            target_url = f"postgresql://{admin_user}:{admin_password}@{admin_host}:{admin_port}/{base_datos}"

            import subprocess
            # Pipe pg_dump directly into psql for reliable execution
            dump_cmd = [
                "pg_dump", central_url,
                "--schema-only", "--no-owner", "--no-privileges",
                "--no-publications", "--no-subscriptions",
                "--no-security-labels", "--no-tablespaces",
                "--no-comments",
            ]
            psql_cmd = ["psql", target_url, "-v", "ON_ERROR_STOP=0"]

            dump_proc = subprocess.Popen(dump_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            psql_proc = subprocess.Popen(psql_cmd, stdin=dump_proc.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            dump_proc.stdout.close()
            stdout, stderr = psql_proc.communicate(timeout=120)

            if psql_proc.returncode != 0 and 'already exists' not in stderr:
                logger.warning("psql warnings for %s: %s", base_datos, stderr[:500])
            logger.info("Schema created from central database via pg_dump for %s", base_datos)

            # Stamp alembic at head via subprocess (avoids asyncio.run conflict in async context)
            db_url_async = f"postgresql+asyncpg://{admin_user}:{admin_password}@{admin_host}:{admin_port}/{base_datos}"
            alembic_ini = os.path.abspath(ALEMBIC_CFG_PATH)
            env = os.environ.copy()
            env["DATABASE_URL"] = db_url_async
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "-c", alembic_ini, "stamp", "head"],
                capture_output=True, text=True, timeout=120, env=env,
            )
            if result.returncode != 0:
                logger.warning("Alembic stamp warnings for %s: %s", base_datos, result.stderr[:300])
            logger.info("Alembic stamped at head for %s", base_datos)

            # Replicate catalog data from central database
            DatabaseService.replicar_datos_desde_central(base_datos)
            logger.info("Catalog data replicated from central to %s", base_datos)
        except Exception as e:
            logger.error("Schema creation failed for %s: %s", base_datos, e)
            raise

        # 4. Inicializar datos de oficina principal (opcional)
        if init_office:
            try:
                from scripts.init_office import init_office as do_init_office
                inserted, errors = do_init_office(base_datos)
                if inserted:
                    logger.info("Office data inserted in %s: %s", base_datos, inserted)
                if errors:
                    logger.warning("Office init errors in %s: %s", base_datos, errors)
            except Exception as e:
                logger.warning("Office init skipped for %s: %s", base_datos, e)

        tablas = DatabaseService.obtener_tablas(base_datos)
        logger.info("Found %d tables in %s", len(tablas), base_datos)
        return tablas

    @staticmethod
    def obtener_tablas(base_datos: str) -> List[str]:
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        with get_db_connection(base_datos) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
            )
            tablas = [row[0] for row in cur.fetchall()]
            cur.close()
        logger.info("Tables in %s: %s", base_datos, tablas)
        return tablas

    @staticmethod
    def verificar_y_crear_tablas_faltantes(base_datos: str) -> List[str]:
        """Verifica y crea tablas faltantes en la base de datos del tenant."""
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        tablas_necesarias = {
            "log": """
                CREATE TABLE IF NOT EXISTS log (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
                    nivel VARCHAR(20) NOT NULL,
                    tipo VARCHAR(20) NOT NULL,
                    mensaje VARCHAR(500) NOT NULL,
                    detalle VARCHAR(2000),
                    ip VARCHAR(50),
                    usuario_id INTEGER,
                    endpoint VARCHAR(200),
                    method VARCHAR(10),
                    status_code INTEGER,
                    usuario_nombre VARCHAR(100),
                    navegador VARCHAR(100)
                )
            """,
        }

        tablas_creadas = []

        with get_db_connection(base_datos) as conn:
            conn.autocommit = True
            cur = conn.cursor()

            for nombre_tabla, ddl in tablas_necesarias.items():
                try:
                    cur.execute(f"SELECT 1 FROM {nombre_tabla} LIMIT 1")
                    logger.info("Tabla %s ya existe en %s", nombre_tabla, base_datos)
                except psycopg2.errors.UndefinedTable:
                    try:
                        cur.execute(ddl)
                        tablas_creadas.append(nombre_tabla)
                        logger.info("Tabla %s creada en %s", nombre_tabla, base_datos)
                    except Exception as e:
                        logger.warning("Error creando tabla %s: %s", nombre_tabla, e)
                except Exception as e:
                    logger.warning("Error verificando tabla %s: %s", nombre_tabla, e)

            cur.close()

        if tablas_creadas:
            logger.info("Tablas creadas en %s: %s", base_datos, tablas_creadas)
        else:
            logger.info("No se crearon tablas nuevas en %s", base_datos)

        return tablas_creadas

    @staticmethod
    def replicar_datos_desde_central(base_datos: str) -> None:
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        logger.info("Replicating data from central to %s", base_datos)

        # L4 FIX: No usar autocommit en la BD local para poder hacer rollback
        with get_db_connection(os.getenv("CENTRAL_DATABASE", "caguayosa")) as central_conn:
            central_conn.autocommit = True
            central_cur = central_conn.cursor()

            with get_db_connection(base_datos) as local_conn:
                # L4 FIX: Desactivar autocommit para control transaccional
                local_conn.autocommit = False
                local_cur = local_conn.cursor()

                try:
                    # 1. Fetch ALL data from central first
                    central_cur.execute(
                        "SELECT id_moneda, nombre, denominacion, simbolo FROM moneda ORDER BY id_moneda"
                    )
                    monedas = central_cur.fetchall()

                    central_cur.execute(
                        "SELECT id_tipo_dependencia, nombre, descripcion FROM tipo_dependencia ORDER BY id_tipo_dependencia"
                    )
                    tipos = central_cur.fetchall()

                    central_cur.execute(
                        "SELECT id_provincia, nombre FROM provincia ORDER BY id_provincia"
                    )
                    provincias = central_cur.fetchall()

                    central_cur.execute(
                        "SELECT id_municipio, id_provincia, nombre FROM municipio ORDER BY id_municipio"
                    )
                    municipios = central_cur.fetchall()

                    # NOTE: dependencia and cuenta_dependencias are NOT replicated
                    # from central — each tenant gets its own via init_office.
                    deps = []
                    cuentas = []

                    # Additional catalog tables
                    central_cur.execute("SELECT id_tipo_contrato, nombre, descripcion FROM tipo_contrato ORDER BY id_tipo_contrato")
                    tipos_contrato = central_cur.fetchall()
                    central_cur.execute("SELECT id_tipo_convenio, nombre, descripcion FROM tipo_convenio ORDER BY id_tipo_convenio")
                    tipos_convenio = central_cur.fetchall()
                    central_cur.execute("SELECT id_estado_contrato, nombre, descripcion FROM estado_contrato ORDER BY id_estado_contrato")
                    estados_contrato = central_cur.fetchall()
                    central_cur.execute("SELECT id_tipo_movimiento, tipo, factor FROM tipo_movimiento ORDER BY id_tipo_movimiento")
                    tipos_movimiento = central_cur.fetchall()
                    central_cur.execute("SELECT id_tipo_entidad, nombre, descripcion FROM tipo_entidad ORDER BY id_tipo_entidad")
                    tipos_entidad = central_cur.fetchall()
                    central_cur.execute("SELECT id_tipo_proveedor, nombre, descripcion FROM tipo_proveedor ORDER BY id_tipo_proveedor")
                    tipos_proveedor = central_cur.fetchall()
                    central_cur.execute("SELECT id_categoria, nombre, descripcion FROM categorias ORDER BY id_categoria")
                    categorias = central_cur.fetchall()
                    central_cur.execute("SELECT id_subcategoria, id_categoria, nombre, descripcion FROM subcategorias ORDER BY id_subcategoria")
                    subcategorias = central_cur.fetchall()
                    central_cur.execute("SELECT id_grupo, nombre, descripcion FROM grupo ORDER BY id_grupo")
                    grupos = central_cur.fetchall()
                    central_cur.execute("SELECT id_funcionalidad, nombre FROM funcionalidad ORDER BY id_funcionalidad")
                    funcionalidades = central_cur.fetchall()
                    central_cur.execute("SELECT id_grupo, id_funcionalidad FROM grupo_funcionalidad ORDER BY id_grupo, id_funcionalidad")
                    grupo_funcionalidades = central_cur.fetchall()

                    # 2. DELETE in FK-safe order (children before parents)
                    # NOTE: dependencia and cuenta_dependencias are NOT touched here
                    # — they are tenant-specific and managed by init_office.
                    local_cur.execute("DELETE FROM grupo_funcionalidad")
                    local_cur.execute("DELETE FROM subcategorias")
                    local_cur.execute("DELETE FROM categorias")
                    local_cur.execute("DELETE FROM funcionalidad")
                    local_cur.execute("DELETE FROM grupo")
                    local_cur.execute("DELETE FROM tipo_movimiento")
                    local_cur.execute("DELETE FROM tipo_proveedor")
                    local_cur.execute("DELETE FROM tipo_entidad")
                    local_cur.execute("DELETE FROM estado_contrato")
                    local_cur.execute("DELETE FROM tipo_convenio")
                    local_cur.execute("DELETE FROM tipo_contrato")
                    local_cur.execute("DELETE FROM moneda")
                    local_cur.execute("DELETE FROM tipo_dependencia")

                    # 3. INSERT in FK-safe order (parents before children)
                    for m in monedas:
                        local_cur.execute(
                            "INSERT INTO moneda (id_moneda, nombre, denominacion, simbolo) VALUES (%s, %s, %s, %s)",
                            m,
                        )
                    logger.info("Replicated %d monedas to %s", len(monedas), base_datos)

                    for t in tipos:
                        local_cur.execute(
                            "INSERT INTO tipo_dependencia (id_tipo_dependencia, nombre, descripcion) VALUES (%s, %s, %s)",
                            t,
                        )
                    logger.info("Replicated %d tipo_dependencia to %s", len(tipos), base_datos)

                    for p in provincias:
                        local_cur.execute(
                            "INSERT INTO provincia (id_provincia, nombre) VALUES (%s, %s)", p
                        )
                    logger.info("Replicated %d provincias to %s", len(provincias), base_datos)

                    for m in municipios:
                        local_cur.execute(
                            "INSERT INTO municipio (id_municipio, id_provincia, nombre) VALUES (%s, %s, %s)",
                            m,
                        )
                    logger.info("Replicated %d municipios to %s", len(municipios), base_datos)

                    for t in tipos_contrato:
                        local_cur.execute("INSERT INTO tipo_contrato (id_tipo_contrato, nombre, descripcion) VALUES (%s, %s, %s)", t)
                    logger.info("Replicated %d tipo_contrato to %s", len(tipos_contrato), base_datos)

                    for t in tipos_convenio:
                        local_cur.execute("INSERT INTO tipo_convenio (id_tipo_convenio, nombre, descripcion) VALUES (%s, %s, %s)", t)
                    logger.info("Replicated %d tipo_convenio to %s", len(tipos_convenio), base_datos)

                    for e in estados_contrato:
                        local_cur.execute("INSERT INTO estado_contrato (id_estado_contrato, nombre, descripcion) VALUES (%s, %s, %s)", e)
                    logger.info("Replicated %d estado_contrato to %s", len(estados_contrato), base_datos)

                    for t in tipos_movimiento:
                        local_cur.execute("INSERT INTO tipo_movimiento (id_tipo_movimiento, tipo, factor) VALUES (%s, %s, %s)", t)
                    logger.info("Replicated %d tipo_movimiento to %s", len(tipos_movimiento), base_datos)

                    for t in tipos_entidad:
                        local_cur.execute("INSERT INTO tipo_entidad (id_tipo_entidad, nombre, descripcion) VALUES (%s, %s, %s)", t)
                    logger.info("Replicated %d tipo_entidad to %s", len(tipos_entidad), base_datos)

                    for t in tipos_proveedor:
                        local_cur.execute("INSERT INTO tipo_proveedor (id_tipo_proveedor, nombre, descripcion) VALUES (%s, %s, %s)", t)
                    logger.info("Replicated %d tipo_proveedor to %s", len(tipos_proveedor), base_datos)

                    for c in categorias:
                        local_cur.execute("INSERT INTO categorias (id_categoria, nombre, descripcion) VALUES (%s, %s, %s)", c)
                    logger.info("Replicated %d categorias to %s", len(categorias), base_datos)

                    for s in subcategorias:
                        local_cur.execute("INSERT INTO subcategorias (id_subcategoria, id_categoria, nombre, descripcion) VALUES (%s, %s, %s, %s)", s)
                    logger.info("Replicated %d subcategorias to %s", len(subcategorias), base_datos)

                    for g in grupos:
                        local_cur.execute("INSERT INTO grupo (id_grupo, nombre, descripcion) VALUES (%s, %s, %s)", g)
                    logger.info("Replicated %d grupos to %s", len(grupos), base_datos)

                    for f in funcionalidades:
                        local_cur.execute("INSERT INTO funcionalidad (id_funcionalidad, nombre) VALUES (%s, %s)", f)
                    logger.info("Replicated %d funcionalidades to %s", len(funcionalidades), base_datos)

                    for gf in grupo_funcionalidades:
                        local_cur.execute("INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) VALUES (%s, %s)", gf)
                    logger.info("Replicated %d grupo_funcionalidades to %s", len(grupo_funcionalidades), base_datos)

                    # L4 FIX: Commit explícito de toda la transacción
                    local_conn.commit()
                    logger.info("Data replication completed for %s", base_datos)

                except Exception as e:
                    # L4 FIX: Rollback en caso de error
                    local_conn.rollback()
                    logger.error("Error replicating data to %s: %s", base_datos, e)
                    raise
                finally:
                    local_cur.close()
                    central_cur.close()

    @staticmethod
    def insertar_dependencia_en_tenant(base_datos: str, dependencia_data: dict) -> None:
        """Inserta la dependencia en la BD del tenant."""
        validar_nombre_bd(base_datos)
        logger.info("Inserting dependencia in %s: %s", base_datos, dependencia_data.get('nombre'))

        with get_db_connection(base_datos) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            try:
                # In a new tenant DB, dependencia always gets id=1 and no parent
                dep_id = 1
                codigo_padre = None  # root dependencia in tenant DB

                cur.execute("""
                    INSERT INTO dependencia (
                        id_dependencia, id_tipo_dependencia, codigo_padre, nombre, denominacion,
                        direccion, telefono, email, web, id_provincia, id_municipio,
                        descripcion, base_datos, host, puerto, nit, reeup
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id_dependencia) DO UPDATE SET
                        nombre = EXCLUDED.nombre, denominacion = EXCLUDED.denominacion
                """, (
                    dep_id,
                    dependencia_data.get('id_tipo_dependencia'),
                    codigo_padre,
                    dependencia_data['nombre'],
                    dependencia_data.get('denominacion', ''),
                    dependencia_data.get('direccion', ''),
                    dependencia_data.get('telefono', ''),
                    dependencia_data.get('email'),
                    dependencia_data.get('web'),
                    dependencia_data.get('id_provincia'),
                    dependencia_data.get('id_municipio'),
                    dependencia_data.get('descripcion'),
                    dependencia_data.get('base_datos'),
                    dependencia_data.get('host', 'localhost'),
                    dependencia_data.get('puerto', 5432),
                    dependencia_data.get('nit'),
                    dependencia_data.get('reeup'),
                ))
                logger.info("Dependencia inserted in %s", base_datos)
            except Exception as e:
                logger.error("Error inserting dependencia in %s: %s", base_datos, e)
                raise
            finally:
                cur.close()

    @staticmethod
    def insertar_admin_en_db(base_datos: str, id_dependencia: int) -> None:
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        # V4 FIX: Usar variable de entorno para la contraseña del admin
        admin_password_hash = os.getenv("ADMIN_DEFAULT_PASSWORD_HASH",
            "$2b$12$UXqjLZwpFj20eC7HOaD0c.OKVFhFNUl4bleMtIr9.c8Bi2pRu9GLC")

        logger.info("Inserting admin user in %s with id_dependencia=%d", base_datos, id_dependencia)

        with get_db_connection(base_datos) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            try:
                cur.execute("""
                    INSERT INTO usuarios (ci, nombre, primer_apellido, segundo_apellido, alias, contrasenia, id_grupo, id_dependencia, cargo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (alias) DO UPDATE SET id_dependencia = EXCLUDED.id_dependencia
                """, (
                    "00000000000",
                    "Administrador",
                    "Principal",
                    "Sistema",
                    "admin",
                    admin_password_hash,
                    1,
                    id_dependencia,
                    "Superadministrador",
                ))
                logger.info("Admin user inserted in %s", base_datos)
            except Exception as e:
                logger.error("Error inserting admin user in %s: %s", base_datos, e)
                raise
            finally:
                cur.close()

    @staticmethod
    def eliminar_base_datos(base_datos: str) -> bool:
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            try:
                cur.execute(f"DROP DATABASE IF EXISTS {base_datos}")
                logger.info("Database %s dropped successfully", base_datos)
                return True
            except Exception as e:
                logger.error("Error dropping database %s: %s", base_datos, e)
                return False
            finally:
                cur.close()

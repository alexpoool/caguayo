import os
import re
import logging
from typing import List
import psycopg2
import contextlib
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


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
    def crear_base_datos(base_datos: str, sql_file: str = "init.sql") -> List[str]:
        # V1 FIX: Validar nombre de BD antes de usarlo en SQL
        validar_nombre_bd(base_datos)

        sql_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "sql",
            sql_file,
        )

        with open(sql_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        # C1 FIX: Usar context manager para garantizar cierre de conexiones
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

        # Conectar a la nueva BD para configurarla
        with get_db_connection(base_datos) as conn:
            conn.autocommit = True
            cur = conn.cursor()

            # Crear extensión postgres_fdw necesaria para dblink
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS postgres_fdw;")
                logger.info("Extension postgres_fdw created in %s", base_datos)
            except Exception as e:
                logger.warning("Error creating postgres_fdw extension: %s", e)

            # Crear servidor y user mapping hacia la BD central
            admin_user = os.getenv("ADMIN_DB_USER", "postgres")
            admin_password = os.getenv("ADMIN_DB_PASSWORD")
            try:
                cur.execute("DROP SERVER IF EXISTS servidor_central CASCADE;")
                cur.execute("""
                    CREATE SERVER servidor_central
                    FOREIGN DATA WRAPPER postgres_fdw
                    OPTIONS (
                        host 'localhost',
                        dbname 'caguayosa',
                        port '5432'
                    );
                """)
                # V1 FIX: Usar parámetros seguros en lugar de f-string
                cur.execute(
                    "CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER "
                    "SERVER servidor_central "
                    "OPTIONS (user %s, password %s)",
                    (admin_user, admin_password),
                )
                logger.info("Server and user mapping created in %s", base_datos)
            except Exception as e:
                logger.error("Error creating server in %s: %s", base_datos, e)

            statements = DatabaseService._split_sql_statements(schema_sql)
            logger.info("Found %d SQL statements to execute in %s", len(statements), base_datos)

            success_count = 0
            error_count = 0
            for i, statement in enumerate(statements):
                if statement.strip():
                    try:
                        cur.execute(statement)
                        success_count += 1
                    except Exception as e:
                        error_count += 1
                        if error_count <= 5:
                            logger.warning("Statement %d error: %s", i + 1, str(e)[:200])
                        elif error_count == 6:
                            logger.warning("... suppressing further errors")

            logger.info("Executed in %s: %d success, %d errors", base_datos, success_count, error_count)

            # Verificar que se crearon las tablas locales
            try:
                cur.execute("""
                    SELECT c.relname, c.relkind
                    FROM pg_class c
                    JOIN pg_namespace n ON c.relnamespace = n.oid
                    WHERE n.nspname = 'public'
                    AND c.relkind = 'r'
                    AND c.relname IN ('tipo_dependencia', 'dependencia', 'cuenta_dependencias', 'moneda', 'usuarios')
                """)
                resultados = cur.fetchall()
                logger.info("Final verification in %s - Local tables created: %s", base_datos, resultados)
            except Exception as e:
                logger.error("Error verifying tables in %s: %s", base_datos, e)

            cur.close()

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
        with get_db_connection("caguayosa") as central_conn:
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

                    central_cur.execute("""
                        SELECT id_dependencia, id_tipo_dependencia, codigo_padre, nombre, denominacion, direccion, telefono, 
                               email, web, id_provincia, id_municipio, descripcion, base_datos
                        FROM dependencia 
                        ORDER BY id_dependencia
                    """)
                    deps = central_cur.fetchall()

                    central_cur.execute("""
                        SELECT id_cuenta, id_dependencia, id_moneda, titular, banco, sucursal, numero_cuenta, direccion
                        FROM cuenta_dependencias
                        ORDER BY id_cuenta, id_dependencia
                    """)
                    cuentas = central_cur.fetchall()

                    # 2. DELETE in FK-safe order (children before parents)
                    local_cur.execute("DELETE FROM dependencia")
                    local_cur.execute("DELETE FROM municipio")
                    local_cur.execute("DELETE FROM provincia")
                    local_cur.execute("DELETE FROM cuenta_dependencias")
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

                    for d in deps:
                        local_cur.execute("""
                            INSERT INTO dependencia (id_dependencia, id_tipo_dependencia, codigo_padre, nombre, denominacion,
                                                  direccion, telefono, email, web, id_provincia, id_municipio, descripcion, base_datos)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, d)
                    logger.info("Replicated %d dependencias to %s", len(deps), base_datos)

                    for c in cuentas:
                        local_cur.execute("""
                            INSERT INTO cuenta_dependencias (id_cuenta, id_dependencia, id_moneda, titular, banco, 
                                                          sucursal, numero_cuenta, direccion)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, c)
                    logger.info("Replicated %d cuenta_dependencias to %s", len(cuentas), base_datos)

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
    def insertar_admin_en_db(base_datos: str, id_dependencia: int) -> None:
        # V1 FIX: Validar nombre de BD
        validar_nombre_bd(base_datos)

        # V4 FIX: Usar variable de entorno para la contraseña del admin
        admin_password_hash = os.getenv("ADMIN_DEFAULT_PASSWORD_HASH",
            "$2b$12$21cZipaElHLRaXOxScHGjOPbMVXpvxn2aSwQus/P4/Vs0z0bouTb2")

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

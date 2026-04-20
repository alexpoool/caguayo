import os
from typing import List
import psycopg2
from dotenv import load_dotenv

load_dotenv()


class DatabaseService:
    @staticmethod
    def get_admin_connection():
        return psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
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
    def crear_base_datos(base_datos: str) -> List[str]:
        sql_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "sql",
            "init.sql",
        )

        with open(sql_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        conn = DatabaseService.get_admin_connection()
        conn.autocommit = True
        cur = conn.cursor()

        try:
            cur.execute(
                f"CREATE DATABASE {base_datos} WITH ENCODING 'UTF8' TEMPLATE template0"
            )
            print(
                f"[DB SERVICE] Database {base_datos} created successfully", flush=True
            )
        except psycopg2.errors.DuplicateDatabase:
            print(f"[DB SERVICE] Database {base_datos} already exists", flush=True)
            conn.close()
            return DatabaseService.obtener_tablas(base_datos)
        except Exception as e:
            print(f"[DB SERVICE] Error creating database: {e}", flush=True)
            raise
        finally:
            cur.close()

        conn.close()

        conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
            database=base_datos,
            client_encoding="utf8",
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Crear extensión postgres_fdw necesaria para dblink
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgres_fdw;")
            print("[DB SERVICE] Extension postgres_fdw created", flush=True)
        except Exception as e:
            print(
                f"[DB SERVICE] Error creating postgres_fdw extension: {e}", flush=True
            )

        # Crear servidor y user mapping hacia la BD central
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
            cur.execute("""
                CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
                SERVER servidor_central
                OPTIONS (user 'postgres', password 'debianpostgres');
            """)
            print("[DB SERVICE] Server and user mapping created", flush=True)
        except Exception as e:
            print(f"[DB SERVICE] Error creating server: {e}", flush=True)

        statements = DatabaseService._split_sql_statements(schema_sql)
        print(
            f"[DB SERVICE] Found {len(statements)} SQL statements to execute",
            flush=True,
        )

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
                        print(
                            f"[DB SERVICE] Statement {i + 1} error: {str(e)[:200]}",
                            flush=True,
                        )
                    elif error_count == 6:
                        print(
                            f"[DB SERVICE] ... suppressing further errors", flush=True
                        )

        print(
            f"[DB SERVICE] Executed: {success_count} success, {error_count} errors",
            flush=True,
        )

        # La replicación PULL ya está incluida en init.sql
        # No requiere ejecución adicional
        print(
            "[DB SERVICE] Replication PULL included in init.sql",
            flush=True,
        )

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
            print(
                "[DB SERVICE] Final verification - Local tables created:",
                resultados,
                flush=True,
            )
        except Exception as e:
            print(f"[DB SERVICE] Error verifying tables: {e}", flush=True)

        cur.close()
        conn.close()

        tablas = DatabaseService.obtener_tablas(base_datos)
        print(f"[DB SERVICE] Found {len(tablas)} tables in {base_datos}", flush=True)
        return tablas

    @staticmethod
    def obtener_tablas(base_datos: str) -> List[str]:
        conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
            database=base_datos,
            client_encoding="utf8",
        )
        cur = conn.cursor()
        cur.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        tablas = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
        print(f"[DB SERVICE] Tables in {base_datos}: {tablas}", flush=True)
        return tablas

    @staticmethod
    def replicar_datos_desde_central(base_datos: str) -> None:
        print(f"[DB SERVICE] Replicating data from central to {base_datos}", flush=True)
        
        central_conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
            database="caguayosa",
            client_encoding="utf8",
        )
        central_conn.autocommit = True
        central_cur = central_conn.cursor()
        
        local_conn = psycopg2.connect(
            host=os.getenv("ADMIN_DB_HOST", "localhost"),
            port=int(os.getenv("ADMIN_DB_PORT", 5432)),
            user=os.getenv("ADMIN_DB_USER", "postgres"),
            password=os.getenv("ADMIN_DB_PASSWORD", "postgres"),
            database=base_datos,
            client_encoding="utf8",
        )
        local_conn.autocommit = True
        local_cur = local_conn.cursor()
        
        try:
            central_cur.execute("SELECT id_moneda, nombre, denominacion, simbolo FROM moneda ORDER BY id_moneda")
            monedas = central_cur.fetchall()
            
            local_cur.execute("DELETE FROM moneda")
            for m in monedas:
                local_cur.execute(
                    "INSERT INTO moneda (id_moneda, nombre, denominacion, simbolo) VALUES (%s, %s, %s, %s)",
                    m
                )
            print(f"[DB SERVICE] Replicated {len(monedas)} monedas", flush=True)
            
            central_cur.execute("SELECT id_tipo_dependencia, nombre, descripcion FROM tipo_dependencia ORDER BY id_tipo_dependencia")
            tipos = central_cur.fetchall()
            
            local_cur.execute("DELETE FROM tipo_dependencia")
            for t in tipos:
                local_cur.execute(
                    "INSERT INTO tipo_dependencia (id_tipo_dependencia, nombre, descripcion) VALUES (%s, %s, %s)",
                    t
                )
            print(f"[DB SERVICE] Replicated {len(tipos)} tipo_dependencia", flush=True)
            
            central_cur.execute("""
                SELECT id_dependencia, id_tipo_dependencia, codigo_padre, nombre, direccion, telefono, 
                       email, web, id_provincia, id_municipio, descripcion
                FROM dependencia 
                WHERE id_dependencia = 1
            """)
            deps = central_cur.fetchall()
            
            local_cur.execute("DELETE FROM dependencia WHERE id_dependencia = 1")
            for d in deps:
                local_cur.execute("""
                    INSERT INTO dependencia (id_dependencia, id_tipo_dependencia, codigo_padre, nombre, 
                                          direccion, telefono, email, web, id_provincia, id_municipio, descripcion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, d)
            print(f"[DB SERVICE] Replicated {len(deps)} dependencias (root)", flush=True)
            
            central_cur.execute("""
                SELECT id_cuenta, id_dependencia, id_moneda, titular, banco, sucursal, numero_cuenta, direccion
                FROM cuenta_dependencias
                WHERE id_dependencia = 1
            """)
            cuentas = central_cur.fetchall()
            
            local_cur.execute("DELETE FROM cuenta_dependencias WHERE id_dependencia = 1")
            for c in cuentas:
                local_cur.execute("""
                    INSERT INTO cuenta_dependencias (id_cuenta, id_dependencia, id_moneda, titular, banco, 
                                                  sucursal, numero_cuenta, direccion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, c)
            print(f"[DB SERVICE] Replicated {len(cuentas)} cuenta_dependencias", flush=True)
            
            local_conn.commit()
            print(f"[DB SERVICE] Data replication completed for {base_datos}", flush=True)
            
        except Exception as e:
            print(f"[DB SERVICE] Error replicating data: {e}", flush=True)
            raise
        finally:
            central_cur.close()
            central_conn.close()
            local_cur.close()
            local_conn.close()

    @staticmethod
    def eliminar_base_datos(base_datos: str) -> bool:
        conn = DatabaseService.get_admin_connection()
        conn.autocommit = True
        cur = conn.cursor()
        try:
            cur.execute(f"DROP DATABASE IF EXISTS {base_datos}")
            return True
        except Exception as e:
            print(f"Error dropping database: {e}")
            return False
        finally:
            cur.close()
            conn.close()

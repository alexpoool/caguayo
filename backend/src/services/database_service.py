import os
from typing import List
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
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sql", "db.sql"
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

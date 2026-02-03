import os
import time
from sqlalchemy import create_engine, text

# Configuración
# Intentamos conectar primero con la contraseña 'solji' al usuario 'postgres'
# NOTA: Para crear la DB, debemos conectarnos a la base de datos por defecto 'postgres'
DB_USER = "postgres"
DB_PASS = "solji"
DB_HOST = "localhost"
DB_PORT = "5432"
NEW_DB_NAME = "caguayo_inventario"

# URL de conexión para mantenimiento (conectando a 'postgres')
MAINTENANCE_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/postgres"
# URL de la nueva base de datos
NEW_DB_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{NEW_DB_NAME}"

def create_database():
    try:
        # 1. Conectar a la base de datos 'postgres' para crear la nueva DB
        engine = create_engine(MAINTENANCE_URL, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            # Verificar si la base de datos ya existe
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{NEW_DB_NAME}'"))
            if result.fetchone():
                print(f"La base de datos '{NEW_DB_NAME}' ya existe. Eliminándola...")
                # Terminar conexiones existentes
                conn.execute(text(f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{NEW_DB_NAME}'
                    AND pid <> pg_backend_pid();
                """))
                conn.execute(text(f"DROP DATABASE {NEW_DB_NAME}"))
            
            print(f"Creando base de datos '{NEW_DB_NAME}'...")
            conn.execute(text(f"CREATE DATABASE {NEW_DB_NAME}"))
            print("Base de datos creada exitosamente.")
    except Exception as e:
        print(f"Error al crear la base de datos: {e}")
        print("IMPORTANTE: Asegúrate de que la contraseña del usuario 'postgres' sea 'solji'.")
        print("Si tu contraseña es diferente (ej. '1234'), actualiza las credenciales.")
        return False
    return True

def execute_sql_file(engine, file_path):
    print(f"Ejecutando script: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
            # SQLAlchemy no soporta ejecutar múltiples comandos separados por ; en una sola llamada de manera fiable
            # en todos los drivers, pero psycopg suele manejarlo. Si falla, tendremos que dividirlo.
            with engine.connect() as conn:
                conn.execute(text(sql_content))
                conn.commit()
        print(f"Script {file_path} ejecutado correctamente.")
    except Exception as e:
        print(f"Error ejecutando {file_path}: {e}")

def init_schema_and_data():
    # 2. Conectar a la nueva base de datos para crear tablas e insertar datos
    try:
        engine = create_engine(NEW_DB_URL)
        
        # Rutas a los archivos SQL
        base_path = os.path.dirname(os.path.abspath(__file__))
        db_sql_path = os.path.join(base_path, "sql", "db.sql")
        data_sql_path = os.path.join(base_path, "sql", "datos_prueba.sql")

        if os.path.exists(db_sql_path):
            execute_sql_file(engine, db_sql_path)
        else:
            print(f"No se encontró el archivo {db_sql_path}")

        if os.path.exists(data_sql_path):
            execute_sql_file(engine, data_sql_path)
        else:
            print(f"No se encontró el archivo {data_sql_path}")
            
    except Exception as e:
        print(f"Error al inicializar esquema y datos: {e}")

if __name__ == "__main__":
    if create_database():
        # Pequeña pausa para asegurar que sistema de archivos/DB estén listos
        time.sleep(1)
        init_schema_and_data()

#!/usr/bin/env python3
"""
Script para ejecutar los UPDATE en la base de datos
"""

import psycopg2

# Conexión a la base de datos
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="caguayo_inventario",
    user="postgres",
    password="1234",
)
conn.autocommit = True
cursor = conn.cursor()

# Commands SQL a ejecutar
updates = [
    "UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 56;",
    "UPDATE productos_en_liquidacion SET id_anexo = 158 WHERE id_producto_en_liquidacion = 55;",
    "UPDATE productos_en_liquidacion SET id_anexo = 158 WHERE id_producto_en_liquidacion = 52;",
    "UPDATE productos_en_liquidacion SET id_anexo = 159 WHERE id_producto_en_liquidacion = 51;",
    "UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 50;",
    "UPDATE productos_en_liquidacion SET id_anexo = 159 WHERE id_producto_en_liquidacion = 49;",
    "UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 48;",
    "UPDATE productos_en_liquidacion SET id_anexo = 157 WHERE id_producto_en_liquidacion = 47;",
    "UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 46;",
    "UPDATE productos_en_liquidacion SET id_anexo = 123 WHERE id_producto_en_liquidacion = 45;",
    "UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 44;",
    "UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 43;",
    "UPDATE productos_en_liquidacion SET id_anexo = 123 WHERE id_producto_en_liquidacion = 42;",
    "UPDATE productos_en_liquidacion SET id_anexo = 70 WHERE id_producto_en_liquidacion = 41;",
]

print("Ejecutando updates en la base de datos...")
print("=" * 60)

for sql in updates:
    try:
        cursor.execute(sql)
        print(f"✓ {sql}")
    except Exception as e:
        print(f"✗ Error: {e}")

# Verificar resultado
print("\n" + "=" * 60)
print("Verificando resultados...")

cursor.execute(
    "SELECT id_producto_en_liquidacion, id_producto, id_anexo, tipo_compra FROM productos_en_liquidacion WHERE id_anexo IS NOT NULL ORDER BY id_producto_en_liquidacion"
)
results = cursor.fetchall()

print("\nRegistros actualizados:")
for r in results:
    print(f"  PEL {r[0]}: prod {r[1]}, anexo {r[2]}, tipo {r[3]}")

# Contar
cursor.execute(
    "SELECT COUNT(*) FROM productos_en_liquidacion WHERE id_anexo IS NOT NULL"
)
count = cursor.fetchone()[0]
print(f"\nTotal con id_anexo: {count}")

cursor.execute("SELECT COUNT(*) FROM productos_en_liquidacion WHERE id_anexo IS NULL")
count_null = cursor.fetchone()[0]
print(f"Total sin id_anexo: {count_null}")

cursor.close()
conn.close()

print("\n✓ Script ejecutado correctamente!")

#!/usr/bin/env python3
"""
Script para corregir id_anexo en productos_en_liquidacion
Vincula: proveedor -> anexo -> producto = producto_en_liquidacion

Lógica:
- Para cada productos_en_liquidacion sin id_anexo
- Buscar en TODOS los anexos cuál tiene ese id_producto en item_anexo
- Asignar: si hay 1 anexo usar ese, si hay varios usar el de mayor id
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"


def get(endpoint):
    r = requests.get(f"{BASE_URL}{endpoint}")
    r.raise_for_status()
    return r.json()


# 1. Obtener todos los productos_en_liquidacion
print("1. Obteniendo productos_en_liquidacion...")
all_pel = get("/productos-en-liquidacion?skip=0&limit=200")
pel_sin_anexo = [p for p in all_pel if p.get("id_anexo") is None]
print(f"   Total pel sin id_anexo: {len(pel_sin_anexo)}")

# 2. Obtener todos los anexos con sus items
print("2. Obteniendo anexos con items...")
all_anexos = get("/anexos?skip=0&limit=200")

# 3. Crear diccionario de items por producto
print("3. Procesando items_anexo por producto...")
items_por_producto = {}  # id_producto -> list of {id_anexo, cantidad}

for anexo in all_anexos:
    conv = anexo.get("convenios", {})
    items = anexo.get("items_anexo", [])
    for item in items:
        prod_id = item["id_producto"]
        if prod_id not in items_por_producto:
            items_por_producto[prod_id] = []
        items_por_producto[prod_id].append(
            {
                "id_anexo": anexo["id_anexo"],
                "nombre_anexo": anexo["nombre_anexo"],
                "cantidad": item.get("cantidad", 0),
                "precio_compra": float(item.get("precio_compra", 0)),
            }
        )

print(f"   Productos con items en anexos: {len(items_por_producto)}")

# 4. Generar updates
print("\n4. Generando comandos SQL UPDATE...")
print("=" * 60)

updates = []
no_encontrados = []

for pel in pel_sin_anexo:
    prod_id = pel["id_producto"]
    pel_id = pel["id_producto_en_liquidacion"]
    cantidad_pel = pel.get("cantidad", 0)
    tipo = pel.get("tipo_compra", "UNKNOWN")

    if prod_id in items_por_producto:
        items = items_por_producto[prod_id]

        if len(items) == 1:
            # Un solo anexo -> usar ese
            id_anexo = items[0]["id_anexo"]
            updates.append(
                f"-- PEL {pel_id} (prod {prod_id}, {tipo}): 1 anexo -> {id_anexo}"
            )
            updates.append(
                f"UPDATE productos_en_liquidacion SET id_anexo = {id_anexo} WHERE id_producto_en_liquidacion = {pel_id};"
            )
        else:
            # Varios anexos -> usar el de mayor id (más reciente)
            # Primero buscar coincidencia por cantidad
            coincidencias = [i for i in items if i["cantidad"] == cantidad_pel]
            if coincidencias:
                id_anexo = max(coincidencias, key=lambda x: x["id_anexo"])["id_anexo"]
            else:
                # Usar el de mayor id
                id_anexo = max(items, key=lambda x: x["id_anexo"])["id_anexo"]

            updates.append(
                f"-- PEL {pel_id} (prod {prod_id}, {tipo}, cant {cantidad_pel}): {len(items)} anexos -> {id_anexo}"
            )
            updates.append(
                f"UPDATE productos_en_liquidacion SET id_anexo = {id_anexo} WHERE id_producto_en_liquidacion = {pel_id};"
            )
    else:
        no_encontrados.append(
            f"-- PEL {pel_id} (prod {prod_id}, {tipo}): NO hay anexo con este producto"
        )
        no_encontrados.append(f"--   Producto {prod_id} no existe en ningún item_anexo")

# 5. Mostrar resultados
print("\n--- COMANDOS SQL GENERADOS ---")
for u in updates:
    print(u)

print(f"\n--- RESUMEN ---")
print(f"Total pel sin anexo: {len(pel_sin_anexo)}")
print(f"Updates generados: {len([u for u in updates if u.startswith('UPDATE')])}")
print(f"No encontrados: {len(no_encontrados) // 2}")

if no_encontrados:
    print("\n--- PRODUCTOS SIN ANEXO ---")
    for n in no_encontrados:
        print(n)

# 6. Guardar a archivo
output_file = "/home/alexpool/code/caguayo/backend/scripts/fix_pel_anexo.sql"
with open(output_file, "w") as f:
    f.write("-- Script de corrección: agregar id_anexo a productos_en_liquidacion\n")
    f.write("-- Generado automáticamente\n\n")
    f.write("\n".join(updates))
    if no_encontrados:
        f.write(
            "\n\n-- NOTA: Los siguientes registros no tienen anexo en item_anexo:\n"
        )
        f.write("\n".join(no_encontrados))

print(f"\n5. Script guardado en: {output_file}")

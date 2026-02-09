"""
Script para generar datos de prueba:
- 30 clientes
- 100 ventas con estados variados
- 300-500 detalles de venta (3-5 productos por venta)
"""

import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

# Datos de prueba para clientes
NOMBRES = [
    "Juan",
    "María",
    "Pedro",
    "Ana",
    "Luis",
    "Carmen",
    "Carlos",
    "Laura",
    "José",
    "Sofía",
    "Miguel",
    "Isabella",
    "Jorge",
    "Valentina",
    "Andrés",
    "Camila",
    "Diego",
    "Natalia",
    "Fernando",
    "Luciana",
    "Ricardo",
    "Daniela",
    "Alejandro",
    "Gabriela",
    "Roberto",
    "Victoria",
    "Martín",
    "Paula",
    "Sebastián",
    "Mariana",
]

APELLIDOS = [
    "García",
    "Rodríguez",
    "López",
    "Martínez",
    "Pérez",
    "González",
    "Sánchez",
    "Ramírez",
    "Torres",
    "Flores",
    "Rivera",
    "Gómez",
    "Díaz",
    "Reyes",
    "Morales",
    "Ortiz",
    "Cruz",
    "Jiménez",
    "Moreno",
    "Romero",
    "Álvarez",
    "Mendoza",
    "Castillo",
    "Vásquez",
    "Chávez",
    "Fernández",
    "Ruiz",
    "Herrera",
    "Medina",
    "Aguilar",
]

DIRECCIONES = [
    "Av. Principal #123",
    "Calle 5 de Julio #456",
    "Urb. Las Acacias, Casa 7",
    "Av. Libertador, Edif. Central, Piso 3",
    "Calle Comercio #789",
    "Urb. Los Olivos, Mz. 12, Lt. 8",
    "Av. Bolívar #321",
    "Calle Miranda #654",
    "Urb. El Rosal, Casa 15",
    "Av. Universidad #987",
]


def generar_cedula():
    """Genera un número de cédula aleatorio"""
    return f"V-{random.randint(1000000, 30000000)}"


def generar_telefono():
    """Genera un número de teléfono aleatorio"""
    operadoras = ["0412", "0414", "0416", "0424", "0426"]
    return f"{random.choice(operadoras)}-{random.randint(1000000, 9999999)}"


def generar_email(nombre, apellido):
    """Genera un email basado en nombre y apellido"""
    dominios = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"]
    return f"{nombre.lower()}.{apellido.lower()}{random.randint(1, 99)}@{random.choice(dominios)}"


async def insertar_clientes():
    """Inserta 30 clientes de prueba"""
    print("Insertando clientes...")

    async with engine.connect() as conn:
        clientes_insertados = []
        for i in range(30):
            nombre = random.choice(NOMBRES)
            apellido = random.choice(APELLIDOS)
            nombre_completo = f"{nombre} {apellido}"

            query = text("""
                INSERT INTO clientes (nombre, telefono, email, cedula_rif, direccion, activo, fecha_registro)
                VALUES (:nombre, :telefono, :email, :cedula_rif, :direccion, :activo, NOW())
                RETURNING id_cliente
            """)

            result = await conn.execute(
                query,
                {
                    "nombre": nombre_completo,
                    "telefono": generar_telefono(),
                    "email": generar_email(nombre, apellido),
                    "cedula_rif": generar_cedula(),
                    "direccion": random.choice(DIRECCIONES),
                    "activo": random.random() > 0.1,  # 90% activos
                },
            )

            cliente_id = result.scalar()
            clientes_insertados.append(cliente_id)

        await conn.commit()

    print(f"✓ {len(clientes_insertados)} clientes insertados")
    return clientes_insertados


async def get_productos():
    """Obtiene los productos existentes"""
    print("Obteniendo productos...")

    async with engine.connect() as conn:
        query = text(
            "SELECT id_producto, precio_venta, stock FROM productos WHERE stock > 0"
        )
        result = await conn.execute(query)
        productos = result.fetchall()

    print(f"✓ {len(productos)} productos encontrados")
    return [(p[0], float(p[1]), p[2]) for p in productos]  # (id, precio, stock)


async def insertar_ventas(cliente_ids, productos):
    """Inserta 100 ventas con detalles"""
    print("Insertando ventas y detalles...")

    estados = ["PENDIENTE", "COMPLETADA", "ANULADA"]
    pesos_estados = [0.3, 0.6, 0.1]  # 30% pendientes, 60% completadas, 10% anuladas

    ventas_insertadas = 0
    detalles_insertados = 0

    async with engine.connect() as conn:
        for i in range(100):
            # Seleccionar cliente aleatorio
            cliente_id = random.choice(cliente_ids)

            # Generar fecha aleatoria (últimos 6 meses)
            dias_atras = random.randint(0, 180)
            fecha = datetime.now() - timedelta(days=dias_atras)

            # Seleccionar estado
            estado = random.choices(estados, weights=pesos_estados)[0]

            # Crear venta inicial (total será actualizado después)
            query_venta = text("""
                INSERT INTO ventas (id_cliente, fecha, total, estado, observacion, fecha_registro, fecha_actualizacion)
                VALUES (:cliente_id, :fecha, 0, :estado, :observacion, NOW(), :fecha_actualizacion)
                RETURNING id_venta
            """)

            observaciones = [
                "Venta al contado",
                "Pago con transferencia",
                "Cliente frecuente",
                "Descuento aplicado",
                None,
                None,
                None,
            ]

            result = await conn.execute(
                query_venta,
                {
                    "cliente_id": cliente_id,
                    "fecha": fecha,
                    "estado": estado,
                    "observacion": random.choice(observaciones),
                    "fecha_actualizacion": fecha if estado != "PENDIENTE" else None,
                },
            )

            venta_id = result.scalar()
            ventas_insertadas += 1

            # Insertar detalles de venta (3-5 productos por venta)
            num_productos = random.randint(3, 5)
            productos_disponibles = [
                p for p in productos if p[2] > 0
            ]  # productos con stock

            if len(productos_disponibles) < num_productos:
                productos_seleccionados = productos_disponibles
            else:
                productos_seleccionados = random.sample(
                    productos_disponibles, num_productos
                )

            total_venta = Decimal("0")

            for prod_id, precio, stock in productos_seleccionados:
                # Cantidad aleatoria (1-10, pero no más que el stock disponible)
                cantidad = random.randint(1, min(10, stock))

                # Pequeña variación en el precio (±5%)
                variacion = random.uniform(-0.05, 0.05)
                precio_unitario = Decimal(str(precio * (1 + variacion))).quantize(
                    Decimal("0.01")
                )
                subtotal = precio_unitario * cantidad

                query_detalle = text("""
                    INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (:venta_id, :producto_id, :cantidad, :precio_unitario, :subtotal)
                """)

                await conn.execute(
                    query_detalle,
                    {
                        "venta_id": venta_id,
                        "producto_id": prod_id,
                        "cantidad": cantidad,
                        "precio_unitario": precio_unitario,
                        "subtotal": subtotal,
                    },
                )

                detalles_insertados += 1
                total_venta += subtotal

                # Actualizar stock del producto (simular venta completada)
                if estado == "COMPLETADA":
                    query_update_stock = text("""
                        UPDATE productos SET stock = stock - :cantidad WHERE id_producto = :producto_id
                    """)
                    await conn.execute(
                        query_update_stock,
                        {"cantidad": cantidad, "producto_id": prod_id},
                    )

            # Actualizar el total de la venta
            query_update_total = text("""
                UPDATE ventas SET total = :total WHERE id_venta = :venta_id
            """)
            await conn.execute(
                query_update_total, {"total": total_venta, "venta_id": venta_id}
            )

            if (i + 1) % 20 == 0:
                print(f"  Progreso: {i + 1}/100 ventas insertadas")

        await conn.commit()

    print(f"✓ {ventas_insertadas} ventas insertadas")
    print(f"✓ {detalles_insertados} detalles de venta insertados")


async def main():
    print("=" * 60)
    print("GENERANDO DATOS DE PRUEBA")
    print("=" * 60)

    # Insertar clientes
    cliente_ids = await insertar_clientes()

    # Obtener productos existentes
    productos = await get_productos()

    if not productos:
        print("ERROR: No hay productos en la base de datos")
        print("Por favor, agregue productos primero")
        return

    if len(productos) < 5:
        print("ADVERTENCIA: Pocos productos disponibles")

    # Insertar ventas con detalles
    await insertar_ventas(cliente_ids, productos)

    print("=" * 60)
    print("✓ DATOS DE PRUEBA GENERADOS EXITOSAMENTE")
    print("=" * 60)
    print(f"Resumen:")
    print(f"  - 30 clientes nuevos")
    print(f"  - 100 ventas creadas")
    print(f"  - ~400 detalles de venta")


if __name__ == "__main__":
    asyncio.run(main())

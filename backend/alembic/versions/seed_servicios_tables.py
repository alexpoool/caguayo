"""Seed servicios tables with random relational data

Revision ID: seed_servicios_tables
Revises: add_servicios_tables
Create Date: 2026-03-31

"""

import random
from datetime import date, timedelta
from alembic import op
import sqlalchemy as sa


revision = "seed_servicios_tables"
down_revision = "add_servicios_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    random.seed(42)

    # Get existing IDs
    rp = conn.execute(sa.text("SELECT id_moneda FROM moneda ORDER BY id_moneda"))
    moneda_ids = [row[0] for row in rp.fetchall()]

    rp = conn.execute(
        sa.text(
            "SELECT id_estado_contrato FROM estado_contrato WHERE nombre = 'Activo' LIMIT 1"
        )
    )
    estado_activo = rp.fetchone()[0]

    rp = conn.execute(sa.text("SELECT id_tipo_contrato FROM tipo_contrato LIMIT 1"))
    tipo_contrato_default = rp.fetchone()[0]

    # ==========================================
    # 1. CREAR 5 NUEVOS CLIENTES + PERSONAS NATURALES
    # ==========================================
    creadores_data = [
        {
            "nombre": "Carlos",
            "apellido": "Mendoza",
            "apellido2": "López",
            "ci": "92031546781",
        },
        {
            "nombre": "Elena",
            "apellido": "Vega",
            "apellido2": "Torres",
            "ci": "88061234567",
        },
        {
            "nombre": "Roberto",
            "apellido": "Herrera",
            "apellido2": "Díaz",
            "ci": "91070823456",
        },
        {
            "nombre": "María",
            "apellido": "Castro",
            "apellido2": "García",
            "ci": "93090112345",
        },
        {
            "nombre": "Jorge",
            "apellido": "Morales",
            "apellido2": "Ruiz",
            "ci": "90050398765",
        },
    ]

    # Get next available ID for clientes
    rp = conn.execute(sa.text("SELECT COALESCE(MAX(id_cliente), 0) FROM clientes"))
    next_cliente_id = rp.fetchone()[0] + 1

    persona_ids = []
    for i, c in enumerate(creadores_data):
        cid = next_cliente_id + i
        conn.execute(
            sa.text("""
            INSERT INTO clientes (id_cliente, nombre, tipo_relacion, estado, activo, fecha_registro)
            VALUES (:id, :nombre, 'CLIENTE', 'ACTIVO', true, CURRENT_DATE)
        """),
            {"id": cid, "nombre": f"{c['nombre']} {c['apellido']} {c['apellido2']}"},
        )

        conn.execute(
            sa.text("""
            INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad)
            VALUES (:id, :nombre, :apellido, :apellido2, :ci)
        """),
            {
                "id": cid,
                "nombre": c["nombre"],
                "apellido": c["apellido"],
                "apellido2": c["apellido2"],
                "ci": c["ci"],
            },
        )
        persona_ids.append(cid)

    # ==========================================
    # 2. CREAR 3 NUEVOS CONTRATOS
    # ==========================================
    contrato_ids = []
    for i in range(3):
        id_cliente = random.choice(persona_ids)
        id_moneda = random.choice(moneda_ids[:2])  # USD or EUR
        fecha = date(2026, random.randint(1, 6), random.randint(1, 28))
        vigencia = fecha + timedelta(days=random.randint(180, 365))
        monto = round(random.uniform(5000, 50000), 2)

        result = conn.execute(
            sa.text("""
            INSERT INTO contrato (id_cliente, nombre, id_estado, fecha, vigencia, id_tipo_contrato, id_moneda, monto)
            VALUES (:id_cliente, :nombre, :estado, :fecha, :vigencia, :tipo, :moneda, :monto)
            RETURNING id_contrato
        """),
            {
                "id_cliente": id_cliente,
                "nombre": f"Contrato Proyecto {i + 1:02d}-2026",
                "estado": estado_activo,
                "fecha": fecha,
                "vigencia": vigencia,
                "tipo": tipo_contrato_default,
                "moneda": id_moneda,
                "monto": monto,
            },
        )
        contrato_ids.append(result.fetchone()[0])

    # ==========================================
    # 3. CREAR 10 SERVICIOS
    # ==========================================
    servicios_data = [
        {
            "codigo": "SRV-001",
            "concepto": "Desarrollo de software a medida",
            "unidad": "Licencia",
            "precio": 2500.00,
        },
        {
            "codigo": "SRV-002",
            "concepto": "Diseño gráfico y branding",
            "unidad": "Proyecto",
            "precio": 800.00,
        },
        {
            "codigo": "SRV-003",
            "concepto": "Consultoría en tecnología",
            "unidad": "Hora",
            "precio": 75.00,
        },
        {
            "codigo": "SRV-004",
            "concepto": "Mantenimiento de sistemas",
            "unidad": "Mes",
            "precio": 500.00,
        },
        {
            "codigo": "SRV-005",
            "concepto": "Capacitación en herramientas digitales",
            "unidad": "Curso",
            "precio": 1200.00,
        },
        {
            "codigo": "SRV-006",
            "concepto": "Fotografía y video corporativo",
            "unidad": "Sesión",
            "precio": 350.00,
        },
        {
            "codigo": "SRV-007",
            "concepto": "Gestión de redes sociales",
            "unidad": "Mes",
            "precio": 600.00,
        },
        {
            "codigo": "SRV-008",
            "concepto": "Análisis de datos e inteligencia de negocio",
            "unidad": "Informe",
            "precio": 1800.00,
        },
        {
            "codigo": "SRV-009",
            "concepto": "Redacción de contenido editorial",
            "unidad": "Artículo",
            "precio": 150.00,
        },
        {
            "codigo": "SRV-010",
            "concepto": "Auditoría de seguridad informática",
            "unidad": "Auditoría",
            "precio": 3500.00,
        },
    ]

    servicio_ids = []
    id_moneda_usd = moneda_ids[0]
    for s in servicios_data:
        result = conn.execute(
            sa.text("""
            INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
            VALUES (:codigo, :concepto, :unidad, :precio, :moneda)
            RETURNING id_servicio
        """),
            {
                "codigo": s["codigo"],
                "concepto": s["concepto"],
                "unidad": s["unidad"],
                "precio": s["precio"],
                "moneda": id_moneda_usd,
            },
        )
        servicio_ids.append(result.fetchone()[0])

    # ==========================================
    # 4. CREAR 6 SOLICITUDES DE SERVICIO
    # ==========================================
    solicitud_ids = []
    estados_solicitud = ["PENDIENTE", "EN PROCESO", "COMPLETADA"]
    for i in range(6):
        id_cliente = random.choice(persona_ids)
        id_contrato = random.choice(contrato_ids)
        fecha = date(2026, random.randint(1, 8), random.randint(1, 28))
        fecha_entrega = fecha + timedelta(days=random.randint(30, 90))

        result = conn.execute(
            sa.text("""
            INSERT INTO solicitud_servicio (id_cliente, id_contrato, codigo_solicitud, numero,
                nombres_rep, apellido1_rep, ci_rep, telefono_rep, cargo,
                descripcion, fecha_solicitud, fecha_entrega, estado, aprobado)
            VALUES (:id_cliente, :id_contrato, :codigo, :numero,
                :nombres, :apellido, :ci, :telefono, :cargo,
                :desc, :fecha, :fecha_ent, :estado, :aprobado)
            RETURNING id_solicitud_servicio
        """),
            {
                "id_cliente": id_cliente,
                "id_contrato": id_contrato,
                "codigo": f"SOL-{i + 1:03d}-2026",
                "numero": f"00{i + 1}/2026",
                "nombres": random.choice(["Juan", "Ana", "Pedro", "Laura", "Miguel"]),
                "apellido": random.choice(
                    ["García", "Pérez", "Rodríguez", "Martínez", "López"]
                ),
                "ci": f"{random.randint(10000000000, 99999999999)}",
                "telefono": f"+53 {random.randint(50000000, 59999999)}",
                "cargo": random.choice(
                    ["Director", "Gerente", "Coordinador", "Jefe de Área"]
                ),
                "desc": f"Solicitud de servicios profesionales #{i + 1}",
                "fecha": fecha,
                "fecha_ent": fecha_entrega,
                "estado": random.choice(estados_solicitud),
                "aprobado": random.choice([True, True, False]),
            },
        )
        solicitud_ids.append(result.fetchone()[0])

    # ==========================================
    # 5. CREAR 15 ETAPAS (2-3 por solicitud)
    # ==========================================
    etapa_ids = []
    nombres_etapa = [
        "Análisis",
        "Desarrollo",
        "Diseño",
        "Implementación",
        "Pruebas",
        "Entrega",
        "Revisión",
        "Documentación",
    ]
    for sol_id in solicitud_ids:
        n_etapas = random.randint(2, 3)
        for j in range(n_etapas):
            id_moneda = random.choice(moneda_ids[:2])
            valor = round(random.uniform(500, 8000), 2)
            fecha_entrega = date(2026, random.randint(3, 12), random.randint(1, 28))
            pagada = random.choice([False, False, False, True])

            result = conn.execute(
                sa.text("""
                INSERT INTO etapas (id_solicitud_servicio, numero_etapa, nombre_etapa,
                    fecha_entrega, descripcion, valor, id_moneda, pagada)
                VALUES (:sol_id, :num, :nombre, :fecha, :desc, :valor, :moneda, :pagada)
                RETURNING id_etapa
            """),
                {
                    "sol_id": sol_id,
                    "num": j + 1,
                    "nombre": random.choice(nombres_etapa),
                    "fecha": fecha_entrega,
                    "desc": f"Etapa {j + 1} de la solicitud {sol_id}",
                    "valor": valor,
                    "moneda": id_moneda,
                    "pagada": pagada,
                },
            )
            etapa_ids.append(result.fetchone()[0])

    # ==========================================
    # 6. CREAR 20 TAREAS ETAPA
    # ==========================================
    for etapa_id in etapa_ids:
        n_tareas = random.randint(1, 2)
        for _ in range(n_tareas):
            srv_id = random.choice(servicio_ids)
            cantidad = round(random.uniform(1, 20), 2)
            precio = round(random.uniform(50, 3000), 2)
            id_moneda = random.choice(moneda_ids[:2])

            conn.execute(
                sa.text("""
                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido,
                    concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda)
                VALUES (:etapa, :servicio, :codigo, :concepto, :unidad, :cant, :precio, :moneda)
            """),
                {
                    "etapa": etapa_id,
                    "servicio": srv_id,
                    "codigo": f"ET-{etapa_id}-SRV-{srv_id}",
                    "concepto": f"Tarea de servicio #{srv_id} en etapa {etapa_id}",
                    "unidad": random.choice(["Hora", "Unidad", "Proyecto", "Licencia"]),
                    "cant": cantidad,
                    "precio": precio,
                    "moneda": id_moneda,
                },
            )

    # ==========================================
    # 7. CREAR 18 PERSONA ETAPA
    # ==========================================
    for etapa_id in etapa_ids:
        n_personas = random.randint(1, 2)
        personas_etapa = random.sample(persona_ids, min(n_personas, len(persona_ids)))
        for pid in personas_etapa:
            cobro = round(random.uniform(200, 5000), 2)
            id_moneda = random.choice(moneda_ids[:2])
            liquidada = random.choice([False, False, True])

            conn.execute(
                sa.text("""
                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, pago_completado)
                VALUES (:etapa, :persona, :cobro, :moneda, :liquidada, :pagado)
                ON CONFLICT (id_etapa, id_persona) DO NOTHING
            """),
                {
                    "etapa": etapa_id,
                    "persona": pid,
                    "cobro": cobro,
                    "moneda": id_moneda,
                    "liquidada": liquidada,
                    "pagado": liquidada,
                },
            )

    # ==========================================
    # 8. CREAR 12 FACTURAS DE SERVICIO
    # ==========================================
    factura_ids = []
    etapas_para_factura = random.sample(etapa_ids, min(12, len(etapa_ids)))
    for etapa_id in etapas_para_factura:
        id_moneda = random.choice(moneda_ids[:2])
        cantidad = round(random.uniform(1, 10), 2)
        precio = round(random.uniform(500, 10000), 2)
        fecha = date(2026, random.randint(2, 10), random.randint(1, 28))
        alcance = random.choice(["TOTAL", "PARCIAL"])

        result = conn.execute(
            sa.text("""
            INSERT INTO factura_servicio (id_etapa, alcance, codigo_factura, numero,
                id_moneda, fecha, descripcion, cantidad, precio)
            VALUES (:etapa, :alcance, :codigo, :numero, :moneda, :fecha, :desc, :cant, :precio)
            RETURNING id_factura_servicio
        """),
            {
                "etapa": etapa_id,
                "alcance": alcance,
                "codigo": f"FS-{len(factura_ids) + 1:03d}-2026",
                "numero": f"00{len(factura_ids) + 1}/2026",
                "moneda": id_moneda,
                "fecha": fecha,
                "desc": f"Factura por servicios de etapa {etapa_id}",
                "cant": cantidad,
                "precio": precio,
            },
        )
        factura_ids.append(result.fetchone()[0])

    # ==========================================
    # 9. CREAR 16 ITEMS FACTURA SERVICIO
    # ==========================================
    for fs_id in factura_ids:
        n_items = random.randint(1, 2)
        for _ in range(n_items):
            srv_id = random.choice(servicio_ids)
            cantidad = round(random.uniform(1, 15), 2)
            precio = round(random.uniform(50, 2500), 2)

            conn.execute(
                sa.text("""
                INSERT INTO items_factura_servicio (id_factura_servicio, codigo_extendido,
                    concepto, unidad_medida, cantidad, precio)
                VALUES (:factura, :codigo, :concepto, :unidad, :cant, :precio)
            """),
                {
                    "factura": fs_id,
                    "codigo": f"IFS-{fs_id}-{srv_id}",
                    "concepto": f"Item de servicio #{srv_id}",
                    "unidad": random.choice(["Hora", "Unidad", "Proyecto"]),
                    "cant": cantidad,
                    "precio": precio,
                },
            )

    # ==========================================
    # 10. CREAR 12 PAGOS FACTURA SERVICIO
    # ==========================================
    for fs_id in factura_ids:
        n_pagos = random.choice([1, 1, 2])
        for _ in range(n_pagos):
            monto = round(random.uniform(100, 5000), 2)
            id_moneda = random.choice(moneda_ids[:2])
            fecha = date(2026, random.randint(3, 11), random.randint(1, 28))

            conn.execute(
                sa.text("""
                INSERT INTO pago_factura_servicio (id_factura_servicio, monto, id_moneda, fecha, doc_traza)
                VALUES (:factura, :monto, :moneda, :fecha, :traza)
            """),
                {
                    "factura": fs_id,
                    "monto": monto,
                    "moneda": id_moneda,
                    "fecha": fecha,
                    "traza": f"TRAZA-{random.randint(100000, 999999)}",
                },
            )

    # ==========================================
    # 11. CREAR 10 LIQUIDACIONES A PERSONAS
    # ==========================================
    etapas_con_personas = random.sample(etapa_ids, min(10, len(etapa_ids)))
    for i, etapa_id in enumerate(etapas_con_personas):
        id_persona = random.choice(persona_ids)
        id_moneda = random.choice(moneda_ids[:2])
        importe = round(random.uniform(500, 10000), 2)
        pct_gestion = round(random.uniform(2, 8), 2)
        pct_empresa = round(random.uniform(3, 10), 2)
        devengado = round(importe * (1 - pct_gestion / 100 - pct_empresa / 100), 2)
        tributario = round(devengado * 0.05, 2)
        comision = round(random.uniform(10, 50), 2)
        neto = round(devengado - tributario - comision, 2)
        fecha_emi = date(2026, random.randint(4, 12), random.randint(1, 28))

        conn.execute(
            sa.text("""
            INSERT INTO persona_liquidacion (numero, id_etapa, id_persona, fecha_emision,
                descripcion, id_moneda, importe, porciento_gestion, porciento_empresa,
                devengado, tributario, comision_bancaria, neto_pagar, gasto_empresa)
            VALUES (:numero, :etapa, :persona, :fecha, :desc, :moneda, :importe,
                :pct_g, :pct_e, :devengado, :tributario, :comision, :neto, :gasto)
        """),
            {
                "numero": f"LQ-{i + 1:03d}-2026",
                "etapa": etapa_id,
                "persona": id_persona,
                "fecha": fecha_emi,
                "desc": f"Liquidación por servicios en etapa {etapa_id}",
                "moneda": id_moneda,
                "importe": importe,
                "pct_g": pct_gestion,
                "pct_e": pct_empresa,
                "devengado": devengado,
                "tributario": tributario,
                "comision": comision,
                "neto": neto,
                "gasto": round(random.uniform(5, 100), 2),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM persona_liquidacion WHERE numero LIKE 'LQ-%-2026'")
    )
    conn.execute(
        sa.text("DELETE FROM pago_factura_servicio WHERE doc_traza LIKE 'TRAZA-%'")
    )
    conn.execute(
        sa.text(
            "DELETE FROM items_factura_servicio WHERE codigo_extendido LIKE 'IFS-%'"
        )
    )
    conn.execute(
        sa.text("DELETE FROM factura_servicio WHERE codigo_factura LIKE 'FS-%-2026'")
    )
    conn.execute(
        sa.text(
            "DELETE FROM persona_etapa WHERE id_persona IN (SELECT id_cliente FROM clientes_persona_natural WHERE carnet_identidad LIKE '9%' OR carnet_identidad LIKE '8%')"
        )
    )
    conn.execute(
        sa.text("DELETE FROM tareas_etapa WHERE codigo_extendido LIKE 'ET-%-SRV-%'")
    )
    conn.execute(
        sa.text("DELETE FROM etapas WHERE descripcion LIKE 'Etapa % de la solicitud %'")
    )
    conn.execute(
        sa.text(
            "DELETE FROM solicitud_servicio WHERE codigo_solicitud LIKE 'SOL-%-2026'"
        )
    )
    conn.execute(sa.text("DELETE FROM servicios WHERE codigo_servicio LIKE 'SRV-%'"))
    conn.execute(
        sa.text("DELETE FROM contrato WHERE nombre LIKE 'Contrato Proyecto %-2026'")
    )
    conn.execute(
        sa.text(
            "DELETE FROM clientes_persona_natural WHERE carnet_identidad IN ('92031546781','88061234567','91070823456','93090112345','90050398765')"
        )
    )
    conn.execute(
        sa.text(
            "DELETE FROM clientes WHERE nombre LIKE '%Mendoza%' OR nombre LIKE '%Vega%' OR nombre LIKE '%Herrera%' OR nombre LIKE '%Castro%' OR nombre LIKE '%Morales%'"
        )
    )

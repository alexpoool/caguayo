# Esquema de Base de Datos de Caguayo

## Descripción General

El sistema de base de datos de Caguayo utiliza SQLModel (un ORM basado en SQLAlchemy) para definir y gestionar el modelo de datos relacional. El esquema está diseñado para manejar operaciones financieras complejas, relaciones entre entidades y garantizar la integridad de los datos.

## Características del Esquema

### 1. Modelo Relacional

- **Base**: SQLModel (sobreescribe SQLAlchemy)
- **Dialecto**: PostgreSQL (principal), compatible con MySQL
- **Versionado**: Alembic para cambios de esquema
- **Restricciones**: Restricciones de clave foránea y unique
- **Índices**: Índices optimizados para consultas frecuentes

### 2. Diseño del Modelo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                    Tablas de Encabezado                 │
│  - clientes, ventas, movimientos, liquidaciones           │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Tablas de Detalle                      │
│  - items_venta, detalles_liquidacion, etc.               │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Tablas de Referencia                   │
│  - categorias, monedas, tipos, etc.                      │n
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Tablas de Soporte                      │
│  - anexos, archivos, logs, etc.                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Patrones de Relación

#### 1. Uno a Muchos

- **Ejemplo**: Cliente → Ventas
- **Cardinalidad**: Un cliente puede tener muchas ventas
- **Implementación**: Clave foránea en ventas.cliente_id

#### 2. Muchos a Muchos

- **Ejemplo**: Productos ↔ Categorias (a través de anexos)
- **Cardinalidad**: Un producto puede tener muchas categorías, una categoría puede tener muchos productos
- **Implementación**: Tabla de unión con claves foráneas

#### 3. Herencia

- **Ejemplo**: Cliente base → ClienteNatural, ClienteJuridica
- **Cardinalidad**: Un cliente base puede ser natural o jurídico
- **Implementación**: Clase base con tablas separadas

### 4. Restricciones de Integridad

#### 1. Clave Foránea

- **Propósito**: Garantizar referencias referenciales
- **Ejemplo**: ventas.cliente_id → clientes.id

#### 2. Unique

- **Propósito**: Garantizar valores únicos
- **Ejemplo**: clientes.rfc (RFC único)

#### 3. Check

- **Propósito**: Validar valores
- **Ejemplo**: movimientos.monto > 0

## Tablas Principales

### 1. Clientes

#### Descripción

Tabla principal para almacenar información de clientes (individuales y empresariales).

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Nombre completo |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Dirección de correo electrónico |
| telefono | VARCHAR(20) | NOT NULL | Número de teléfono |
| direccion | TEXT | NOT NULL | Dirección física |
| ciudad | VARCHAR(100) | NOT NULL | Ciudad |
| estado | VARCHAR(100) | NOT NULL | Estado/Provincia |
| codigo_postal | VARCHAR(10) | NOT NULL | Código postal |
| rfc | VARCHAR(13) | NOT NULL, UNIQUE | Registro Federal de Contribuyentes |
| tipo_relacion | VARCHAR(20) | NOT NULL | CLIENTE, PROVEEDOR, AMBAS |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_clientes_email` (UNIQUE)
- `idx_clientes_rfc` (UNIQUE)
- `idx_clientes_tipo_relacion`

#### Relaciones

- **Uno a Muchos**: `Ventas.cliente_id` → `Clientes.id`

### 2. Ventas

#### Descripción

Tabla para registrar ventas y transacciones.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| cliente_id | UUID | NOT NULL, FK | Referencia a cliente |
| fecha | TIMESTAMP | NOT NULL | Fecha y hora de la venta |
| monto | DECIMAL(12,2) | NOT NULL | Monto total |
| moneda | VARCHAR(3) | NOT NULL | Código de moneda (MXN, USD, etc.) |
| metodo_pago | VARCHAR(20) | NOT NULL | EFECTIVO, TRANSFERENCIA, TARJETA |
| impuestos | JSON | NOT NULL | Impuestos calculados |
| observaciones | TEXT | | Observaciones adicionales |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_ventas_cliente_id`
- `idx_ventas_fecha`
- `idx_ventas_metodo_pago`

#### Relaciones

- **Muchos a Uno**: `Ventas.cliente_id` → `Clientes.id`
- **Uno a Muchos**: `DetalleVenta.venta_id` → `Ventas.id`

### 3. DetalleVenta

#### Descripción

Tabla para detalles de productos en ventas.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| venta_id | UUID | NOT NULL, FK | Referencia a venta |
| producto_id | UUID | NOT NULL, FK | Referencia a producto |
| cantidad | INTEGER | NOT NULL | Cantidad vendida |
| precio_unitario | DECIMAL(10,2) | NOT NULL | Precio unitario |
| descuento | DECIMAL(5,2) | NOT NULL, DEFAULT 0.00 | Descuento aplicado |
| subtotal | DECIMAL(12,2) | NOT NULL | Subtotal (cantidad * precio_unitario - descuento) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_detalle_venta_venta_id`
- `idx_detalle_venta_producto_id`

#### Restricciones

- `CHECK (cantidad > 0)`
- `CHECK (precio_unitario >= 0)`
- `CHECK (descuento >= 0)`
- `CHECK (subtotal >= 0)`

#### Relaciones

- **Muchos a Uno**: `DetalleVenta.venta_id` → `Ventas.id`
- **Muchos a Uno**: `DetalleVenta.producto_id` → `Productos.id`

### 4. Movimientos

#### Descripción

Tabla para registrar transacciones financieras.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| tipo | VARCHAR(10) | NOT NULL | INGRESO, EGRESO |
| fecha | TIMESTAMP | NOT NULL | Fecha y hora del movimiento |
| monto | DECIMAL(12,2) | NOT NULL | Monto del movimiento |
| moneda | VARCHAR(3) | NOT NULL | Código de moneda |
| descripcion | TEXT | NOT NULL | Descripción del movimiento |
| categoria_id | UUID | FK | Referencia a categoría |
| metodo | VARCHAR(20) | NOT NULL | TRANSFERENCIA, EFECTIVO, TARJETA |
| referencia | VARCHAR(100) | | Referencia externa |
| cuenta_origen | VARCHAR(50) | | Cuenta de origen |
| cuenta_destino | VARCHAR(50) | | Cuenta de destino |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_movimientos_tipo`
- `idx_movimientos_fecha`
- `idx_movimientos_categoria_id`

#### Restricciones

- `CHECK (monto > 0)`
- `CHECK (tipo IN ('INGRESO', 'EGRESO'))`

#### Relaciones

- **Muchos a Uno**: `Movimientos.categoria_id` → `Categorias.id`

### 5. Liquidaciones

#### Descripción

Tabla para registrar liquidaciones financieras.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| fecha | TIMESTAMP | NOT NULL | Fecha y hora de la liquidación |
| monto_total | DECIMAL(15,2) | NOT NULL | Monto total de la liquidación |
| moneda | VARCHAR(3) | NOT NULL | Código de moneda |
| descripcion | TEXT | NOT NULL | Descripción de la liquidación |
| periodo_inicio | DATE | NOT NULL | Fecha de inicio del período |
| periodo_fin | DATE | NOT NULL | Fecha de fin del período |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_liquidaciones_fecha`
- `idx_liquidaciones_periodo_inicio`
- `idx_liquidaciones_periodo_fin`

#### Relaciones

- **Uno a Muchos**: `ProductosEnLiquidacion.liquidacion_id` → `Liquidaciones.id`

### 6. ProductosEnLiquidacion

#### Descripción

Tabla para productos en liquidaciones.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| liquidacion_id | UUID | NOT NULL, FK | Referencia a liquidación |
| tipo | VARCHAR(20) | NOT NULL | TIPO_SERVICIO, PRODUCTO, etc. |
| monto | DECIMAL(12,2) | NOT NULL | Monto del item |
| producto_id | UUID | FK | Referencia a producto |
| cantidad | INTEGER | NOT NULL | Cantidad |
| observaciones | TEXT | | Observaciones |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_liquidacion_producto_liquidacion_id`
- `idx_liquidacion_producto_producto_id`

#### Restricciones

- `CHECK (cantidad > 0)`
- `CHECK (monto >= 0)`

#### Relaciones

- **Muchos a Uno**: `ProductosEnLiquidacion.liquidacion_id` → `Liquidaciones.id`
- **Muchos a Uno**: `ProductosEnLiquidacion.producto_id` → `Productos.id`

### 7. Productos

#### Descripción

Tabla para catálogo de productos.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Nombre del producto |
| descripcion | TEXT | | Descripción del producto |
| precio | DECIMAL(10,2) | NOT NULL | Precio de venta |
| costo | DECIMAL(10,2) | NOT NULL | Costo unitario |
| sku | VARCHAR(50) | NOT NULL, UNIQUE | Código de producto |
| categoria_id | UUID | FK | Referencia a categoría |
| activo | BOOLEAN | NOT NULL, DEFAULT TRUE | Estado activo/inactivo |
| stock | INTEGER | NOT NULL, DEFAULT 0 | Cantidad en inventario |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_productos_sku` (UNIQUE)
- `idx_productos_categoria_id`
- `idx_productos_activo`

#### Restricciones

- `CHECK (precio >= 0)`
- `CHECK (costo >= 0)`
- `CHECK (stock >= 0)`

#### Relaciones

- **Muchos a Uno**: `Productos.categoria_id` → `Categorias.id`
- **Uno a Muchos**: `DetalleVenta.producto_id` → `Productos.id`
- **Uno a Muchos**: `ProductosEnLiquidacion.producto_id` → `Productos.id`

### 8. Categorias

#### Descripción

Tabla para categorías de productos y movimientos.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(100) | NOT NULL, UNIQUE | Nombre de la categoría |
| descripcion | TEXT | | Descripción de la categoría |
| tipo | VARCHAR(20) | NOT NULL | PRODUCTO, MOVIMIENTO, etc. |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_categorias_nombre` (UNIQUE)
- `idx_categorias_tipo`

### 9. Monedas

#### Descripción

Tabla para tipos de moneda.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| codigo | VARCHAR(3) | NOT NULL, UNIQUE | Código ISO de moneda (MXN, USD, etc.) |
| nombre | VARCHAR(50) | NOT NULL | Nombre completo de la moneda |
| simbolo | VARCHAR(5) | NOT NULL | Símbolo de moneda |
| decimales | INTEGER | NOT NULL, DEFAULT 2 | Número de decimales |
| activo | BOOLEAN | NOT NULL, DEFAULT TRUE | Estado activo/inactivo |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_monedas_codigo` (UNIQUE)
- `idx_monedas_activo`

### 10. Cuentas

#### Descripción

Tabla para cuentas bancarias.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| numero | VARCHAR(50) | NOT NULL, UNIQUE | Número de cuenta |
| tipo | VARCHAR(20) | NOT NULL | AHORROS, CORRIENTE, etc. |
| banco | VARCHAR(100) | NOT NULL | Nombre del banco |
| titular | VARCHAR(255) | NOT NULL | Titular de la cuenta |
| saldo | DECIMAL(15,2) | NOT NULL, DEFAULT 0.00 | Saldo actual |
| moneda_id | UUID | NOT NULL, FK | Referencia a moneda |
| activo | BOOLEAN | NOT NULL, DEFAULT TRUE | Estado activo/inactivo |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_cuentas_numero` (UNIQUE)
- `idx_cuentas_tipo`
- `idx_cuentas_moneda_id`

#### Restricciones

- `CHECK (saldo >= 0)`

#### Relaciones

- **Muchos a Uno**: `Cuentas.moneda_id` → `Monedas.id`

### 11. Pagos

#### Descripción

Tabla para registros de pagos.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| fecha | TIMESTAMP | NOT NULL | Fecha y hora del pago |
| monto | DECIMAL(12,2) | NOT NULL | Monto del pago |
| moneda | VARCHAR(3) | NOT NULL | Código de moneda |
| metodo | VARCHAR(20) | NOT NULL | EFECTIVO, TRANSFERENCIA, TARJETA |
| descripcion | TEXT | NOT NULL | Descripción del pago |
| venta_id | UUID | FK | Referencia a venta |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_pagos_fecha`
- `idx_pagos_metodo`
- `idx_pagos_venta_id`

#### Relaciones

- **Muchos a Uno**: `Pagos.venta_id` → `Ventas.id`

## Tablas de Referencia

### 1. Anexos

#### Descripción

Tabla para anexos de documentos.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Nombre del anexo |
| tipo | VARCHAR(50) | NOT NULL | Tipo de archivo |
| ruta | VARCHAR(500) | NOT NULL | Ruta del archivo |
| tamano | BIGINT | NOT NULL | Tamaño del archivo |
| entidad_id | UUID | NOT NULL | ID de entidad referenciada |
| entidad_tipo | VARCHAR(50) | NOT NULL | Tipo de entidad (CLIENTE, PRODUCTO, etc.) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_anexos_entidad`

### 2. Dependencias

#### Descripción

Tabla para dependencias entre entidades.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Nombre de la dependencia |
| descripcion | TEXT | | Descripción de la dependencia |
| tipo_entidad_id | UUID | NOT NULL, FK | Referencia a tipo_entidad |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_dependencias_tipo_entidad_id`

#### Relaciones

- **Muchos a Uno**: `Dependencias.tipo_entidad_id` → `TipoEntidad.id`

### 3. TipoEntidad

#### Descripción

Tabla para tipos de entidad.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(100) | NOT NULL, UNIQUE | Nombre del tipo de entidad |
| descripcion | TEXT | | Descripción del tipo de entidad |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_tipo_entidad_nombre` (UNIQUE)

## Tablas de Configuración

### 1. Configuracion

#### Descripción

Tabla para configuración del sistema.

#### Columnas

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, NOT NULL | Identificador único |
| clave | VARCHAR(100) | NOT NULL, UNIQUE | Clave de configuración |
| valor | TEXT | NOT NULL | Valor de configuración |
| descripcion | TEXT | | Descripción de la configuración |
| tipo | VARCHAR(20) | NOT NULL | STRING, NUMBER, BOOLEAN, JSON |
| creado_en | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| actualizado_en | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

#### Índices

- `idx_configuracion_clave` (UNIQUE)
- `idx_configuracion_tipo`

## Vistas

### 1. VistaResumenVentas

#### Descripción

Vista para resumen de ventas.

#### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| fecha | DATE | Fecha |
| total_ventas | DECIMAL(15,2) | Total de ventas |
| cantidad_ventas | INTEGER | Cantidad de ventas |
| promedio_venta | DECIMAL(10,2) | Promedio de ventas |

#### Consulta SQL

```sql
CREATE VIEW vista_resumen_ventas AS
SELECT
    DATE(v.fecha) AS fecha,
    SUM(v.monto) AS total_ventas,
    COUNT(v.id) AS cantidad_ventas,
    AVG(v.monto) AS promedio_venta
FROM ventas v
GROUP BY DATE(v.fecha);
```

### 2. VistaResumenMovimientos

#### Descripción

Vista para resumen de movimientos.

#### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| fecha | DATE | Fecha |
| tipo | VARCHAR(10) | Tipo de movimiento |
| total | DECIMAL(15,2) | Total |
| cantidad | INTEGER | Cantidad |

#### Consulta SQL

```sql
CREATE VIEW vista_resumen_movimientos AS
SELECT
    DATE(m.fecha) AS fecha,
    m.tipo,
    SUM(m.monto) AS total,
    COUNT(m.id) AS cantidad
FROM movimientos m
GROUP BY DATE(m.fecha), m.tipo;
```

## Migraciones

### 1. Esquema Actual

El esquema actual incluye las siguientes migraciones:

- `alembic/versions/xxxxxx_initial_schema.py` - Esquema inicial
- `alembic/versions/xxxxxx_add_constraints.py` - Restricciones adicionales
- `alembic/versions/xxxxxx_add_indexes.py` - Índices optimizados

### 2. Proceso de Migración

```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripcion_migracion"

# Aplicar migraciones
alembic upgrade head

# Revertir migración
alembic downgrade -1
```

### 3. Control de Versiones

- **Formato**: `YYYYMMDD_HHMMSS_descripcion`
- **Ejemplo**: `20240115_143022_add_email_index.py`
- **Contenido**: Encabezado con fecha/hora, descripción, revisiones

## Índices

### 1. Índices de Búsqueda

| Tabla | Índice | Columnas | Propósito |
|-------|--------|----------|----------|
| clientes | idx_clientes_email | email | Búsqueda por email |
| clientes | idx_clientes_rfc | rfc | Búsqueda por RFC |
| ventas | idx_ventas_fecha | fecha | Búsqueda por fecha |
| ventas | idx_ventas_cliente_id | cliente_id | Búsqueda por cliente |
| movimientos | idx_movimientos_fecha | fecha | Búsqueda por fecha |
| productos | idx_productos_sku | sku | Búsqueda por SKU |

### 2. Índices de Agregación

| Tabla | Índice | Columnas | Propósito |
|-------|--------|----------|----------|
| ventas | idx_ventas_fecha_cliente | fecha, cliente_id | Reportes de ventas por cliente |
| movimientos | idx_movimientos_fecha_tipo | fecha, tipo | Reportes de movimientos por tipo |

## Consultas de Ejemplo

### 1. Ventas por Cliente

```sql
SELECT
    c.nombre,
    COUNT(v.id) AS cantidad_ventas,
    SUM(v.monto) AS total_ventas,
    AVG(v.monto) AS promedio_venta
FROM clientes c
JOIN ventas v ON c.id = v.cliente_id
GROUP BY c.id, c.nombre
ORDER BY total_ventas DESC;
```

### 2. Movimientos por Mes

```sql
SELECT
    DATE_TRUNC('month', fecha) AS mes,
    tipo,
    SUM(monto) AS total
FROM movimientos
WHERE fecha >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', fecha), tipo
ORDER BY mes, tipo;
```

### 3. Productos con Bajo Stock

```sql
SELECT
    p.nombre,
    p.sku,
    p.stock,
    p.precio
FROM productos p
WHERE p.stock <= 10 AND p.activo = TRUE
ORDER BY p.stock ASC;
```

### 4. Liquidaciones por Período

```sql
SELECT
    l.fecha,
    l.monto_total,
    l.descripcion
FROM liquidaciones l
WHERE l.fecha BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY l.fecha DESC;
```

## Herramientas de Base de Datos

### 1. Inspección de Esquema

```bash
# Inspeccionar esquema
dbinspector inspect --url $DATABASE_URL

# Generar documentación
 dbdoc generate --input $DATABASE_URL --output docs/database
```

### 2. Optimización de Rendimiento

```sql
-- Reindexar tablas
REINDEX TABLE clientes;
REINDEX TABLE ventas;
REINDEX TABLE movimientos;

-- Analizar tablas
ANALYZE TABLE clientes;
ANALYZE TABLE ventas;
ANALYZE TABLE movimientos;
```

### 3. Copia de Seguridad

```bash
# Copia de seguridad completa
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Copia de seguridad con restauración point-in-time
pg_dumpall --username=postgres --schema=caguayo > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Monitoreo de Base de Datos

### 1. Métricas

| Métrica | Descripción | Frecuencia |
|---------|-------------|------------|
| Conexiones activas | Número de conexiones activas | Cada minuto |
| Tamaño de la base de datos | Tamaño total de la base de datos | Cada hora |
| Tiempo de respuesta de consultas | Tiempo promedio de ejecución de consultas | Cada minuto |
| Tasa de bloqueo | Número de bloqueos por segundo | Cada minuto |

### 2. Alertas

- **Latencia alta**: Consultas > 1 segundo
- **Bloqueos**: Bloqueos por más de 5 segundos
- **Tamaño de la base de datos**: Crecimiento > 10% mensual
- **Conexiones**: Conexiones > 80% del límite

## Conclusión

El esquema de base de datos de Caguayo proporciona una foundation sólida y bien estructurada para el sistema de gestión financiera. Características clave:

1. **Normalización**: Diseño normalizado para evitar redundancia
2. **Integridad Referencial**: Restricciones de clave foránea para datos consistentes
3. **Optimización de Índices**: Índices para consultas frecuentes y reportes
4. **Vistas**: Vistas materializadas para reportes y análisis
5. **Migraciones**: Control de versiones para cambios de esquema
6. **Seguridad**: Restricciones y controles de acceso adecuados

El esquema está diseñado para:

- **Escalabilidad**: Soportar crecimientos en volumen de datos
- **Rendimiento**: Consultas rápidas y eficientes
- **Mantenibilidad**: Estructura clara y bien documentada
- **Integridad**: Garantizar la consistencia de los datos
- **Seguridad**: Proteger la información financiera sensible

El uso de SQLModel proporciona una experiencia de desarrollo moderna y Pythonica, mientras que las características avanzadas de PostgreSQL aseguran un rendimiento y confiabilidad sólidos.
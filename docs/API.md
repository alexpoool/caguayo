# Documentación de la API de Caguayo

## Descripción General

La API de Caguayo es una API RESTful construida con FastAPI que expone las funcionalidades principales del sistema de gestión financiera. Proporciona endpoints para gestionar clientes, ventas, movimientos, liquidaciones, productos y otras entidades financieras.

## Características de la API

### 1. Diseño API-First

- **Documentación Abierta**: OpenAPI/Swagger automática
- **Esquemas Consistentes**: Esquemas Pydantic en ambos extremos
- **Validación**: Validación automática de entrada/salida
- **Documentación**: Documentación siempre actualizada

### 2. Características de Seguridad

- **Autenticación JWT**: Tokens de acceso seguros
- **Control de Acceso**: Control basado en roles
- **CORS**: Orígenes configurables
- **HTTPS**: En producción

### 3. Rendimiento

- **Async/Await**: Operaciones asíncronas nativas
- **Optimización de Rutas**: Rutas optimizadas para rendimiento
- **Caching**: Caching inteligente en la capa de aplicación

### 4. Observabilidad

- **Logging**: Logging estructurado
- **Métricas**: Métricas integradas
- **Tracing**: Seguimiento de solicitudes

## Información General de la API

### Información del Servidor

```json
{
  "title": "Caguayo API",
  "description": "API para gestión financiera y contable",
  "version": "1.0.0",
  "termsOfService": "",
  "contact": {
    "name": "Equipo de Desarrollo",
    "email": "dev@caguayo.com"
  },
  "license": {
    "name": "Propietaria",
    "url": ""
  },
  "servers": [
    {
      "url": "http://localhost:8000",
      "description": "Servidor de desarrollo"
    },
    {
      "url": "https://api.caguayo.com",
      "description": "Servidor de producción"
    }
  ]
}
```

### Información del Autor

```json
{
  "name": "Caguayo API",
  "url": "https://caguayo.com",
  "email": "dev@caguayo.com"
}
```

## Autenticación

### JWT Bearer Token

La mayoría de los endpoints requieren autenticación con JWT Bearer Token.

#### Ejemplo de Requisito de Autenticación

```http
GET /clientes HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Host: localhost:8000
```

#### Decodificación del Token

Los tokens JWT contienen los siguientes claims:

```json
{
  "sub": "usuario_id",
  "base_datos": "nombre_base_datos",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Ejemplo de Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## Modelos de Datos

### Cliente

#### ClienteCreate

```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE"
}
```

#### ClienteRead

```json
{
  "id": "uuid",
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### ClienteUpdate

```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE"
}
```

### Venta

#### VentaCreate

```json
{
  "cliente_id": "uuid",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
    {
      "producto_id": "uuid",
      "cantidad": 2,
      "precio_unitario": 500.00,
      "descuento": 0.00
    }
  ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos"
}
```

#### VentaRead

```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
    {
      "id": "uuid",
      "producto_id": "uuid",
      "cantidad": 2,
      "precio_unitario": 500.00,
      "descuento": 0.00,
      "subtotal": 1000.00
    }
  ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Movimiento

#### MovimientoCreate

```json
{
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "uuid",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE"
}
```

#### MovimientoRead

```json
{
  "id": "uuid",
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "uuid",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Liquidación

#### LiquidacionCreate

```json
{
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "uuid",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  }
}
```

#### LiquidacionRead

```json
{
  "id": "uuid",
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "id": "uuid",
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "uuid",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Endpoints de la API

### Clientes

#### GET /clientes

**Descripción**: Listar todos los clientes con paginación y filtrado opcional

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `tipo_relacion` (string, opcional): Filtrar por tipo_relacion (CLIENTE, PROVEEDOR, AMBAS)

**Ejemplo de Solicitud**:
```http
GET /clientes?skip=0&limit=10&tipo_relacion=CLIENTE HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "+1234567890",
    "direccion": "Calle Principal 123",
    "ciudad": "Ciudad de México",
    "estado": "CDMX",
    "codigo_postal": "01000",
    "rfc": "PEHJ890101ABC",
    "tipo_relacion": "CLIENTE",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /clientes

**Descripción**: Crear un nuevo cliente

**Cuerpo de la Solicitud**:
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE"
}
```

**Ejemplo de Solicitud**:
```http
POST /clientes HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE"
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "telefono": "+1234567890",
  "direccion": "Calle Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigo_postal": "01000",
  "rfc": "PEHJ890101ABC",
  "tipo_relacion": "CLIENTE",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### GET /clientes/search

**Descripción**: Buscar todos los clientes (sin paginación)

**Ejemplo de Solicitud**:
```http
GET /clientes/search HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "+1234567890",
    "direccion": "Calle Principal 123",
    "ciudad": "Ciudad de México",
    "estado": "CDMX",
    "codigo_postal": "01000",
    "rfc": "PEHJ890101ABC",
    "tipo_relacion": "CLIENTE",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Ventas

#### GET /ventas

**Descripción**: Listar todas las ventas con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `cliente_id` (string, opcional): Filtrar por cliente_id
- `fecha_inicio` (string, opcional): Filtrar por fecha_inicio (ISO 8601)
- `fecha_fin` (string, opcional): Filtrar por fecha_fin (ISO 8601)

**Ejemplo de Solicitud**:
```http
GET /ventas?skip=0&limit=10&cliente_id=550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "cliente_id": "550e8400-e29b-41d4-a716-446655440000",
    "fecha": "2024-01-15T10:30:00Z",
    "monto": 1500.00,
    "moneda": "MXN",
    "metodo_pago": "EFECTIVO",
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "producto_id": "550e8400-e29b-41d4-a716-446655440000",
        "cantidad": 2,
        "precio_unitario": 500.00,
        "descuento": 0.00,
        "subtotal": 1000.00
      }
    ],
    "impuestos": {
      "iva": 240.00,
      "ieps": 0.00
    },
    "observaciones": "Venta de productos",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /ventas

**Descripción**: Crear una nueva venta

**Cuerpo de la Solicitud**:
```json
{
  "cliente_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
    {
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 2,
      "precio_unitario": 500.00,
      "descuento": 0.00
    }
  ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos"
}
```

**Ejemplo de Solicitud**:
```http
POST /ventas HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "cliente_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
    {
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 2,
      "precio_unitario": 500.00,
      "descuento": 0.00
    }
  ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos"
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cliente_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "producto_id": "550e8400-e29b-41d4-a716-446655440000",
        "cantidad": 2,
        "precio_unitario": 500.00,
        "descuento": 0.00,
        "subtotal": 1000.00
      }
    ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /ventas/{id}

**Descripción**: Obtener una venta específica por ID

**Parámetros de Ruta**:
- `id` (string): ID de la venta

**Ejemplo de Solicitud**:
```http
GET /ventas/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cliente_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo_pago": "EFECTIVO",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 2,
      "precio_unitario": 500.00,
      "descuento": 0.00,
      "subtotal": 1000.00
    }
  ],
  "impuestos": {
    "iva": 240.00,
    "ieps": 0.00
  },
  "observaciones": "Venta de productos",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Movimientos

#### GET /movimientos

**Descripción**: Listar todos los movimientos con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `tipo` (string, opcional): Filtrar por tipo (INGRESO, EGRESO)
- `fecha_inicio` (string, opcional): Filtrar por fecha_inicio (ISO 8601)
- `fecha_fin` (string, opcional): Filtrar por fecha_fin (ISO 8601)

**Ejemplo de Solicitud**:
```http
GET /movimientos?skip=0&limit=10&tipo=INGRESO HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tipo": "INGRESO",
    "fecha": "2024-01-15T10:30:00Z",
    "monto": 5000.00,
    "moneda": "MXN",
    "descripcion": "Depósito en cuenta",
    "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
    "metodo": "TRANSFERENCIA",
    "referencia": "REF-12345",
    "cuenta_origen": "AHORROS",
    "cuenta_destino": "CORRIENTE",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /movimientos

**Descripción**: Crear un nuevo movimiento

**Cuerpo de la Solicitud**:
```json
{
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE"
}
```

**Ejemplo de Solicitud**:
```http
POST /movimientos HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE"
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /movimientos/{id}

**Descripción**: Obtener un movimiento específico por ID

**Parámetros de Ruta**:
- `id` (string): ID del movimiento

**Ejemplo de Solicitud**:
```http
GET /movimientos/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "INGRESO",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 5000.00,
  "moneda": "MXN",
  "descripcion": "Depósito en cuenta",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "metodo": "TRANSFERENCIA",
  "referencia": "REF-12345",
  "cuenta_origen": "AHORROS",
  "cuenta_destino": "CORRIENTE",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Liquidaciones

#### GET /liquidaciones

**Descripción**: Listar todas las liquidaciones con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `fecha_inicio` (string, opcional): Filtrar por fecha_inicio (ISO 8601)
- `fecha_fin` (string, opcional): Filtrar por fecha_fin (ISO 8601)

**Ejemplo de Solicitud**:
```http
GET /liquidaciones?skip=0&limit=10 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fecha": "2024-01-15T10:30:00Z",
    "monto_total": 10000.00,
    "moneda": "MXN",
    "descripcion": "Liquidación mensual",
    "periodo_inicio": "2024-01-01",
    "periodo_fin": "2024-01-31",
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "tipo": "SERVICIO",
        "monto": 3000.00,
        "producto_id": "550e8400-e29b-41d4-a716-446655440000",
        "cantidad": 1,
        "observaciones": "Consultoría"
      }
    ],
    "impuestos": {
      "iva": 600.00,
      "otros": 100.00
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /liquidaciones

**Descripción**: Crear una nueva liquidación

**Cuerpo de la Solicitud**:
```json
{
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  }
}
```

**Ejemplo de Solicitud**:
```http
POST /liquidaciones HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  }
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /liquidaciones/{id}

**Descripción**: Obtener una liquidación específica por ID

**Parámetros de Ruta**:
- `id` (string): ID de la liquidación

**Ejemplo de Solicitud**:
```http
GET /liquidaciones/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto_total": 10000.00,
  "moneda": "MXN",
  "descripcion": "Liquidación mensual",
  "periodo_inicio": "2024-01-01",
  "periodo_fin": "2024-01-31",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tipo": "SERVICIO",
      "monto": 3000.00,
      "producto_id": "550e8400-e29b-41d4-a716-446655440000",
      "cantidad": 1,
      "observaciones": "Consultoría"
    }
  ],
  "impuestos": {
    "iva": 600.00,
    "otros": 100.00
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Productos

#### GET /productos

**Descripción**: Listar todos los productos con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `categoria_id` (string, opcional): Filtrar por categoria_id
- `activo` (boolean, opcional): Filtrar por activo

**Ejemplo de Solicitud**:
```http
GET /productos?skip=0&limit=10&activo=true HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Producto A",
    "descripcion": "Producto A de ejemplo",
    "precio": 100.00,
    "costo": 80.00,
    "sku": "PROD-001",
    "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
    "activo": true,
    "stock": 100,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /productos

**Descripción**: Crear un nuevo producto

**Cuerpo de la Solicitud**:
```json
{
  "nombre": "Producto A",
  "descripcion": "Producto A de ejemplo",
  "precio": 100.00,
  "costo": 80.00,
  "sku": "PROD-001",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "activo": true,
  "stock": 100
}
```

**Ejemplo de Solicitud**:
```http
POST /productos HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "nombre": "Producto A",
  "descripcion": "Producto A de ejemplo",
  "precio": 100.00,
  "costo": 80.00,
  "sku": "PROD-001",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "activo": true,
  "stock": 100
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Producto A",
  "descripcion": "Producto A de ejemplo",
  "precio": 100.00,
  "costo": 80.00,
  "sku": "PROD-001",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "activo": true,
  "stock": 100,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### GET /productos/{id}

**Descripción**: Obtener un producto específico por ID

**Parámetros de Ruta**:
- `id` (string): ID del producto

**Ejemplo de Solicitud**:
```http
GET /productos/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Producto A",
  "descripcion": "Producto A de ejemplo",
  "precio": 100.00,
  "costo": 80.00,
  "sku": "PROD-001",
  "categoria_id": "550e8400-e29b-41d4-a716-446655440000",
  "activo": true,
  "stock": 100,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Dependencias

#### GET /dependencias

**Descripción**: Listar todas las dependencias con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `tipo_entidad_id` (string, opcional): Filtrar por tipo_entidad_id

**Ejemplo de Solicitud**:
```http
GET /dependencias?skip=0&limit=10 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Dependencia A",
    "descripcion": "Dependencia A de ejemplo",
    "tipo_entidad_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /dependencias

**Descripción**: Crear una nueva dependencia

**Cuerpo de la Solicitud**:
```json
{
  "nombre": "Dependencia A",
  "descripcion": "Dependencia A de ejemplo",
  "tipo_entidad_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo de Solicitud**:
```http
POST /dependencias HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "nombre": "Dependencia A",
  "descripcion": "Dependencia A de ejemplo",
  "tipo_entidad_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Dependencia A",
  "descripcion": "Dependencia A de ejemplo",
  "tipo_entidad_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### GET /dependencias/{id}

**Descripción**: Obtener una dependencia específica por ID

**Parámetros de Ruta**:
- `id` (string): ID de la dependencia

**Ejemplo de Solicitud**:
```http
GET /dependencias/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Dependencia A",
  "descripcion": "Dependencia A de ejemplo",
  "tipo_entidad_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Pagos

#### GET /pagos

**Descripción**: Listar todos los pagos con paginación

**Parámetros de Consulta**:
- `skip` (integer, opcional): Número de elementos a saltar (default: 0)
- `limit` (integer, opcional): Número máximo de elementos (default: 10000, máximo: 100000)
- `fecha_inicio` (string, opcional): Filtrar por fecha_inicio (ISO 8601)
- `fecha_fin` (string, opcional): Filtrar por fecha_fin (ISO 8601)
- `metodo` (string, opcional): Filtrar por metodo (EFECTIVO, TRANSFERENCIA, TARJETA)

**Ejemplo de Solicitud**:
```http
GET /pagos?skip=0&limit=10&metodo=EFECTIVO HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fecha": "2024-01-15T10:30:00Z",
    "monto": 1500.00,
    "moneda": "MXN",
    "metodo": "EFECTIVO",
    "descripcion": "Pago de servicios",
    "venta_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /pagos

**Descripción**: Crear un nuevo pago

**Cuerpo de la Solicitud**:
```json
{
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo": "EFECTIVO",
  "descripcion": "Pago de servicios",
  "venta_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo de Solicitud**:
```http
POST /pagos HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo": "EFECTIVO",
  "descripcion": "Pago de servicios",
  "venta_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo": "EFECTIVO",
  "descripcion": "Pago de servicios",
  "venta_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /pagos/{id}

**Descripción**: Obtener un pago específico por ID

**Parámetros de Ruta**:
- `id` (string): ID del pago

**Ejemplo de Solicitud**:
```http
GET /pagos/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Ejemplo de Respuesta**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha": "2024-01-15T10:30:00Z",
  "monto": 1500.00,
  "moneda": "MXN",
  "metodo": "EFECTIVO",
  "descripcion": "Pago de servicios",
  "venta_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Endpoints de Utilidad

### GET /health

**Descripción**: Verificar el estado del servicio

**Ejemplo de Solicitud**:
```http
GET /health HTTP/1.1
```

**Ejemplo de Respuesta**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /

**Descripción**: Obtener mensaje de bienvenida

**Ejemplo de Solicitud**:
```http
GET / HTTP/1.1
```

**Ejemplo de Respuesta**:
```json
{
  "message": "API de Caguayo funcionando"
}
```

## Manejo de Errores

### Errores Comunes

#### 400 Bad Request

**Descripción**: La solicitud es inválida

**Ejemplo de Respuesta**:
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "nombre"],
      "msg": "El nombre debe tener al menos 2 caracteres",
      "ctx": {"min_length": 2}
    }
  ]
}
```

#### 401 Unauthorized

**Descripción**: Se requiere autenticación

**Ejemplo de Respuesta**:
```json
{
  "detail": "No autorizado"
}
```

#### 403 Forbidden

**Descripción**: No tiene permiso para acceder a este recurso

**Ejemplo de Respuesta**:
```json
{
  "detail": "Prohibido"
}
```

#### 404 Not Found

**Descripción**: Recurso no encontrado

**Ejemplo de Respuesta**:
```json
{
  "detail": "Cliente no encontrado"
}
```

#### 500 Internal Server Error

**Descripción**: Error interno del servidor

**Ejemplo de Respuesta**:
```json
{
  "detail": "Error interno del servidor"
}
```

## Documentación de la API

### OpenAPI/Swagger

La API está documentada automáticamente con OpenAPI. Puede acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Ejemplo de Swagger UI

```
http://localhost:8000/docs
```

### Ejemplo de ReDoc

```
http://localhost:8000/redoc
```

## Ejemplos de Cliente

### Cliente de Python

```python
import httpx
import asyncio

async def ejemplo_cliente():
    async with httpx.AsyncClient() as client:
        # Autenticación
        login_data = {
            "username": "usuario",
            "password": "contraseña"
        }
        
        # Obtener token
        response = await client.post(
            "http://localhost:8000/auth/token",
            data=login_data
        )
        token = response.json()["access_token"]
        
        # Listar clientes
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(
            "http://localhost:8000/clientes",
            headers=headers
        )
        clientes = response.json()
        
        print(f"Encontrados {len(clientes)} clientes")

asyncio.run(ejemplo_cliente())
```

### Cliente de JavaScript (fetch)

```javascript
async function ejemploCliente() {
    // Autenticación
    const loginResponse = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'usuario',
            password: 'contraseña'
        })
    });
    
    const { access_token } = await loginResponse.json();
    
    // Listar clientes
    const clientesResponse = await fetch('http://localhost:8000/clientes', {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const clientes = await clientesResponse.json();
    console.log(`Encontrados ${clientes.length} clientes`);
}

ejemploCliente();
```

### Cliente de curl

```bash
# Obtener token
curl -X POST "http://localhost:8000/auth/token" \
     -H "Content-Type: application/json" \
     -d '{"username": "usuario", "password": "contraseña"}'

# Listar clientes (con token)
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
curl -X GET "http://localhost:8000/clientes" \
     -H "Authorization: Bearer $TOKEN"
```

## Conclusión

La API de Caguayo proporciona una interfaz RESTful completa y bien documentada para el sistema de gestión financiera. Características clave:

1. **Documentación Automática**: OpenAPI/Swagger siempre actualizada
2. **Seguridad Robusta**: Autenticación JWT y control de acceso
3. **Validación**: Validación de esquemas automática
4. **Rendimiento**: Operaciones asíncronas y optimizadas
5. **Observabilidad**: Logging y métricas integrados
6. **Facilidad de Uso**: Ejemplos de clientes y documentación completa

La API está diseñada para ser fácil de usar, segura y escalable, proporcionando una base sólida para el sistema de gestión financiera.
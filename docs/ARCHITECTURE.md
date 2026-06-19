# Arquitectura del Sistema Caguayo

## Descripción General

Caguayo utiliza una arquitectura de tres capas bien definida que separa las preocupaciones y promueve el mantenimiento, la escalabilidad y las pruebas efectivas.

## Arquitectura de Capas

### 1. Capa de Presentación (Frontend)

**Ubicación**: `frontend/src/`

**Responsabilidades**:
- Interacción con el usuario
- Renderizado de componentes de UI
- Gestión del estado de la aplicación
- Comunicación con la API

**Componentes Principales**:
- **Componentes**: UI reutilizables (botones, formularios, tablas)
- **Páginas**: Vistas de alto nivel para diferentes funcionalidades
- **Hooks**: Lógica personalizada reutilizable
- **Configuración**: Vite, Tailwind CSS, TypeScript

### 2. Capa de Aplicación (API Gateway)

**Ubicación**: `backend/main.py`

**Responsabilidades**:
- Punto de entrada de la API
- Middlewares globales
- Configuración CORS
- Logging y monitoreo
- Manejo de errores

**Componentes Principales**:
- **FastAPI**: Framework principal de la API
- **Middlewares**: LoggingMiddleware, database_middleware
- **Rutas**: API principal a través de api_router
- **Configuración**: Variables de entorno, CORS, logging

### 3. Capa de Negocio (Servicios)

**Ubicación**: `backend/src/services/`

**Responsabilidades**:
- Lógica de negocio principal
- Validación de reglas de negocio
- Coordinación entre repositorios y modelos
- Operaciones complejas (cálculos, transacciones)

**Componentes Principales**:
- **ClienteService**: Operaciones CRUD de clientes
- **VentaService**: Lógica de ventas y facturación
- **LiquidacionService**: Procesamiento de liquidaciones
- **MovimientoService**: Gestión de transacciones

### 4. Capa de Datos (Persistencia)

**Ubicación**: `backend/src/`

**Responsabilidades**:
- Acceso a la base de datos
- Consultas CRUD
- Manejo de transacciones
- Relaciones entre entidades

**Componentes Principales**:
- **Modelos**: SQLModel para todas las entidades
- **Repositorios**: Acceso a datos abstracto
- **Conexión**: Configuración de base de datos y sesiones
- **Migraciones**: Alembic para cambios de esquema

## Patrones de Diseño

### 1. Repository Pattern

**Ubicación**: `backend/src/repository/`

**Propósito**: Abstraer el acceso a la base de datos de la lógica de negocio

```python
# Ejemplo de uso
from src.repository.cliente_repository import ClienteRepository

async def get_cliente_por_id(cliente_id: str):
    repo = ClienteRepository()
    return await repo.find_by_id(cliente_id)
```

### 2. Service Layer Pattern

**Ubicación**: `backend/src/services/`

**Propósito**: Coordinar operaciones complejas y aplicar reglas de negocio

```python
# Ejemplo de uso
from src.services.cliente_service import ClienteService

async def crear_nuevo_cliente(cliente_data):
    service = ClienteService()
    return await service.create_cliente(cliente_data)
```

### 3. DTO Pattern

**Ubicación**: `backend/src/dto/`

**Propósito**: Validar y transferir datos entre capas

```python
# Ejemplo de DTO
from pydantic import BaseModel

class ClienteCreate(BaseModel):
    nombre: str
    email: str
    tipo_relacion: str = "CLIENTE"
```

### 4. Command Query Responsibility Segregation (CQRS)

**Ubicación**: Implementado en varios servicios

**Propósito**: Separar operaciones de lectura y escritura

- **Consultas**: Operaciones de solo lectura (GET)
- **Comandos**: Operaciones de escritura (POST, PUT, DELETE)

## Relaciones entre Capas

```
┌─────────────────────────────────────────────────────────┐
│                    Capa de Presentación                │
│  React + TypeScript                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Aplicación                    │
│  FastAPI + Middlewares                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Negocio                       │
│  Servicios + Patrones de Diseño                        │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Capa de Datos                         │
│  SQLModel + Repositorios + Migraciones                 │
└─────────────────────────────────────────────────────────┘
```

## Patrones de Comunicación

### 1. API-First Design

- Todas las rutas de la API están definidas en `backend/src/routes/`
- Documentación OpenAPI automática
- Esquemas consistentes entre cliente y servidor

### 2. Event-Driven (Limitado)

- Actualmente síncrono, con posibles integraciones futuras
- Logging estructurado para posibles eventos
- Middlewares para procesamiento asíncrono

## Tecnologías por Capa

### Capa de Presentación
- **Framework**: React 18
- **Runtime**: Vite
- **Estilos**: Tailwind CSS + Ant Design
- **Estado**: TanStack Query
- **Tipado**: TypeScript

### Capa de Aplicación
- **Framework**: FastAPI
- **Autenticación**: JWT con jose
- **Middlewares**: CORS, Logging, Database
- **Documentación**: OpenAPI automática

### Capa de Negocio
- **Validación**: Pydantic
- **Logging**: logging estándar de Python
- **Manejo de Errores**: HTTPException
- **Transacciones**: Manejo manual de sesiones

### Capa de Datos
- **ORM**: SQLModel (sobreescribe SQLAlchemy)
- **Migraciones**: Alembic
- **Base de Datos**: PostgreSQL/MySQL
- **Sesiones**: AsyncSession de SQLModel

## Consideraciones de Diseño

### 1. Separación de Preocupaciones

- Cada capa tiene responsabilidades claras
- Mínima dependencia entre capas
- Facilidad para reemplazar componentes

### 2. Pruebabilidad

- Inyección de dependencias para servicios
- Sesiones de base de datos mockeables
- Componentes UI probables de forma aislada

### 3. Escalabilidad

- Separación clara permite escalar capas independientemente
- Base de datos como servicio externo
- Cacheo posible para capas de lectura intensiva

### 4. Seguridad

- Autenticación JWT con control de acceso por base de datos
- Middlewares de seguridad globales
- Validación de entrada en ambos extremos

## Documentación de Arquitectura

### Diagramas de Arquitectura

- **Diagrama de Arquitectura**: `docs/architecture/architecture-diagram.png`
- **Diagrama de Componentes**: `docs/architecture/components-diagram.png`
- **Diagrama de Datos**: `docs/architecture/data-flow-diagram.png`

### Guías de Arquitectura

- **Guía de Diseño**: `docs/architecture/design-guidelines.md`
- **Guía de Seguridad**: `docs/architecture/security-guide.md`
- **Guía de Escalabilidad**: `docs/architecture/scalability-guide.md`

## Evolución de la Arquitectura

### Versiones Anteriores

- **v1.0**: Arquitectura monolítica (eliminada)
- **v2.0**: Arquitectura de tres capas (actual)

### Futuras Mejoras

1. **Microservicios**: Separar servicios de alto nivel
2. **Event Sourcing**: Para auditabilidad financiera
3. **CQRS Completo**: Separación total de consultas y comandos
4. **API Gateway**: Para routing y rate limiting avanzado

## Métricas de Calidad Arquitectónica

### 1. Acoplamiento

- **Objetivo**: Bajo acoplamiento entre capas
- **Métrica**: Número de imports cruzados de capas
- **Estado Actual**: Aceptable, con algunos imports necesarios

### 2. Cohesión

- **Objetivo**: Alto acoplamiento dentro de cada capa
- **Métrica**: Número de responsabilidades por módulo
- **Estado Actual**: Buena cohesión en la mayoría de módulos

### 3. Dependencia Inversión

- **Objetivo**: Dependencias hacia abstracciones, no concreciones
- **Métrica**: Uso de interfaces e inyección de dependencias
- **Estado Actual**: Parcialmente implementado

## Conclusión

La arquitectura actual de Caguayo proporciona un buen equilibrio entre:

- **Mantenimiento**: Código organizado y fácil de entender
- **Escalabilidad**: Capas independientes para escalado selectivo
- **Pruebabilidad**: Componentes aislables
- **Seguridad**: Control de acceso y validación robustos

La arquitectura está bien posicionada para el crecimiento futuro y la adición de nuevas funcionalidades.
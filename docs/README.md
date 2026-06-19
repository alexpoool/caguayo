# Caguayo - Sistema de Gestión Financiera

## Descripción General

Caguayo es un sistema completo de gestión financiera y contable diseñado para manejar operaciones complejas relacionadas con clientes, ventas, liquidaciones, movimientos y transacciones financieras. El sistema está construido con una arquitectura moderna que separa claramente la lógica de negocio, la persistencia de datos y la interfaz de usuario.

## Características Principales

- **Gestión de Clientes**: Clientes naturales y jurídicas con diferentes tipos de relaciones
- **Control de Ventas**: Facturación, ventas al efectivo y gestión de productos
- **Liquidaciones**: Procesamiento de liquidaciones financieras complejas
- **Movimientos**: Registro y seguimiento de transacciones financieras
- **Dependencias**: Gestión de dependencias y conexiones entre entidades
- **Reportes y Análisis**: Visualización de datos financieros y reportes
- **Autenticación**: Seguridad JWT con control de acceso basado en roles
- **Multi-base de Datos**: Capacidad para trabajar con múltiples bases de datos

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  - Interfaces de usuario modernas y responsivas        │
│  - Manejo de estado con React Query                   │
│  - Validación de formularios                           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (FastAPI)                │
│  - Documentación automática con OpenAPI                │
│  - Middlewares de logging y autenticación              │
│  - Control de rate limiting                           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   Lógica de Negocio                    │
│  - Servicios y casos de uso                           │
│  - Validación de reglas de negocio                     │
│  - Lógica de cálculo financiero                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   Persistencia de Datos                │
│  - SQLModel con PostgreSQL/MySQL                       │
│  - Migraciones con Alembic                             │
│  - Relaciones complejas entre entidades                │
└─────────────────────────────────────────────────────────┘
```

## Tecnologías Utilizadas

### Backend (Python)
- **Framework**: FastAPI - API REST moderna y rápida
- **Base de Datos**: SQLModel (ORM sobre SQLAlchemy)
- **Migraciones**: Alembic
- **Autenticación**: JWT con `python-jose`
- **Logging**: Configuración estructurada con `logging`
- **CORS**: FastAPI CORSMiddleware
- **Entorno**: Variables de entorno con `python-dotenv`

### Frontend (TypeScript)
- **Framework**: React 18 con Vite
- **Routing**: React Router DOM
- **Estado**: TanStack Query (React Query)
- **UI**: Ant Design 6
- **Estilos**: Tailwind CSS con PostCSS
- **Type Safety**: TypeScript
- **Linter**: ESLint con TypeScript plugin
- **Build Tool**: Vite

### Otros
- **Control de Versiones**: Git
- **Contenedores**: Docker (configurado)
- **CI/CD**: GitHub Actions (.github/workflows)
- **Análisis**: code-review-graph para métricas

## Rutas Principales de la API

### Clientes
- `GET /clientes` - Listar clientes con paginación
- `POST /clientes` - Crear nuevo cliente
- `GET /clientes/search` - Buscar clientes

### Ventas
- `GET /ventas` - Listar ventas
- `POST /ventas` - Crear venta
- `GET /ventas/{id}` - Obtener venta específica

### Movimientos
- `GET /movimientos` - Listar movimientos
- `POST /movimientos` - Crear movimiento
- `GET /movimientos/{id}` - Obtener movimiento específico

### Liquidaciones
- `GET /liquidaciones` - Listar liquidaciones
- `POST /liquidaciones` - Crear liquidación
- `GET /liquidaciones/{id}` - Obtener liquidación específica

### Productos
- `GET /productos` - Listar productos
- `POST /productos` - Crear producto
- `GET /productos/{id}` - Obtener producto específico

### Dependencias
- `GET /dependencias` - Listar dependencias
- `POST /dependencias` - Crear dependencia
- `GET /dependencias/{id}` - Obtener dependencia específica

### Pagos
- `GET /pagos` - Listar pagos
- `POST /pagos` - Crear pago
- `GET /pagos/{id}` - Obtener pago específico

## Modelos de Datos Principales

### Clientes
- **Cliente**: Entidad base para clientes
- **ClienteNatural**: Información de clientes individuales
- **ClienteJuridica**: Información de empresas

### Ventas
- **Venta**: Encabezado de venta
- **DetalleVenta**: Detalles de productos en venta
- **ItemVentaEfectivo**: Items de venta al efectivo

### Movimientos
- **Movimiento**: Registro de transacciones financieras
- **Transaccion**: Transacciones individuales
- **Liquidacion**: Procesamiento de liquidaciones

### Productos
- **Producto**: Catálogo de productos
- **AnexoProducto**: Anexos relacionados a productos

### Finanzas
- **Cuenta**: Cuentas bancarias
- **Moneda**: Tipos de moneda
- **Pago**: Registros de pago

## Configuración del Entorno

### Variables de Entorno

Cree un archivo `.env` en el directorio raíz con las siguientes variables:

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@localhost/dbname

# Servidor Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Seguridad
SECRET_KEY=su-clave-secreta-aqui
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Otros
ENV=development
```

### Instalación

```bash
# Backend
dé cd backend
python -m pip install -r requirements.txt

# Frontend
dé cd frontend
pnpm install
```

### Ejecución

```bash
# Backend
dé cd backend
python main.py

# Frontend
dé cd frontend
pnpm dev
```

## Estructura del Proyecto

```
/backend/
├── alembic/              # Migraciones de base de datos
│   ├── versions/        # Versiones de migraciones
│   └── alembic.ini      # Configuración de Alembic
├── scripts/             # Scripts de utilidad
├── sql/                # Scripts SQL
├── src/                # Código fuente principal
│   ├── core/           # Lógica central
│   ├── database/       # Conexión y configuración DB
│   ├── domain/         # Modelos de dominio
│   ├── dto/            # Objetos de transferencia de datos
│   ├── middleware/     # Middlewares
│   ├── models/         # Modelos SQLModel
│   ├── repository/     # Repositorios
│   ├── routes/         # Rutas de la API
│   ├── services/       # Servicios de negocio
│   └── utils/          # Utilidades
├── tests/              # Pruebas
├── .env.example        # Ejemplo de variables de entorno
├── .gitignore         # Archivos ignorados por git
├── main.py           # Punto de entrada
├── pyproject.toml    # Configuración del proyecto
├── requirements.txt  # Dependencias
└── uv.lock          # Bloqueo de dependencias

/frontend/
├── public/           # Archivos estáticos
├── src/             # Código fuente
│   ├── components/  # Componentes de UI
│   ├── hooks/       # Hooks personalizados
│   ├── pages/       # Páginas
│   └── styles/      # Estilos
├── .env.example     # Ejemplo de variables de entorno
├── .gitignore      # Archivos ignorados por git
├── index.html      # Página de inicio
├── package.json    # Configuración del proyecto
├── pnpm-lock.yaml  # Bloqueo de dependencias
└── vite.config.ts  # Configuración de Vite
```

## Áreas Más Cargadas

Basado en el análisis del código, las áreas más activas del sistema son:

1. **Gestión de Clientes** (`backend/src/routes/clientes.py`)
   - Mayor número de endpoints
   - Lógica compleja de servicios
   - Múltiples modelos relacionados

2. **Procesamiento de Ventas** (`backend/src/routes/ventas_operaciones.py`)
   - Operaciones financieras complejas
   - Cálculos de impuestos y comisiones
   - Integración con múltiples productos

3. **Liquidaciones Financieras** (`backend/src/routes/liquidaciones.py`)
   - Procesamiento de datos masivos
   - Cálculos contables complejos
   - Validación de reglas de negocio

4. **Control de Inventario** (`backend/src/routes/existencias.py`)
   - Actualización en tiempo real
   - Concurrencia de datos
   - Múltiples ubicaciones

## Problemas Actuales del Sistema

### Problemas Técnicos

1. **Escalabilidad**: El sistema puede enfrentar limitaciones con grandes volúmenes de datos
2. **Concurrencia**: Los problemas de concurrencia en transacciones financieras no están completamente resueltos
3. **Monitoreo**: La monitorización en tiempo real de transacciones es limitada
4. **Documentación**: La documentación de la API está parcialmente incompleta

### Limitaciones Operativas

1. **Procesamiento Síncrono**: Muchas operaciones son síncronas y pueden bloquearse
2. **Validación de Datos**: La validación en tiempo real es limitada para algunos casos
3. **Reportes**: Los reportes personalizados tienen funcionalidades limitadas
4. **Exportación**: Las opciones de exportación son básicas

### Áreas de Mejora

1. **Interfaz de Usuario**: Algunas interfaces podrían ser más intuitivas
2. **Tiempo de Carga**: Algunas páginas tardan en cargar con grandes conjuntos de datos
3. **Manejo de Errores**: Los mensajes de error podrían ser más claros
4. **Funcionalidades Móviles**: La versión móvil tiene algunas limitaciones

## Mantenimiento y Actualizaciones

### Actualizaciones de Dependencias

- Mantener actualizadas las dependencias principales
- Revisar regularmente los informes de seguridad
- Actualizar TypeScript y dependencias relacionadas

### Prácticas de Desarrollo

1. **Pruebas**: Escribir pruebas unitarias y de integración
2. **Revisión de Código**: Usar code-review-graph para métricas
3. **Linter**: Ejecutar `pnpm run lint` regularmente
4. **Format**: Mantener el código formateado consistentemente

### Copias de Seguridad

- Realizar copias de seguridad regulares de la base de datos
- Documentar el esquema de la base de datos
- Mantener registros de cambios

## Contribución

### Guía de Estilo

- Seguir el estilo de código existente
- Usar TypeScript para el frontend
- Escribir docstrings para funciones y clases
- Mantener los nombres de variables en snake_case (backend) o camelCase (frontend)

### Proceso de PR

1. Crear rama desde `develop`
2. Escribir pruebas para nuevas funcionalidades
3. Ejecutar lint y typecheck
4. Hacer commit con mensaje descriptivo
5. Crear PR con descripción detallada
6. Revisar código y resolver comentarios

## Contacto y Soporte

Para problemas con el sistema, contactar con:
- Revisar los registros de errores en `/backend/logs/`
- Usar la interfaz de administración en `/admin/`
- Contactar al equipo de soporte técnico

## Licencia

Este proyecto está bajo licencia propietaria. Contactar con el equipo de desarrollo para obtener información de licencia.
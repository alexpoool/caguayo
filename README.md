# Caguayo Application

This repository contains the Caguayo application, a comprehensive inventory and management system built with FastAPI (Python backend) and React (frontend).

## Project Structure

- `backend/` - Python backend application
- `frontend/` - React frontend application
- `backend/scripts/` - Database management scripts
- `.env.example` - Plantilla de variables de entorno
- `scripts/setup.sh` - Script de setup para nueva PC (ver sección Setup)
- `scripts/dev.sh` - Script de desarrollo (menú start / stop / restart / status)

## Tecnologías

### Backend
- **FastAPI**: Framework web moderno y rápido para construir APIs con Python.
- **SQLModel**: ORM híbrido que combina SQLAlchemy y Pydantic.
- **PostgreSQL**: Base de datos relacional robusta.
- **Alembic**: Herramienta de migración de base de datos.
- **AsyncPG**: Driver asíncrono para PostgreSQL.
- **UV**: Gestor de paquetes y proyectos de Python ultra rápido.

### Frontend
- **React**: Biblioteca para construir interfaces de usuario.
- **TypeScript**: Superset de JavaScript con tipado estático.
- **Vite**: Herramienta de construcción frontend de próxima generación.
- **Tailwind CSS**: Framework CSS de utilidad primero.
- **React Query**: Gestión de estado del servidor en aplicaciones React.
- **pnPM**: Gestor de paquetes eficiente.

## Prerrequisitos

- Python 3.13+
- Node.js 20+
- PostgreSQL 16+
- `uv` (instalar: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- `pnpm` (instalar: `npm install -g pnpm`)
- `tmux` (para el script de inicio rápido)

## Configuración inicial de PostgreSQL

### 1. Crear la base de datos

```bash
psql -U postgres -h localhost -p 5432

CREATE DATABASE caguayo_inventario;

\q
```

### 2. Crear usuario lector (opcional pero necesario para algunas funcionalidades)

```bash
psql -U postgres -h localhost -p 5432

CREATE USER usuariolector WITH PASSWORD 'usuariolector123';

GRANT CONNECT ON DATABASE caguayo_inventario TO usuariolector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO usuariolector;

\du usuariolector
```

### 3. Inicializar la base de datos manualmente

Para crear el esquema y datos iniciales:

```bash
# 1. Crear la base de datos (si no existe)
psql -U postgres -h localhost -c "CREATE DATABASE caguayosa;"

# 2. Ejecutar migraciones de Alembic (crea tablas + seeds genéricos)
cd backend
uv run alembic upgrade head

# 3. Inicializar datos de oficina principal (admin, convenio base)
uv run python -m scripts.init_office caguayosa
```

**Notas:**

- El nombre de la base de datos (`caguayosa`) debe coincidir con el de `backend/.env` (variable `DATABASE_URL`).
- Las migraciones de Alembic crean todas las tablas e insertan los seeds genéricos (monedas, provincias, municipios, tipos, etc).
- `init_office.py` crea los datos específicos de la oficina principal (dependencia matriz, usuario admin, convenio base).
- Para re-inicializar desde cero:

  ```bash
  psql -U postgres -h localhost -d caguayosa -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  cd backend
  uv run alembic upgrade head
  uv run python -m scripts.init_office caguayosa
  ```

## Setup en nueva PC

### Instalación automática (recomendado)

```bash
git clone <repo-url>
cd caguayo
./scripts/setup.sh
```

El script `setup.sh` hace todo automáticamente:

1. Verifica prerequisitos (uv, pnpm, psql)
2. Crea `.env` con valores generados aleatoriamente
3. Verifica conexión a PostgreSQL
4. Crea bases de datos (auth + central)
5. Ejecuta migraciones Alembic
6. Inicializa datos de oficina (admin, dependencia matriz)

**Credenciales por defecto:**

| Campo | Valor |
|-------|-------|
| Usuario | admin |
| Contraseña | Admin123@ |

> **Importante**: Cambiar la contraseña del admin en el primer inicio de sesión.

### Instalación manual

```bash
# 1. Copiar y configurar .env
cp .env.example .env
# Editar .env con tus valores (SECRET_KEY, POSTGRES_PASSWORD, etc.)

# 2. Crear bases de datos
psql -U postgres -c "CREATE DATABASE caguayo;"
psql -U postgres -c "CREATE DATABASE caguayosa;"

# 3. Aplicar migraciones
cd backend
DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/caguayosa" uv run alembic upgrade head
DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/caguayo" uv run alembic upgrade head

# 4. Inicializar datos de oficina
uv run python -m scripts.init_office caguayosa
uv run python -m scripts.init_office caguayo

# 5. Iniciar el sistema
cd ..
./scripts/dev.sh
```

### Variables de entorno importantes

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AUTH_DATABASE` | BD principal de autenticación | `caguayo` |
| `CENTRAL_DATABASE` | BD central para replicar esquema a tenants | `caguayosa` |
| `SECRET_KEY` | Clave secreta para JWT | `(generada por setup.sh)` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `(generada por setup.sh)` |

### Crear tenant nuevo (multi-tenant)

Para crear una nueva base de datos de tenant (ej: `caguayo_sa`):

**Desde el panel admin:**
1. Ir a Administración → Dependencias
2. Crear nueva dependencia con `base_datos = caguayo_sa`
3. Se crea automáticamente con esquema replicado + catálogos

**Manualmente:**
```bash
cd backend
uv run python -c "
from src.services.database_service import DatabaseService
DatabaseService.crear_base_datos('caguayo_sa', init_office=True)
"
```

Esto ejecuta:
1. `CREATE DATABASE caguayo_sa`
2. `pg_dump --schema-only` desde BD central → crea esquema
3. `alembic stamp head` (marca sin ejecutar migraciones)
4. Replicar catálogos (monedas, tipos, provincias, etc.)
5. `init_office` (admin user, dependencia matriz)

## Usuario Superadministrador

Al inicializar la base de datos con `init_office.py`, se crea automáticamente un super usuario:

| Campo | Valor |
|-------|-------|
| **Alias** | admin |
| **Contraseña** | Admin123@ |
| **Grupo** | ADMINISTRADOR (acceso total) |
| **Dependencia** | Caguayo Matriz |

**Importante**: Cambiar la contraseña en el primer inicio de sesión.

## Database Setup

The application uses PostgreSQL as the database. The schema and seed data are created with Alembic and `scripts/init_office.py`.

### Inicio rápido

1. Configure environment (first time only):
   ```bash
   cp .env.example .env
   # Edit .env and set SECRET_KEY and POSTGRES_PASSWORD
   ```

2. Aplicar migraciones e inicializar datos de oficina (ver *Database Initialization* más abajo).

3. Levantar el sistema con `./scripts/dev.sh` (ver *Ejecutar el sistema*).

   Servicios disponibles:
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

### Database Initialization

During setup, the following runs automatically:

1. Creates the database
2. Runs `alembic upgrade head` (creates all tables + generic seeds)
3. Executes `init_office.py` (creates admin user, main office data)

The seed data is split into two parts:

**Generic seeds** (applied by Alembic migration `seed_generic_data`):
- Monedas (USD, EUR)
- Tipos de contrato, convenio, movimiento
- Estados de contrato
- Provincias y municipios de Cuba
- Grupo ADMINISTRADOR with all permissions
- Funcionalidades del sistema

**Office data** (applied by `scripts/init_office.py`):
- Main dependency (Caguayo S.A)
- Superuser account:

  | Campo | Valor |
  |-------|-------|
  | **Usuario (alias)** | `admin` |
  | **Contraseña** | `Admin123@` |
  | **Grupo** | ADMINISTRADOR |
  | **Dependencia** | Caguayo Matriz |

- Base client and reception agreement

> **⚠️ Importante**: Cambiar la contraseña en el primer inicio de sesión.

#### Migrar bases de datos existentes

Si tienes bases de datos creadas con `init.sql` que nunca usaron Alembic:

```bash
# Ver qué BDs faltan por stamp
cd backend
uv run python -m scripts.stamp_all_databases --dry-run

# Ejecutar stamp real
uv run python -m scripts.stamp_all_databases
```

### Ejecutar el sistema

#### Inicio rápido (recomendado)

Usa el script interactivo `scripts/dev.sh` — menú con Start / Stop / Restart / Status para backend + frontend:

```bash
./scripts/dev.sh
```

#### Manual — Backend

1. Ensure PostgreSQL is running. Configure your connection in `backend/.env`:
   ```bash
   DATABASE_URL=postgresql+psycopg://USUARIO:CONTRASEÑA@localhost:5432/caguayo
   ```

2. Install dependencies:
   ```bash
   cd backend
   uv sync
   ```

3. Create and apply database migrations:
   ```bash
   cd backend
   uv run alembic upgrade head
   ```

4. Initialize office data (admin user, main dependency):
   ```bash
   uv run python -m scripts.init_office caguayosa
   ```

5. Run the backend:
   ```bash
   cd backend
   uv run uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Access log: qué se oculta

El access log de Uvicorn se mantiene activo, pero un filtro registrado en
`backend/src/access_log_filter.py` descarta las peticiones de bajo ruido:

| Ruta | Motivo |
|---|---|
| `/api/v1/logs` y subrutas | El frontend reporta cada llamada a la API con un `POST /logs` (`frontend/src/lib/api.ts:20`). Sin el filtro, estas líneas superan a las del tráfico real de negocio. |
| `/health` | Sondas de healthcheck. |
| `/` | Endpoint raíz de comprobación. |

El resto del tráfico de API sigue apareciendo con normalidad. El filtro se registra
al importar `backend/main.py`, por lo que aplica a todos los entornos de ejecución.
Para desactivar el filtrado, comentá la llamada a `install_access_log_filter()` en `main.py`.

#### Manual — Frontend

1. Install dependencies:
   ```bash
   cd frontend
   pnpm install
   ```

2. Run the frontend:
   ```bash
   cd frontend
   pnpm dev
   ```

## Vistas de Base de Datos

El sistema utiliza vistas en PostgreSQL para optimizar consultas.

### v_databases

Vista que lista todas las bases de datos disponibles en el servidor PostgreSQL (excepto templates).

**Creación:**
```sql
CREATE OR REPLACE VIEW v_databases AS 
SELECT datname as nombre_database 
FROM pg_database 
WHERE datistemplate = false 
ORDER BY datname;
```

**Uso en el backend:**
```python
# En backend/src/routes/conexiones.py
cur.execute("SELECT nombre_database FROM v_databases ORDER BY nombre_database")
```

## Database Schema

The application has 56 database tables, including:

### Core Tables
- `clientes` - Customer information
- `productos` - Product inventory
- `ventas` - Sales records
- `servicios` - Service offerings

### Reference Tables
- `moneda` - Currency
- `categorias` - Product categories
- `subcategorias` - Subcategories
- `tipo_movimiento` - Movement types
- `tipo_dependencia` - Dependency types
- `tipo_convenio` - Convention types
- `tipo_cliente` - Client types
- `tipo_proveedor` - Supplier types
- `tipo_contrato` - Contract types
- `estado_contrato` - Contract statuses
- `tipo_entidad` - Entity types

### Extended Tables
- `clientes_persona_natural` - Natural person clients
- `clientes_persona_juridica` - Legal entity clients
- `cliente_tcp` - TCP clients
- `dependencia` - Dependencies
- `provincia` - Provinces
- `municipio` - Municipalities
- `grupo` - Groups
- `usuarios` - Users
- `funcionalidad` - Functionalities
- `grupo_funcionalidad` - Group functionalities
- `sesion` - Sessions
- `conexion_database` - Database connections
- `especialidades_artisticas` - Artistic specialties
- `productos_en_liquidacion` - Products in liquidation
- `item_anexo` - Annex items
- `item_factura` - Invoice items
- `item_venta_efectivo` - Cash sale items
- `cuenta_dependencias` - Account dependencies
- `log` - System logs
- `pago` - Payments
- `servicios` - Services
- `solicitud_servicio` - Service requests
- `etapas` - Stages
- `tareas_etapa` - Stage tasks
- `persona_etapa` - Stage persons
- `factura_servicio` - Service invoices
- `pago_factura_servicio` - Service payment invoices
- `persona_liquidacion` - Liquidation persons
- `certificacion` - Certifications
- `items_factura_servicio` - Service invoice items
- `datos_generales_dependencia` - General dependency data
- `anexo` - Annexes
- `liquidacion` - Liquidations
- `transaccion` - Transactions
- `convenio` - Conventions
- `contrato` - Contracts
- `venta_efectivo` - Cash sales
- `cuenta` - Accounts

## API Documentation

The backend API is documented with FastAPI and includes:

- RESTful endpoints for all CRUD operations
- Authentication and authorization
- Database connection management
- CORS configuration

## Frontend Features

The frontend provides:

- User interface for managing clients
- Product inventory management
- Sales and service tracking
- Reporting and analytics
- User management and permissions

## Migration

The application uses Alembic for database migrations. All migration files are included in the repository.

To run migrations:

1. Ensure PostgreSQL is running
2. Set the DATABASE_URL environment variable
3. Run:
   ```bash
   cd backend
   uv run alembic upgrade head
   ```

To create a new migration:

1. Make changes to the models
2. Run:
   ```bash
   cd backend
   uv run alembic revision --autogenerate -m "migration description"
   ```

3. Apply the migration:
   ```bash
   uv run alembic upgrade head
   ```

## License

This project is licensed under the MIT License.

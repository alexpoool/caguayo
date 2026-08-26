# Caguayo Application

This repository contains the Caguayo application, a comprehensive inventory and management system built with FastAPI (Python backend) and React (frontend).

## Project Structure

- `backend/` - Python backend application
- `frontend/` - React frontend application
- `backend/scripts/` - Database management scripts
- `backend/Dockerfile` - Backend Docker image (multi-stage)
- `frontend/Dockerfile.frontend` - Frontend Docker image (multi-stage)
- `compose.yaml` - Orchestration (Podman / Docker Compose)
- `compose.dev.yaml` - Dev override with hot reload and bind mounts
- `frontend/Dockerfile.dev` - Dev image for frontend hot reload
- `.env.example` - Environment variable template for podman-compose
- `start.sh` - Script de inicio para desarrollo local

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
- Podman y podman-compose (para despliegue containerizado)

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

Para crear el esquema y datos iniciales sin Docker:

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

The application uses PostgreSQL as the database. The database is automatically created and initialized when using Docker Compose.

### Development with hot reload

For development with live code reloading, use the dev override:

```bash
# First time: initialize database and build images
podman-compose up -d

# Development: hot reload (backend + frontend)
podman-compose -f compose.yaml -f compose.dev.yaml up -d

# After installing new dependencies, rebuild:
podman-compose build backend frontend
```

The dev override:
- Mounts source code as volumes (edits reflect instantly)
- Backend runs `uvicorn --reload` (restarts on Python changes)
- Frontend runs Vite dev server (HMR for React components)
- Skips the entrypoint init (assumes DB is already initialized)

> **Note**: The first `podman-compose up -d` (without override) initializes the database. Subsequent dev sessions only need the override.

### Running with Podman

The application uses three services: PostgreSQL, Python backend, and React frontend.

#### Quick Start

1. Configure environment (first time only):
   ```bash
   cp .env.example .env
   # Edit .env and set SECRET_KEY and POSTGRES_PASSWORD
   ```

2. Build and start all services:
   ```bash
   podman-compose up --build
   ```

3. The following services will be available:
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

#### Database Initialization

On the **first run**, the backend automatically:

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

#### Managing Services

#### Managing Services

To stop:
```bash
podman-compose down
```

To rebuild and restart (keeps database data in the persistent volume):
```bash
podman-compose up --build -d
```

To reset the database completely (deletes the volume):
```bash
podman-compose down -v
podman-compose up --build
```

To view logs:
```bash
podman-compose logs -f
```

### Transferir imágenes a otra PC sin internet

Guardar las imágenes en una carpeta específica:
```bash
mkdir -p ~/imagenes-caguayo
podman save -o ~/imagenes-caguayo/caguayo-backend.tar localhost/caguayo-backend:latest
podman save -o ~/imagenes-caguayo/caguayo-frontend.tar localhost/caguayo-frontend:latest
podman save -o ~/imagenes-caguayo/postgres.tar docker.io/library/postgres:16-alpine
podman save -o ~/imagenes-caguayo/nginx.tar docker.io/library/nginx:alpine
```

Cargar en la otra PC:
```bash
cd ~/Descargas  # o donde tengas los .tar
podman load -i caguayo-backend.tar
podman load -i caguayo-frontend.tar
podman load -i postgres.tar
podman load -i nginx.tar
```

Luego levantar normalmente:
```bash
podman-compose up
```

#### Access via custom domain

To access the app at `http://items` instead of `http://localhost:5173`:

```bash
# 1. Map the name to your PC
echo "127.0.0.1 items" | sudo tee -a /etc/hosts

# 2. Install nginx on the host
sudo apt install nginx

# 3. Create a virtual site
sudo tee /etc/nginx/sites-available/items << 'EOF'
server {
    listen 80;
    server_name items;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 4. Enable and reload
sudo ln -sf /etc/nginx/sites-available/items /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> **Note**: If you use Fish shell, heredocs (`<< 'EOF'`) are not supported. Use `bash -c 'sudo tee ... << "EOF"...'` instead.

#### Architecture

The frontend is a static SPA served by nginx. It connects to the backend API via `/api/`, which is proxied through nginx. The backend connects to PostgreSQL using asyncpg.

### Running without Docker

#### Inicio rápido (recomendado)

Usa el script `start.sh` para iniciar todo automáticamente — verifica prerequisitos, instala dependencias, crea la base de datos si no existe, corre migraciones, y levanta backend + frontend en una sesión de tmux:

```bash
./start.sh
```

**Comandos útiles para tmux:**

| Acción | Comando |
|--------|---------|
| Ver logs en vivo | `tmux attach -t caguayo` |
| Salir sin detener servicios | `Ctrl+B`, luego `d` |
| Detener todo | `tmux kill-session -t caguayo` |

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

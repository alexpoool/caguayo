# Caguayo Application

This repository contains the Caguayo application, a comprehensive inventory and management system built with FastAPI (Python backend) and React (frontend).

## Project Structure

- `backend/` - Python backend application
- `frontend/` - React frontend application
- `backend/sql/` - SQL schemas (init.sql, new.sql)
- `backend/Dockerfile` - Backend Docker image (multi-stage)
- `frontend/Dockerfile.frontend` - Frontend Docker image (multi-stage)
- `docker-compose.yml` - Docker orchestration
- `.env.example` - Environment variable template for Docker Compose
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
- Docker y Docker Compose (para despliegue containerizado)

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

### 3. Vista v_databases

La vista `v_databases` se crea automáticamente al ejecutar `init.sql` o `new.sql`, pero si necesitas crearla manualmente:

```sql
CREATE OR REPLACE VIEW v_databases AS 
SELECT datname as nombre_database 
FROM pg_database 
WHERE datistemplate = false 
ORDER BY datname;
```

## Usuario Superadministrador

Al ejecutar `init.sql` por primera vez, se crea automáticamente un super usuario:

| Campo | Valor |
|-------|-------|
| **Alias** | admin |
| **Contraseña** | Admin123@ |
| **Grupo** | ADMINISTRADOR (acceso total) |
| **Dependencia** | Caguayo Matriz |

**Importante**: Cambiar la contraseña en el primer inicio de sesión.

## Database Setup

The application uses PostgreSQL as the database. The database is automatically created and initialized when using Docker Compose.

### Running with Docker

1. Configure environment (first time only):
   ```bash
   cp .env.example .env
   # Edit .env and set SECRET_KEY and POSTGRES_PASSWORD
   ```

2. Build and start all services:
   ```bash
   docker-compose up --build
   ```

3. The following services will be available:
   - Backend: http://localhost:8000
   - Frontend: http://localhost:5173

4. Database migrations run automatically on backend startup.

5. To stop the services:
   ```bash
   docker-compose down
   ```

6. To rebuild and restart:
   ```bash
   docker-compose up --build -d
   ```

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

4. Run the backend:
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

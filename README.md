# Caguayo Application

This repository contains the Caguayo application, a comprehensive inventory and management system built with FastAPI (Python backend) and React (frontend).

## Project Structure

- `backend/` - Python backend application
- `frontend/` - React frontend application
- `backend/Dockerfile` - Backend Docker image (multi-stage)
- `frontend/Dockerfile.frontend` - Frontend Docker image (multi-stage)
- `docker-compose.yml` - Docker orchestration
- `.env.example` - Environment variable template for Docker Compose

## Database Setup

The application uses PostgreSQL as the database. The database is automatically created and initialized when using Docker Compose.

### Prerequisites

- Docker and Docker Compose installed

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

#### Backend

1. Ensure PostgreSQL is running. Configure your connection in `.env`:
   ```bash
   DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@localhost:5432/caguayo
   ```

2. Create and apply database migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

3. Run the backend:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

#### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the frontend:
   ```bash
   cd frontend
   npm run dev
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
   alembic upgrade head
   ```

To create a new migration:

1. Make changes to the models
2. Run:
   ```bash
   cd backend
   alembic revision --autogenerate -m "migration description"
   ```

3. Apply the migration:
   ```bash
   alembic upgrade head
   ```

## License

This project is licensed under the MIT License.

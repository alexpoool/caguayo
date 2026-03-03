# Caguayo

[![es](https://img.shields.io/badge/lang-Español-green.svg)](README.md)

A comprehensive enterprise management system built with a modern Python and TypeScript stack. The application is organized into five main modules: **Inventory**, **Administration**, **Sales**, **Procurement**, and **Reports**.

## 🚀 Tech Stack

### Backend

- **FastAPI** — Asynchronous web framework for building APIs with Python.
- **SQLModel** — Hybrid ORM combining SQLAlchemy and Pydantic.
- **PostgreSQL + AsyncPG** — Relational database with async driver.
- **Alembic** — Database migrations.
- **ReportLab** — PDF report generation.
- **UV** — Ultra-fast Python package and project manager.

### Frontend

- **React 18** — Library for building user interfaces.
- **TypeScript** — Statically typed JavaScript superset.
- **Vite** — Next-generation frontend build tool.
- **Tailwind CSS** — Utility-first CSS framework.
- **TanStack React Query** — Server state management.
- **React Router** — Client-side routing.
- **Recharts** — Charts and visualizations for the dashboard.
- **Lucide React** — Icon library.
- **react-hot-toast** — Toast notifications.

## 🧩 Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Inventory** | Product and stock management | Movements, pending movements, adjustments, receptions, products |
| **Administration** | System configuration | Users, groups, currencies, dependencies |
| **Sales** | Customer sales management | Sales, customers, customer profile |
| **Procurement** | Supplier and agreement management | Clients (suppliers), agreements, annexes |
| **Reports** | Data analysis and export | Stock levels, movements by dependency, kardex |

## 🛠️ Prerequisites

- Python 3.13+
- Node.js 18+
- PostgreSQL 13+
- `uv`:
  - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `pnpm` (install with `npm install -g pnpm`)

## ⚙️ Environment Setup

### 1. Clone the repository

```bash
git clone https://github.com/alexpoool/caguayo.git
cd caguayo
```

### 2. Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create the `.env` file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your PostgreSQL credentials:

   ```env
   DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/caguayo_inventario
   DEBUG=True
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

4. Install dependencies:

   ```bash
   uv sync
   ```

5. Enable git hooks (Pre-commit):

   ```bash
   uv run pre-commit install --config ../.pre-commit-config.yaml
   ```

6. Run database migrations:

   ```bash
   uv run alembic upgrade head
   ```

7. Start the development server:

   ```bash
   uv run uvicorn main:app --reload
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

## 🏗️ Project Structure

```
caguayo/
├── backend/
│   ├── alembic.ini
│   ├── sql/
│   │   └── db.sql                  # Exported SQL schema
│   ├── src/
│   │   ├── models/                 # SQLModel models (24 files)
│   │   │   ├── anexo.py                # Agreement annexes
│   │   │   ├── anexo_producto.py       # Annex-product relationship
│   │   │   ├── categoria.py            # Categories and subcategories
│   │   │   ├── cliente.py              # Base clients
│   │   │   ├── cliente_natural.py      # Natural persons
│   │   │   ├── cliente_tcp.py          # TCP clients
│   │   │   ├── contrato.py             # Contract types and states
│   │   │   ├── convenio.py             # Commercial agreements
│   │   │   ├── cuenta.py               # Bank accounts
│   │   │   ├── dependencia.py          # Dependencies, provinces, municipalities
│   │   │   ├── detalle_venta.py        # Sale line items
│   │   │   ├── especialidades_artisticas.py
│   │   │   ├── funcionalidades.py      # Features and permissions
│   │   │   ├── liquidacion.py          # Settlements
│   │   │   ├── moneda.py               # Currencies
│   │   │   ├── movimiento.py           # Inventory movements
│   │   │   ├── producto.py             # Products
│   │   │   ├── tipo_cliente.py         # Client types
│   │   │   ├── tipo_convenio.py        # Agreement types
│   │   │   ├── tipo_cuenta.py          # Account types
│   │   │   ├── tipo_entidad.py         # Entity types
│   │   │   ├── transaccion.py          # Transactions
│   │   │   ├── usuarios.py             # Users and groups
│   │   │   └── venta.py                # Sales
│   │   ├── routes/                 # API endpoints (18 sub-routers)
│   │   │   ├── api.py                  # Main router (/api/v1)
│   │   │   ├── productos.py
│   │   │   ├── categorias.py
│   │   │   ├── subcategorias.py
│   │   │   ├── ventas.py
│   │   │   ├── clientes.py
│   │   │   ├── clientes_naturales.py
│   │   │   ├── clientes_tcp.py
│   │   │   ├── monedas.py
│   │   │   ├── movimientos.py
│   │   │   ├── convenios.py
│   │   │   ├── anexos.py
│   │   │   ├── dependencias.py
│   │   │   ├── cuentas.py
│   │   │   ├── tipo_cuenta.py
│   │   │   ├── tipos_entidad.py
│   │   │   ├── dashboard.py
│   │   │   ├── reportes.py
│   │   │   ├── configuracion.py
│   │   │   └── administracion.py
│   │   ├── services/               # Business logic (15 services)
│   │   │   ├── categoria_service.py
│   │   │   ├── contrato_service.py
│   │   │   ├── cuenta_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── moneda_service.py
│   │   │   ├── movimiento_service.py
│   │   │   ├── pdf_report_service.py   # PDF generation
│   │   │   ├── producto_service.py
│   │   │   ├── proveedor_convenio_service.py
│   │   │   ├── reportes_service.py
│   │   │   ├── subcategoria_service.py
│   │   │   ├── tipo_cuenta_service.py
│   │   │   ├── tipo_dependencia_service.py
│   │   │   ├── usuario_service.py
│   │   │   └── ventas_clientes_service.py
│   │   ├── dto/                    # Data Transfer Objects (14 DTOs)
│   │   │   ├── categorias_dto.py
│   │   │   ├── clientes_dto.py
│   │   │   ├── contratos_dto.py
│   │   │   ├── convenios_dto.py
│   │   │   ├── cuentas_dto.py
│   │   │   ├── dashboard_dto.py
│   │   │   ├── dependencias_dto.py
│   │   │   ├── monedas_dto.py
│   │   │   ├── movimientos_dto.py
│   │   │   ├── productos_dto.py
│   │   │   ├── tipo_cuenta_dto.py
│   │   │   ├── ubicaciones_dto.py
│   │   │   ├── usuarios_dto.py
│   │   │   └── ventas_dto.py
│   │   ├── repository/             # Data access layer
│   │   │   ├── base.py                 # Generic base repository
│   │   │   ├── categorias_repo.py
│   │   │   ├── moneda_repo.py
│   │   │   ├── movimientos_repo.py
│   │   │   ├── productos_repo.py
│   │   │   ├── subcategorias_repo.py
│   │   │   └── ventas_clientes_repo.py
│   │   └── database/
│   │       └── connection.py        # Async PostgreSQL connection
│   ├── main.py                     # FastAPI entry point
│   ├── .env.example                # Environment variables template
│   └── pyproject.toml              # Python dependencies
└── frontend/
    ├── src/
    │   ├── App.tsx                  # Module-based routes and navigation
    │   ├── components/
    │   │   ├── Layout.tsx               # Main layout with sidebar
    │   │   ├── ModuleHome.tsx           # Module home page
    │   │   ├── home/                    # Home components
    │   │   ├── productos/               # Product components
    │   │   └── ui/                      # Reusable UI components
    │   ├── pages/                   # Main views (15+ pages)
    │   │   ├── Welcome.tsx              # Welcome page
    │   │   ├── Productos.tsx
    │   │   ├── Ventas.tsx
    │   │   ├── Clientes.tsx
    │   │   ├── PerfilCliente.tsx
    │   │   ├── Movimientos.tsx
    │   │   ├── MovimientosPendientes.tsx
    │   │   ├── RecepcionesPage.tsx
    │   │   ├── Monedas.tsx
    │   │   ├── Configuracion.tsx
    │   │   ├── Usuarios.tsx
    │   │   ├── Grupos.tsx
    │   │   ├── Dependencias.tsx
    │   │   ├── Convenios.tsx
    │   │   ├── Anexos.tsx
    │   │   ├── compra/                  # Procurement module pages
    │   │   ├── home/                    # Module home pages
    │   │   ├── movimientos/             # Movement pages
    │   │   └── reportes/                # Report pages
    │   ├── services/                # API calls
    │   │   ├── api.ts
    │   │   ├── administracion.ts
    │   │   └── reportesService.ts
    │   ├── hooks/                   # Custom hooks
    │   │   ├── useDebounce.ts
    │   │   ├── useMovimientos.ts
    │   │   └── useProductos.ts
    │   ├── lib/                     # Utilities
    │   │   ├── api.ts                   # Base HTTP client
    │   │   └── utils.ts
    │   └── types/                   # TypeScript types (12 files)
    │       ├── index.ts
    │       ├── categoria.ts
    │       ├── contrato.ts
    │       ├── cuenta.ts
    │       ├── dashboard.ts
    │       ├── dependencia.ts
    │       ├── moneda.ts
    │       ├── proveedor.ts
    │       ├── tipo_cuenta.ts
    │       ├── ubicacion.ts
    │       ├── usuario.ts
    │       └── ventas.ts
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vite.config.ts               # Vite config + backend proxy
```

## 🌐 API

The REST API is versioned under the `/api/v1` prefix and includes 18 sub-routers:

| Group | Endpoints |
|-------|-----------|
| Inventory | `productos`, `categorias`, `subcategorias`, `movimientos` |
| Sales | `ventas`, `clientes`, `clientes_naturales`, `clientes_tcp` |
| Procurement | `convenios`, `anexos` |
| Administration | `administracion`, `configuracion`, `monedas`, `dependencias`, `cuentas`, `tipo_cuenta`, `tipos_entidad` |
| Analytics | `dashboard`, `reportes` |

## 🗄️ Data Models

### Main Entities

#### Inventory

| Entity | Description |
|--------|-------------|
| **Moneda** | Supported currencies (USD, EUR, etc.) |
| **Categoria / Subcategoria** | Hierarchical product classification |
| **Producto** | Inventory with unique code, stock, and pricing |
| **Venta / DetalleVenta** | Sales transactions with statuses |
| **Movimiento / TipoMovimiento** | Inventory input/output tracking |
| **Liquidacion** | Movement grouping / settlements |

#### Clients

| Entity | Description |
|--------|-------------|
| **Cliente** | Base client entity |
| **ClienteNatural** | Natural persons |
| **ClienteTCP** | TCP clients |
| **TipoCliente** | Client classification |

#### Procurement & Agreements

| Entity | Description |
|--------|-------------|
| **TipoConvenio** | Types of commercial agreements |
| **Convenio** | Commercial agreements with validity periods |
| **Anexo** | Documents associated with agreements |
| **AnexoProducto** | Product-annex relationships |

#### Administration

| Entity | Description |
|--------|-------------|
| **TipoContrato / EstadoContrato** | Contract types and states |
| **TipoEntidad** | Entity types |
| **TipoDependencia / Dependencia** | Hierarchical physical locations (warehouses, branches) |
| **Provincia / Municipio** | Political-administrative divisions |
| **Cuenta / TipoCuenta** | Bank accounts and their types |
| **Usuario / Grupo** | System users and roles |
| **Funcionalidad / GrupoFuncionalidad** | Permissions and module-based access control |
| **Transaccion** | Base entity for transactions |

### Sale Statuses

- `PENDIENTE` — Sale in progress
- `COMPLETADA` — Sale completed
- `ANULADA` — Sale cancelled

## 📝 Development Notes

- Backend runs at `http://localhost:8000`
- Frontend runs at `http://localhost:5173` (with proxy to `/api` → backend)
- Interactive API docs (Swagger UI): `http://localhost:8000/docs`
- Alternative docs (ReDoc): `http://localhost:8000/redoc`
- Health check: `GET http://localhost:8000/health`

## 🔄 Database Migrations

Create a new migration:

```bash
uv run alembic revision --autogenerate -m "description"
```

Apply migrations:

```bash
uv run alembic upgrade head
```

Revert a migration:

```bash
uv run alembic downgrade -1
```

## 🧪 Testing

Run backend tests:

```bash
cd backend
uv run pytest
```

## 📦 Production Build

### Backend

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
pnpm build
```

Built files will be in `frontend/dist/`.

## 📄 License

This project is property of ACM. All rights reserved.

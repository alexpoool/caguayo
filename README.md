# Caguayo

[![en](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

Sistema de gestión empresarial integral desarrollado con un stack moderno de Python y TypeScript. La aplicación está organizada en cinco módulos principales: **Inventario**, **Administración**, **Ventas**, **Compras** y **Reportes**.

## 🚀 Tecnologías

### Backend

- **FastAPI** — Framework web asíncrono para construir APIs con Python.
- **SQLModel** — ORM híbrido que combina SQLAlchemy y Pydantic.
- **PostgreSQL + AsyncPG** — Base de datos relacional con driver asíncrono.
- **Alembic** — Migraciones de base de datos.
- **ReportLab** — Generación de reportes en PDF.
- **UV** — Gestor de paquetes y proyectos de Python ultra rápido.

### Frontend

- **React 18** — Biblioteca para construir interfaces de usuario.
- **TypeScript** — Superset de JavaScript con tipado estático.
- **Vite** — Herramienta de construcción frontend de próxima generación.
- **Tailwind CSS** — Framework CSS de utilidad primero.
- **TanStack React Query** — Gestión de estado del servidor.
- **React Router** — Enrutamiento del lado del cliente.
- **Recharts** — Gráficos y visualizaciones para el dashboard.
- **Lucide React** — Iconografía.
- **react-hot-toast** — Notificaciones.

## 🧩 Módulos

| Módulo | Descripción | Funcionalidades principales |

|--------|-------------|----------------------------|

| **Inventario** | Gestión de productos y stock | Movimientos, movimientos pendientes, ajustes, recepciones, productos |
| **Administración** | Configuración del sistema | Usuarios, grupos, monedas, dependencias |
| **Ventas** | Control de ventas a clientes | Ventas, clientes, perfil de cliente |
| **Compras** | Gestión de proveedores y convenios | Clientes (proveedores), convenios, anexos |
| **Reportes** | Análisis y exportación de datos | Existencias, movimientos por dependencia, kardex |

## 🛠️ Requisitos Previos

- Python 3.13+
- Node.js 18+
- PostgreSQL 13+
- `uv`:
  - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `pnpm` (instalar con `npm install -g pnpm`)

## ⚙️ Configuración del Entorno

### 1. Clonar el repositorio

```bash
git clone https://github.com/alexpoool/caguayo.git
cd caguayo
```

### 2. Configurar Backend

1. Navegar al directorio backend:

   ```bash
   cd backend
   ```

2. Crear archivo `.env`:

   ```bash
   cp .env.example .env
   ```

3. Editar `.env` con tus credenciales de PostgreSQL:

   ```env
   DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/caguayo_inventario
   DEBUG=True
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

4. Instalar dependencias:

   ```bash
   uv sync
   ```

5. Activar git hooks (Pre-commit):

   ```bash
   uv run pre-commit install --config ../.pre-commit-config.yaml
   ```

6. Ejecutar migraciones de base de datos:

   ```bash
   uv run alembic upgrade head
   ```

7. Iniciar servidor de desarrollo:

   ```bash
   uv run uvicorn main:app --reload
   ```

### 3. Configurar Frontend

1. Navegar al directorio frontend:

   ```bash
   cd frontend
   ```

2. Instalar dependencias:

   ```bash
   pnpm install
   ```

3. Iniciar servidor de desarrollo:

   ```bash
   pnpm dev
   ```

## 🏗️ Estructura del Proyecto

```sh

caguayo/
├── backend/
│   ├── alembic.ini
│   ├── sql/
│   │   └── db.sql                  # Schema SQL exportado
│   ├── src/
│   │   ├── models/                 # Modelos SQLModel (24 archivos)
│   │   │   ├── anexo.py                # Anexos de convenios
│   │   │   ├── anexo_producto.py       # Relación anexo-producto
│   │   │   ├── categoria.py            # Categorías y subcategorías
│   │   │   ├── cliente.py              # Clientes base
│   │   │   ├── cliente_natural.py      # Personas naturales
│   │   │   ├── cliente_tcp.py          # Clientes TCP
│   │   │   ├── contrato.py             # Tipos y estados de contrato
│   │   │   ├── convenio.py             # Convenios comerciales
│   │   │   ├── cuenta.py               # Cuentas bancarias
│   │   │   ├── dependencia.py          # Dependencias, provincias, municipios
│   │   │   ├── detalle_venta.py        # Líneas de venta
│   │   │   ├── especialidades_artisticas.py
│   │   │   ├── funcionalidades.py      # Funcionalidades y permisos
│   │   │   ├── liquidacion.py          # Liquidaciones
│   │   │   ├── moneda.py               # Monedas
│   │   │   ├── movimiento.py           # Movimientos de inventario
│   │   │   ├── producto.py             # Productos
│   │   │   ├── tipo_cliente.py         # Tipos de cliente
│   │   │   ├── tipo_convenio.py        # Tipos de convenio
│   │   │   ├── tipo_cuenta.py          # Tipos de cuenta
│   │   │   ├── tipo_entidad.py         # Tipos de entidad
│   │   │   ├── transaccion.py          # Transacciones
│   │   │   ├── usuarios.py             # Usuarios y grupos
│   │   │   └── venta.py                # Ventas
│   │   ├── routes/                 # Endpoints API (18 sub-routers)
│   │   │   ├── api.py                  # Router principal (/api/v1)
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
│   │   ├── services/               # Lógica de negocio (15 servicios)
│   │   │   ├── categoria_service.py
│   │   │   ├── contrato_service.py
│   │   │   ├── cuenta_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── moneda_service.py
│   │   │   ├── movimiento_service.py
│   │   │   ├── pdf_report_service.py   # Generación de PDFs
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
│   │   ├── repository/             # Capa de acceso a datos
│   │   │   ├── base.py                 # Repositorio base genérico
│   │   │   ├── categorias_repo.py
│   │   │   ├── moneda_repo.py
│   │   │   ├── movimientos_repo.py
│   │   │   ├── productos_repo.py
│   │   │   ├── subcategorias_repo.py
│   │   │   └── ventas_clientes_repo.py
│   │   └── database/
│   │       └── connection.py        # Conexión async a PostgreSQL
│   ├── main.py                     # Punto de entrada FastAPI
│   ├── .env.example                # Plantilla de variables de entorno
│   └── pyproject.toml              # Dependencias Python
└── frontend/
    ├── src/
    │   ├── App.tsx                  # Rutas y navegación por módulos
    │   ├── components/
    │   │   ├── Layout.tsx               # Layout principal con sidebar
    │   │   ├── ModuleHome.tsx           # Página de inicio de módulo
    │   │   ├── home/                    # Componentes del home
    │   │   ├── productos/               # Componentes de productos
    │   │   └── ui/                      # Componentes UI reutilizables
    │   ├── pages/                   # Vistas principales (15+ páginas)
    │   │   ├── Welcome.tsx              # Página de bienvenida
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
    │   │   ├── compra/                  # Páginas del módulo de compras
    │   │   ├── home/                    # Páginas de inicio de módulos
    │   │   ├── movimientos/             # Páginas de movimientos
    │   │   └── reportes/                # Páginas de reportes
    │   ├── services/                # Llamadas a la API
    │   │   ├── api.ts
    │   │   ├── administracion.ts
    │   │   └── reportesService.ts
    │   ├── hooks/                   # Hooks personalizados
    │   │   ├── useDebounce.ts
    │   │   ├── useMovimientos.ts
    │   │   └── useProductos.ts
    │   ├── lib/                     # Utilidades
    │   │   ├── api.ts                   # Cliente HTTP base
    │   │   └── utils.ts
    │   └── types/                   # Tipos TypeScript (12 archivos)
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
    └── vite.config.ts               # Configuración de Vite + proxy al backend
```

## 🌐 API

La API REST está versionada bajo el prefijo `/api/v1` y cuenta con 18 sub-routers:

| Grupo | Endpoints |
|-------|-----------|

| Inventario | `productos`, `categorias`, `subcategorias`, `movimientos` |
| Ventas | `ventas`, `clientes`, `clientes_naturales`, `clientes_tcp` |
| Compras | `convenios`, `anexos` |
| Administración | `administracion`, `configuracion`, `monedas`, `dependencias`, `cuentas`, `tipo_cuenta`, `tipos_entidad` |
| Análisis | `dashboard`, `reportes` |

## 🗄️ Modelos de Datos

### Entidades Principales

#### Inventario

| Entidad | Descripción |

|---------|-------------|
| **Moneda** | Divisas soportadas (USD, EUR, etc.) |
| **Categoria / Subcategoria** | Clasificación jerárquica de productos |
| **Producto** | Inventario con código único, stock y precios |
| **Venta / DetalleVenta** | Transacciones de venta con estados |
| **Movimiento / TipoMovimiento** | Control de entradas/salidas de inventario |
| **Liquidacion** | Agrupación de movimientos |

#### Clientes

| Entidad | Descripción |

|---------|-------------|
| **Cliente** | Entidad base de clientes |
| **ClienteNatural** | Personas naturales |
| **ClienteTCP** | Clientes TCP |
| **TipoCliente** | Clasificación de clientes |

#### Compras y Convenios

| Entidad | Descripción |

|---------|-------------|
| **TipoConvenio** | Tipos de convenios comerciales |
| **Convenio** | Acuerdos comerciales con vigencia |
| **Anexo** | Documentos asociados a convenios |
| **AnexoProducto** | Relación productos-anexos |

#### Administración

| Entidad | Descripción |

|---------|-------------|
| **TipoContrato / EstadoContrato** | Tipos y estados de contratos |
| **TipoEntidad** | Tipos de entidad |
| **TipoDependencia / Dependencia** | Ubicaciones físicas jerárquicas (almacenes, sucursales) |
| **Provincia / Municipio** | División político-administrativa |
| **Cuenta / TipoCuenta** | Cuentas bancarias y sus tipos |
| **Usuario / Grupo** | Usuarios del sistema y roles |
| **Funcionalidad / GrupoFuncionalidad** | Permisos y control de acceso por módulo |
| **Transaccion** | Entidad base para transacciones |

### Estados de Venta

- `PENDIENTE` — Venta en proceso
- `COMPLETADA` — Venta finalizada
- `ANULADA` — Venta cancelada

## 📝 Notas de Desarrollo

- El backend corre en `http://localhost:8000`
- El frontend corre en `http://localhost:5173` (con proxy a `/api` → backend)
- Documentación interactiva de la API (Swagger UI): `http://localhost:8000/docs`
- Documentación alternativa (ReDoc): `http://localhost:8000/redoc`
- Health check: `GET http://localhost:8000/health`

## 🔄 Migraciones de Base de Datos

Para crear una nueva migración:

```bash
uv run alembic revision --autogenerate -m "descripcion"
```

Para aplicar migraciones:

```bash
uv run alembic upgrade head
```

Para revertir una migración:

```bash
uv run alembic downgrade -1
```

## 🧪 Testing

Ejecutar tests del backend:

```bash
cd backend
uv run pytest
```

## 📦 Construcción para Producción

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

Los archivos generados estarán en `frontend/dist/`.

## 📄 Licencia

Este proyecto es propiedad de ACM. Todos los derechos reservados.

# Caguayo

Aplicación web desarrollada con un stack moderno de Python y TypeScript.

## 🚀 Tecnologías

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
- **pNPM**: Gestor de paquetes eficiente.

## 🛠️ Requisitos Previos

- Python 3.10+
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

```
caguayo-webapp/
├── backend/
│   ├── alembic/
│   │   └── versions/          # Migraciones de base de datos
│   ├── sql/
│   │   └── db.sql            # Schema de base de datos (exportado de modelos)
│   ├── src/
│   │   ├── models/           # Modelos SQLModel
│   │   │   ├── categoria.py      # Categorias, Subcategorias
│   │   │   ├── producto.py       # Productos
│   │   │   ├── moneda.py         # Monedas
│   │   │   ├── cliente.py        # Clientes
│   │   │   ├── venta.py          # Ventas
│   │   │   ├── detalle_venta.py  # Detalle de ventas
│   │   │   ├── movimiento.py     # Movimientos, Tipos de movimiento
│   │   │   ├── provedor.py       # Proveedores
│   │   │   ├── tipo_provedor.py  # Tipos de proveedor
│   │   │   ├── convenio.py       # Convenios
│   │   │   ├── tipo_convenio.py  # Tipos de convenio
│   │   │   ├── anexo.py          # Anexos
│   │   │   ├── dependencia.py    # Dependencias, Provincias, Municipios
│   │   │   ├── tipo_dependencia.py # Tipos de dependencia
│   │   │   ├── cuenta.py         # Cuentas bancarias
│   │   │   ├── grupo.py          # Grupos de usuarios
│   │   │   ├── usuarios.py       # Usuarios del sistema
│   │   │   ├── contrato.py       # Tipos y estados de contrato
│   │   │   ├── liquidacion.py    # Liquidaciones
│   │   │   └── transaccion.py    # Transacciones
│   │   ├── routes/           # Endpoints de la API
│   │   │   ├── api.py
│   │   │   ├── productos.py
│   │   │   ├── categorias.py
│   │   │   ├── subcategorias.py
│   │   │   ├── ventas.py
│   │   │   ├── clientes.py
│   │   │   ├── monedas.py
│   │   │   ├── movimientos.py
│   │   │   ├── provedores.py
│   │   │   ├── convenios.py
│   │   │   ├── anexos.py
│   │   │   ├── dependencias.py
│   │   │   ├── configuracion.py  # Configuración general
│   │   │   └── administracion.py # Usuarios, cuentas
│   │   ├── services/         # Lógica de negocio
│   │   │   ├── contrato_service.py
│   │   │   ├── cuenta_service.py
│   │   │   └── usuario_service.py
│   │   ├── dto/              # Data Transfer Objects
│   │   │   ├── contratos_dto.py
│   │   │   ├── cuentas_dto.py
│   │   │   ├── usuarios_dto.py
│   │   │   ├── dependencias_dto.py
│   │   │   └── ubicaciones_dto.py
│   │   ├── repository/       # Capa de acceso a datos
│   │   └── database/         # Configuración de BD
│   ├── main.py              # Punto de entrada FastAPI
│   ├── .env.example         # Plantilla de variables de entorno
│   └── pyproject.toml       # Dependencias Python
└── frontend/
    ├── src/
    │   ├── components/       # Componentes React
    │   │   ├── productos/
    │   │   └── ui/          # Componentes UI reutilizables
    │   ├── pages/           # Vistas principales
    │   │   ├── Dashboard.tsx
    │   │   ├── Productos.tsx
    │   │   ├── Ventas.tsx
    │   │   ├── Clientes.tsx
    │   │   ├── Movimientos.tsx
    │   │   ├── Monedas.tsx
    │   │   ├── Configuracion.tsx  # Página de configuración
    │   │   ├── Usuarios.tsx       # Gestión de usuarios
    │   │   └── Dependencias.tsx   # Gestión de dependencias
    │   ├── services/        # Llamadas a la API
    │   │   └── administracion.ts
    │   └── types/           # Tipos TypeScript
    │       ├── contrato.ts
    │       ├── cuenta.ts
    │       ├── usuario.ts
    │       ├── dependencia.ts
    │       └── ubicacion.ts
    ├── package.json
    └── vite.config.ts       # Configuración de Vite
```

## 🗄️ Modelos de Datos

### Entidades Principales

#### Inventario

| Entidad | Descripción |
|---------|-------------|
| **Moneda** | Divisas soportadas (USD, EUR, etc.) |
| **Categoria / Subcategoria** | Clasificación jerárquica de productos |
| **Producto** | Inventario con código único, stock y precios |
| **Cliente** | Gestión de clientes para ventas |
| **Venta / DetalleVenta** | Transacciones de venta con estados |
| **Movimiento** | Control de entradas/salidas de inventario |
| **TipoMovimiento** | Tipos: AJUSTE, MERMA, DONACION, RECEPCION, DEVOLUCION |
| **Liquidacion** | Agrupación de movimientos |

#### Administración

| Entidad | Descripción |
|---------|-------------|
| **TipoContrato** | Tipos de contratos disponibles |
| **EstadoContrato** | Estados posibles de un contrato |
| **TipoProveedor** | Clasificación de proveedores |
| **Proveedor** | Información de proveedores |
| **TipoConvenio** | Tipos de convenios comerciales |
| **Convenio** | Acuerdos comerciales con vigencia |
| **Anexo** | Documentos asociados a convenios |
| **TipoDependencia** | Clasificación de dependencias |
| **Dependencia** | Ubicaciones físicas jerárquicas (almacenes, sucursales) |
| **Provincia** | Provincias del país |
| **Municipio** | Municipios por provincia |
| **Cuenta** | Cuentas bancarias asociadas a dependencias |
| **Grupo** | Grupos de usuarios para permisos |
| **Usuario** | Usuarios del sistema con autenticación |
| **Transaccion** | Entidad base para transacciones |

### Estados de Venta

- `PENDIENTE`: Venta en proceso
- `COMPLETADA`: Venta finalizada
- `ANULADA`: Venta cancelada

## 📝 Notas de Desarrollo

- El backend corre en `http://localhost:8000`
- El frontend corre en `http://localhost:5173`
- La documentación interactiva de la API (Swagger UI) está en `http://localhost:8000/docs`
- La documentación alternativa (ReDoc) está en `http://localhost:8000/redoc`
- Endpoint de health check: `http://localhost:8000/health`

## 🔄 Migraciones de Base de Datos

Listado de migraciones disponibles:

| Revisión | Descripción |
|----------|-------------|

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

## 🔒 Seguridad

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

## 📄 Licencia

Este proyecto es propiedad de ACM. Todos los derechos reservados.

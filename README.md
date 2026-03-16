<<<<<<< HEAD
# Caguayo Webapp - Sistema de Inventario

Aplicación web para la gestión y visualización de inventario, desarrollada con un stack moderno de Python y TypeScript.
=======
# Caguayo

Aplicación web desarrollada con un stack moderno de Python y TypeScript.
>>>>>>> leo

## 🚀 Tecnologías

### Backend
<<<<<<< HEAD
=======

>>>>>>> leo
- **FastAPI**: Framework web moderno y rápido para construir APIs con Python.
- **SQLModel**: ORM híbrido que combina SQLAlchemy y Pydantic.
- **PostgreSQL**: Base de datos relacional robusta.
- **Alembic**: Herramienta de migración de base de datos.
- **AsyncPG**: Driver asíncrono para PostgreSQL.
- **UV**: Gestor de paquetes y proyectos de Python ultra rápido.

### Frontend
<<<<<<< HEAD
=======

>>>>>>> leo
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
<<<<<<< HEAD
=======

>>>>>>> leo
```bash
git clone https://github.com/alexpoool/caguayo.git
cd caguayo
```

### 2. Configurar Backend

1. Navegar al directorio backend:
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   cd backend
   ```

2. Crear archivo `.env`:
<<<<<<< HEAD
   ```bash
   cp .env.example .env
   ```
   
3. Editar `.env` con tus credenciales de PostgreSQL:
=======

   ```bash
   cp .env.example .env
   ```

3. Editar `.env` con tus credenciales de PostgreSQL:

>>>>>>> leo
   ```env
   DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/caguayo_inventario
   DEBUG=True
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

4. Instalar dependencias:
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   uv sync
   ```

5. Activar git hooks (Pre-commit):
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   uv run pre-commit install --config ../.pre-commit-config.yaml
   ```

6. Ejecutar migraciones de base de datos:
<<<<<<< HEAD
   ```bash
   cd backend
   .venv/bin/alembic upgrade head
   ```

7. Iniciar servidor de desarrollo:
   ```bash
   cd backend
   .venv/bin/uvicorn main:app --reload --port 8000
=======

   ```bash
   uv run alembic upgrade head
   ```

7. Iniciar servidor de desarrollo:

   ```bash
   uv run uvicorn main:app --reload
>>>>>>> leo
   ```

### 3. Configurar Frontend

1. Navegar al directorio frontend:
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   cd frontend
   ```

2. Instalar dependencias:
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   pnpm install
   ```

3. Iniciar servidor de desarrollo:
<<<<<<< HEAD
=======

>>>>>>> leo
   ```bash
   pnpm dev
   ```

## 🏗️ Estructura del Proyecto

<<<<<<< HEAD
```
caguayo/
├── backend/
│   ├── alembic/
│   │   ├── env.py              # Configuración de migraciones (async)
│   │   ├── script.py.mako      # Template para nuevas migraciones
│   │   ├── versions/           # Migraciones de base de datos
│   │   └── alembic.ini         # Configuración de Alembic
=======
``` #type ignore
caguayo-webapp/
├── backend/
│   ├── alembic/
│   │   └── versions/          # Migraciones de base de datos
>>>>>>> leo
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
<<<<<<< HEAD
=======

>>>>>>> leo
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
<<<<<<< HEAD
=======

>>>>>>> leo
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
<<<<<<< HEAD
| **Usuario** | Usuarios del sis.venv/bin/alembic upgrade headtema con autenticación |
| **Transaccion** | Entidad base para transacciones |

### Estados de Venta
=======
| **Usuario** | Usuarios del sistema con autenticación |
| **Transaccion** | Entidad base para transacciones |

### Estados de Venta

>>>>>>> leo
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

<<<<<<< HEAD
> **Nota:** Las migraciones de Alembic están configuradas para usar el driver asíncrono `asyncpg`. El archivo `alembic/env.py` está configurado para manejar conexiones asíncronas correctamente.

### Comandos de Alembic

```bash
# Navegar al directorio backend
cd backend

# Ver revisión actual
.venv/bin/alembic current

# Ver historial de migraciones
.venv/bin/alembic history

# Verificar que la base de datos está sincronizada
.venv/bin/alembic check

# Crear una nueva migración (autogenerada desde los modelos)
.venv/bin/alembic revision --autogenerate -m "descripcion de la migracion"

# Crear una migración vacía (manual)
.venv/bin/alembic revision -m "descripcion"

# Aplicar todas las migraciones
.venv/bin/alembic upgrade head

# Aplicar una migración específica
.venv/bin/alembic upgrade +1

# Revertir la última migración
.venv/bin/alembic downgrade -1

# Marcar una revisión sin ejecutar (para bases de datos existentes)
.venv/bin/alembic stamp <revision>
```

### Estructura de Alembic

```
backend/
├── alembic/
│   ├── env.py              # Configuración de migraciones (async)
│   ├── script.py.mako     # Template para nuevas migraciones
│   ├── versions/          # Archivos de migración
│   └── alembic.ini        # Configuración principal
```

### Migraciones Existentes

| Revisión | Descripción |
|----------|-------------|
| `a9d239ce0765` | Estado inicial - Marca el estado actual de la base de datos (sin cambios) |

**Nota:** La base de datos existente se sincronizó creando una migración inicial vacía. Los modelos SQLModel se comparan con la base de datos y mostrarán diferencias en `alembic check` hasta que se generen y apliquen nuevas migraciones explícitamente.

### Configuración de Base de Datos

La URL de la base de datos se configura en:
- `backend/alembic.ini` - Configuración de Alembic
- `backend/.env` - Variables de entorno (DATABASE_URL)

Formato: `postgresql+asyncpg://usuario:password@host:5432/database`

## 🔒 Seguridad

- Las credenciales de base de datos se gestionan mediante variables de entorno
- CORS está configurado para permitir peticiones solo desde orígenes autorizados
- Las contraseñas y datos sensibles nunca deben commitearse al repositorio

## 🧪 Testing

Ejecutar tests del backend:
=======
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

>>>>>>> leo
```bash
cd backend
uv run pytest
```

## 📦 Construcción para Producción

### Backend
<<<<<<< HEAD
=======

>>>>>>> leo
```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
<<<<<<< HEAD
=======

>>>>>>> leo
```bash
cd frontend
pnpm build
```

<<<<<<< HEAD
## 🤝 Contribución

1. Crear una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Commitear tus cambios: `git commit -m 'Agrega nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crear un Pull Request

## 📄 Licencia

Este proyecto es propiedad de Caguayo. Todos los derechos reservados.
=======
## 📄 Licencia

Este proyecto es propiedad de ACM. Todos los derechos reservados.
>>>>>>> leo

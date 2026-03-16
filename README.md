# Caguayo - Sistema de Gestión de Inventario

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

### 2. Configurar PostgreSQL

#### Crear la base de datos
```bash
# Conectarse a PostgreSQL
psql -U postgres -h localhost -p 5432

# Crear la base de datos
CREATE DATABASE caguayo_inventario;

# Salir de psql
\q
```

#### Crear usuario lector (opcional)
```bash
# Conectarse a PostgreSQL como postgres
psql -U postgres -h localhost -p 5432

-- Crear usuario lector con contraseña
CREATE USER usuariolector WITH PASSWORD 'usuariolector123';

-- Dar permiso de conexión a la base de datos
GRANT CONNECT ON DATABASE caguayo_inventario TO usuariolector;

-- Dar permiso de solo lectura
GRANT SELECT ON ALL TABLES IN SCHEMA public TO usuariolector;

-- Verificar que se creó correctamente
\du usuariolector
```

### 3. Configurar Backend

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
   DATABASE_URL=postgresql+psycopg://postgres:1234@localhost:5432/caguayo_inventario
   DEBUG=True
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

4. Instalar dependencias:
   ```bash
   uv sync
   ```

5. Ejecutar el script de base de datos:
   ```bash
   # Ejecutar el schema completo
   psql -U postgres -d caguayo_inventario -f sql/db.sql
   ```

6. Iniciar servidor de desarrollo:
   ```bash
   uv run uvicorn main:app --reload
   ```

### 4. Configurar Frontend

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

## 👤 Usuario Superadministrador

Al crear la base de datos por primera vez con `db.sql`, se crea automáticamente un super usuario:

| Campo | Valor |
|-------|-------|
| **CI** | 00000000000 |
| **Nombre** | Administrador Sistema Caguayo |
| **Alias** | admin |
| **Contraseña** | Admin123@ |
| **Grupo** | ADMINISTRADOR (acceso total) |
| **Dependencia** | Caguayo Matriz |

**Importante**: Cambiar la contraseña en el primer inicio de sesión.

### Grupos creados automáticamente:
- **ADMINISTRADOR**: Acceso total al sistema
- **GERENCIA**: Permisos de gestión
- **VENTAS**: Módulo de ventas
- **COMPRAS**: Módulo de compras
- **INVENTARIO**: Gestión de inventario
- **CONTABILIDAD**: Módulo de contabilidad

### Permisos del grupo ADMINISTRADOR:
Todas las funcionalidades del sistema (crear, editar, eliminar, ver para cada módulo).

## 🏗️ Estructura del Proyecto

```
caguayo/
├── backend/
│   ├── alembic/
│   │   ├── env.py              # Configuración de migraciones (async)
│   │   ├── script.py.mako      # Template para nuevas migraciones
│   │   ├── versions/           # Migraciones de base de datos
│   │   └── alembic.ini         # Configuración de Alembic
│   ├── sql/
│   │   ├── db.sql            # Schema completo de base de datos
│   │   └── nuevas_tablas.sql # Tablas adicionales
│   ├── src/
│   │   ├── models/           # Modelos SQLModel
│   │   ├── routes/           # Endpoints de la API
│   │   ├── services/         # Lógica de negocio
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── repository/       # Capa de acceso a datos
│   │   └── database/         # Configuración de BD
│   ├── main.py               # Punto de entrada FastAPI
│   ├── .env.example          # Plantilla de variables de entorno
│   └── pyproject.toml        # Dependencias Python
└── frontend/
    ├── src/
    │   ├── components/       # Componentes React
    │   ├── pages/           # Vistas principales
    │   ├── services/        # Llamadas a la API
    │   └── types/           # Tipos TypeScript
    ├── package.json
    └── vite.config.ts       # Configuración de Vite
```

## 🗄️ Modelos de Datos

### Catálogo
| Entidad | Descripción |
|---------|-------------|
| **Moneda** | Divisas soportadas (USD, EUR, CUP, etc.) |
| **Categoria / Subcategoria** | Clasificación jerárquica de productos |
| **TipoMovimiento** | Tipos: AJUSTE, MERMA, DONACION, RECEPCION, DEVOLUCION |
| **TipoDependencia** | Clasificación de dependencias (MATRIZ, SUCURSAL, ALMACEN) |
| **TipoCuenta** | Tipos de cuentas bancarias |
| **TipoEntidad** | Tipos de entidad jurídica (OSDE, UEB, etc.) |
| **TipoCliente** | Tipos de cliente |
| **TipoProveedor** | Clasificación de proveedores |
| **TipoConvenio** | Tipos de convenios comerciales |
| **TipoContrato** | Tipos de contratos |
| **EstadoContrato** | Estados de contratos |

### Geográficos
| Entidad | Descripción |
|---------|-------------|
| **Provincia** | Provincias de Cuba (16 provincias) |
| **Municipio** | Municipios por provincia |

### Principaless
| Entidad | Descripción |
|---------|-------------|
| **Producto** | Inventario con código único, stock y precios |
| **Cliente** | Clientes (tipo_relacion: CLIENTE, PROVEEDOR, AMBAS) |
| **ClienteNatural** | Datos de persona natural |
| **ClienteJuridica** | Datos de persona jurídica |
| **ClienteTCP** | Trabajador por cuenta propia |
| **Proveedor** | Información de proveedores |
| **Venta / DetalleVenta** | Transacciones de venta con estados |
| **Movimiento** | Control de entradas/salidas de inventario |
| **Liquidacion** | Agrupación de movimientos con cálculos financieros |
| **ProductosEnLiquidacion** | Productos asociados a liquidaciones |

### Convenios y Contratos
| Entidad | Descripción |
|---------|-------------|
| **Convenio** | Acuerdos comerciales con vigencia |
| **Anexo** | Documentos asociados a convenios |
| **AnexoProducto** | Relación anexo-productos |
| **Contrato** | Contratos con clientes |
| **ContratoProducto** | Relación contrato-productos |
| **Suplemento** | Suplementos de contratos |
| **SuplementoProducto** | Relación suplemento-productos |
| **Factura** | Facturas de contratos |
| **FacturaProducto** | Relación factura-productos |

### Administración
| Entidad | Descripción |
|---------|-------------|
| **Dependencia** | Ubicaciones físicas jerárquicas (almacenes, sucursales) |
| **Provincia** | Provincias del país |
| **Municipio** | Municipios por provincia |
| **Cuenta** | Cuentas bancarias asociadas a dependencias |
| **Grupo** | Grupos de usuarios para permisos |
| **Funcionalidad** | Funcionalidades del sistema |
| **GrupoFuncionalidad** | Relación grupo-funcionalidades |
| **Usuario** | Usuarios del sistema con autenticación |
| **Sesion** | Control de sesiones de usuarios |
| **ConexionDatabase** | Conexiones a otras bases de datos |

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

> **Nota:** Las migraciones de Alembic están configuradas para usar el driver asíncrono `asyncpg`.

### Comandos de Alembic

```bash
# Navegar al directorio backend
cd backend

# Ver revisión actual
uv run alembic current

# Ver historial de migraciones
uv run alembic history

# Verificar que la base de datos está sincronizada
uv run alembic check

# Crear una nueva migración (autogenerada desde los modelos)
uv run alembic revision --autogenerate -m "descripcion de la migracion"

# Crear una migración vacía (manual)
uv run alembic revision -m "descripcion"

# Aplicar todas las migraciones
uv run alembic upgrade head

# Aplicar una migración específica
uv run alembic upgrade +1

# Revertir la última migración
uv run alembic downgrade -1

# Marcar una revisión sin ejecutar (para bases de datos existentes)
uv run alembic stamp <revision>
```

### Sincronizar modelos con base de datos existente

Si tienes una base de datos existente y quieres sincronizar los modelos:

```bash
# 1. Exportar schema actual a SQL
pg_dump -U postgres -d caguayo_inventario --schema-only > schema_actual.sql

# 2. Comparar con db.sql y hacer los ajustes necesarios

# 3. Aplicar los cambios directamente a la base de datos
psql -U postgres -d caguayo_inventario -f sql/db.sql
```

## 🔒 Seguridad

- Las credenciales de base de datos se gestionan mediante variables de entorno
- CORS está configurado para permitir peticiones solo desde orígenes autorizados
- Las contraseñas y datos sensibles nunca deben commitearse al repositorio
- El sistema de grupos y funcionalidades permite control granular de permisos

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

## 🤝 Contribución

1. Crear una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Commitear tus cambios: `git commit -m 'Agrega nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crear un Pull Request

## 📄 Licencia

Este proyecto es propiedad de Caguayo. Todos los derechos reservados.

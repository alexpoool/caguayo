# Caguayo Webapp - Sistema de Inventario

Aplicación web para la gestión y visualización de inventario, desarrollada con un stack moderno de Python y TypeScript.

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
- PostgreSQL
- `uv`:
  - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `pnpm` (instalar con `npm install -g pnpm`)

## ⚙️ Configuración del Entorno

### 1. Clonar el repositorio
```bash
git clone https://github.com/alexpoool/caguayo-webapp.git
cd caguayo-webapp
```

### 2. Configurar Backend

1.  Navegar al directorio backend:
    ```bash
    cd backend
    ```
2.  Crear archivo `.env`:
    ```bash
    # Windows (PowerShell)
    cp .env.example .env
    # Linux/Mac
    cp .env.example .env
    ```
    (Ajusta `DATABASE_URL` en `.env` con tus credenciales de PostgreSQL).
3.  Instalar dependencias:
    ```bash
    uv sync
    ```
4.  Activar git hooks (Pre-commit):
    ```bash
    uv run pre-commit install --config ../.pre-commit-config.yaml
    ```
5.  Ejecutar migraciones de base de datos:
    ```bash
    uv run alembic upgrade head
    ```
6.  Iniciar servidor de desarrollo:
    ```bash
    uv run uvicorn main:app --reload
    ```

### 3. Configurar Frontend

1.  Navegar al directorio frontend:
    ```bash
    cd frontend
    ```
2.  Instalar dependencias:
    ```bash
    pnpm install
    ```
3.  Iniciar servidor de desarrollo:
    ```bash
    pnpm dev
    ```

## 🏗️ Estructura del Proyecto

```
caguayo-webapp/
├── backend/
│   ├── alembic/        # Migraciones de base de datos
│   ├── src/
│   │   ├── models/     # Modelos SQLModel
│   │   ├── routes/     # Endpoints de la API
│   │   ├── services/   # Lógica de negocio
│   │   ├── repository/ # Capa de acceso a datos
│   │   └── database/   # Configuración de BD
│   └── main.py         # Punto de entrada
└── frontend/
    ├── src/
    │   ├── components/ # Componentes React
    │   ├── pages/      # Vistas principales
    │   ├── services/   # Llamadas a la API
    │   └── types/      # Tipos TypeScript
    └── vite.config.ts  # Configuración de Vite
```

## 📝 Notas de Desarrollo

- El backend corre en `http://localhost:8000`.
- El frontend corre en `http://localhost:5173`.
- La documentación interactiva de la API está en `http://localhost:8000/docs`.

## 🔒 Seguridad

- Las credenciales de base de datos se gestionan mediante variables de entorno.
- CORS está configurado para permitir peticiones solo desde el frontend autorizado.
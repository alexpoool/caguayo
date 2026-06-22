# Contenerización y despliegue con Docker

## Arquitectura

La aplicación Caguayo está compuesta por **tres servicios** orquestados con Docker Compose:

| Servicio   | Tecnología            | Puerto |
| ---------- | --------------------- | ------ |
| `backend`  | Python 3.13 + FastAPI | 8000   |
| `frontend` | React + Vite + Nginx  | 80 → 5173 |
| `db`       | PostgreSQL 16 Alpine  | 5432   |

### Imágenes de Docker

Cada servicio produce su propia imagen Docker:

- **`caguayo-backend`** — Construida desde `backend/Dockerfile`
- **`caguayo-frontend`** — Construida desde `frontend/Dockerfile.frontend` (multi-stage: build con Node, servido con Nginx)
- **`postgres:16-alpine`** — Imagen oficial de PostgreSQL

---

## Requisitos

- Docker ≥ 24
- Docker Compose ≥ 2.20 (plugin `docker compose`)

---

## Comandos básicos

### Construir y arrancar todo

```bash
docker compose up --build -d
```

### Ver logs

```bash
docker compose logs -f
```

### Detener servicios

```bash
docker compose down
```

### Detener y borrar volúmenes (borra la BD)

```bash
docker compose down -v
```

### Reconstruir un servicio específico

```bash
docker compose build --no-cache backend
docker compose up -d backend
```

---

## Variables de entorno

Todas las variables tienen valores por defecto y pueden sobrescribirse:

| Variable                | Defecto                                          | Descripción                     |
| ----------------------- | ------------------------------------------------ | ------------------------------- |
| `DATABASE_URL`          | `postgresql://solji:Scp2005@db:5432/caguayo`     | Conexión a PostgreSQL           |
| `POSTGRES_USER`         | `solji`                                          | Usuario de la BD                |
| `POSTGRES_PASSWORD`     | `Scp2005`                                        | Contraseña de la BD             |
| `POSTGRES_DB`           | `caguayo`                                        | Nombre de la BD                 |
| `SECRET_KEY`            | `caguayo-secret-key-change-in-production`        | Clave JWT                       |
| `CORS_ORIGINS`          | `http://localhost:5173,http://localhost:3000`     | Orígenes CORS permitidos        |
| `VITE_API_BASE_URL`     | `http://localhost:8000/api/v1`                   | URL de la API para el frontend  |

Se pueden sobrescribir creando un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL=postgresql://user:pass@db:5432/caguayo
SECRET_KEY=mi-clave-segura
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Subir imágenes a DockerHub

### 1. Iniciar sesión

```bash
docker login
```

### 2. Etiquetar las imágenes

```bash
docker tag caguayo-backend:latest tuusuario/caguayo-backend:latest
docker tag caguayo-frontend:latest tuusuario/caguayo-frontend:latest
```

Para versionado semántico:

```bash
docker tag caguayo-backend:latest tuusuario/caguayo-backend:1.0.0
docker tag caguayo-frontend:latest tuusuario/caguayo-frontend:1.0.0
```

### 3. Subir las imágenes

```bash
docker push tuusuario/caguayo-backend:latest
docker push tuusuario/caguayo-frontend:latest
```

### 4. Usar las imágenes remotas en producción

Editar `docker-compose.yml` para usar las imágenes en lugar de construir localmente:

```yaml
services:
  backend:
    image: tuusuario/caguayo-backend:latest
    # build: ...  ← comentar o quitar
  frontend:
    image: tuusuario/caguayo-frontend:latest
    # build: ...  ← comentar o quitar
```

---

## Publicar versiones (release)

```bash
# 1. Construir
docker compose build

# 2. Etiquetar con versión
VERSION=1.0.0
docker tag caguayo-backend:latest tuusuario/caguayo-backend:$VERSION
docker tag caguayo-backend:latest tuusuario/caguayo-backend:latest
docker tag caguayo-frontend:latest tuusuario/caguayo-frontend:$VERSION
docker tag caguayo-frontend:latest tuusuario/caguayo-frontend:latest

# 3. Subir
docker push tuusuario/caguayo-backend:$VERSION
docker push tuusuario/caguayo-backend:latest
docker push tuusuario/caguayo-frontend:$VERSION
docker push tuusuario/caguayo-frontend:latest
```

---

## Despliegue en servidor

```bash
# En el servidor
git clone <repo>
cd caguayo

# Configurar variables de producción
cp .env.example .env
# Editar .env con valores de producción

# Arrancar
docker compose up -d
```

### Usando imágenes pre-construidas desde DockerHub

```yaml
# docker-compose.prod.yml
services:
  backend:
    image: tuusuario/caguayo-backend:latest
    pull_policy: always
  frontend:
    image: tuusuario/caguayo-frontend:latest
    pull_policy: always
  db:
    image: postgres:16-alpine
```

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Desarrollo con hot-reload

Para desarrollo local sin reconstruir la imagen en cada cambio:

```bash
# Backend con hot-reload
docker compose up -d db
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend con hot-reload
cd frontend && npm run dev
```

O usando el modo build normal:

```bash
docker compose up --build
```

---

## Estructura de los Dockerfiles

```
caguayo/
├── backend/
│   ├── Dockerfile          # Imagen base: python:3.13-slim
│   │                       #   - Instala uv + dependencias
│   │                       #   - Copia código fuente
│   │                       #   - Corre con uvicorn
│   │                       #   - Usuario no-root (appuser)
│   └── ...
├── frontend/
│   ├── Dockerfile.frontend  # Imagen multi-stage:
│   │                       #   Stage 1 (build): node:20-alpine
│   │                       #     - Instala deps con npm ci
│   │                       #     - Compila con Vite
│   │                       #   Stage 2 (prod): nginx:alpine
│   │                       #     - Sirve /dist con Nginx
│   │                       #     - SPA routing configurado
│   ├── nginx.conf          # Configuración Nginx para SPA
│   └── ...
├── docker-compose.yml      # Orquestación de servicios
├── .dockerignore           # Excluye archivos innecesarios
└── ...
```

---

## Buenas prácticas aplicadas

- **Multi-stage build** en frontend: la imagen final solo contiene Nginx + estáticos, sin Node ni dependencias de desarrollo.
- **Usuario no-root**: el backend corre con `appuser` (UID 1000) en lugar de root.
- **Healthcheck**: PostgreSQL tiene healthcheck para que el backend espere a que esté listo.
- **`.dockerignore`**: excluye carpetas como `node_modules/`, `.venv/`, `.git/` para builds más rápidos y limpios.
- **Variables de entorno**: valores por defecto sensibles sobrescribibles vía `.env`.
- **Nginx con compresión gzip** y caché de assets estáticos.
- **Red propia**: los servicios se comunican a través de la red `caguayo-network`.

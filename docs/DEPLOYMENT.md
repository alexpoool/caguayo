# Guía de Despliegue de Caguayo

## Descripción General

Esta guía cubre el despliegue del sistema Caguayo en producción, incluyendo tanto el backend (Python/FastAPI) como el frontend (React/TypeScript). Proporciona instrucciones para diferentes entornos y configuraciones.

## Características del Despliegue

### 1. Arquitecturas Soportadas

- **Monolítica**: Backend y frontend en el mismo servidor
- **Separada**: Backend y frontend en servidores separados
- **Contenedores**: Docker/Kubernetes para escalabilidad
- **Cloud**: AWS, Azure, Google Cloud

### 2. Entornos

- **Desarrollo**: Local, con base de datos de desarrollo
- **Pruebas**: Staging, con base de datos de pruebas
- **Producción**: Servidor de producción, con base de datos de producción

### 3. Configuración

- **Variables de entorno**: Configuración flexible
- **Archivos de configuración**: Configuración separada
- **SSL/TLS**: Seguridad HTTPS
- **CORS**: Orígenes configurables

## Requisitos del Sistema

### 1. Backend (Python)

**Sistema Operativo**:
- Linux (Ubuntu, CentOS, etc.)
- macOS (opcional)

**Hardware**:
- CPU: 2 núcleos o más
- RAM: 4 GB o más
- Almacenamiento: 20 GB o más

**Software**:
- Python 3.13 o superior
- PostgreSQL 14 o superior
- Git
- curl/wget

### 2. Frontend (Node.js)

**Sistema Operativo**:
- Linux (Ubuntu, CentOS, etc.)
- macOS (opcional)

**Hardware**:
- CPU: 1 núcleo o más
- RAM: 2 GB o más
- Almacenamiento: 10 GB o más

**Software**:
- Node.js 18 o superior
- pnpm 10 o superior
- Git

### 3. Base de Datos (PostgreSQL)

**Hardware**:
- CPU: 2 núcleos o más
- RAM: 4 GB o más
- Almacenamiento: 50 GB o más
- SSD recomendado

**Configuración**:
- Autenticación por contraseña o SSL
- Permisos adecuados para el usuario de Caguayo

## Configuración del Entorno

### 1. Variables de Entorno

#### Backend (.env)

```env
# Base de Datos
DATABASE_URL=postgresql://caguayo_user:caguayo_pass@localhost:5432/caguayo_prod

# Servidor
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Seguridad
SECRET_KEY=tu-secreto-seguro-aqui-cambiar-en-produccion
CORS_ORIGINS=https://app.caguayo.com,https://admin.caguayo.com

# Otros
ENV=production
LOG_LEVEL=INFO
```

#### Frontend (.env)

```env
# API
VITE_API_URL=https://api.caguayo.com

# Autenticación
VITE_AUTH_TOKEN=tu-token-de-autenticacion

# Otros
VITE_APP_NAME=Caguayo
VITE_VERSION=1.0.0
VITE_APP_ENV=production
```

### 2. Archivos de Configuración

#### Backend (config/database.py)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    secret_key: str
    cors_origins: list[str] = ["https://app.caguayo.com"]
    env: str = "production"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

#### Frontend (config/vite.ts)

```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  appName: import.meta.env.VITE_APP_NAME || 'Caguayo',
  version: import.meta.env.VITE_VERSION || '1.0.0',
  env: import.meta.env.VITE_APP_ENV || 'development',
};
```

## Despliegue Paso a Paso

### 1. Preparación

#### 1.1 Clonar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/caguayo.git
cd caguayo

# Verificar la estructura
ls -la
```

#### 1.2 Instalar Dependencias

```bash
# Backend
dé backend
cd backend
python -m pip install -r requirements.txt

# Frontend
dé frontend
pnpm install
```

#### 1.3 Configurar Base de Datos

```bash
# Crear usuario de base de datos
sudo -u postgres psql -c "CREATE USER caguayo_user WITH PASSWORD 'caguayo_pass';"

# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE caguayo_prod OWNER caguayo_user;"

# Conceder permisos
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE caguayo_prod TO caguayo_user;"
```

#### 1.4 Ejecutar Migraciones

```bash
dé backend
python -m alembic upgrade head
```

### 2. Despliegue del Backend

#### 2.1 Construcción

```bash
dé backend
pip install -e .
```

#### 2.2 Ejecutar el Backend

```bash
dé backend
python main.py
```

#### 2.3 Verificar el Backend

```bash
curl -X GET "http://localhost:8000/health"
```

### 3. Despliegue del Frontend

#### 3.1 Construcción

```bash
dé frontend
pnpm run build
```

#### 3.2 Despliegue

```bash
# Subir a servidor
scp -r dist/* usuario@servidor:/ruta/del/frontend/

# O usar un pipeline CI/CD
pnpm run deploy
```

#### 3.3 Verificar el Frontend

```bash
curl -X GET "http://localhost:3000/"
```

### 4. Despliegue en Producción

#### 4.1 Usando Docker

```bash
# Construir imágenes
docker build -t caguayo/backend ./backend
docker build -t caguayo/frontend ./frontend

# Ejecutar contenedores
docker-compose up -d
```

#### 4.2 Usando Kubernetes

```bash
# Aplicar manifiestos
kubectl apply -f k8s/

# Verificar despliegues
kubectl get deployments
```

#### 4.3 Usando systemd

```bash
# Crear servicio para backend
sudo tee /etc/systemd/system/caguayo-backend.service << EOF
[Unit]
Description=Caguayo Backend
After=network.target

[Service]
Type=simple
User=caguayo
WorkingDirectory=/home/caguayo/backend
ExecStart=/usr/bin/python main.py
Restart=always
Environment=ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Crear servicio para frontend
sudo tee /etc/systemd/system/caguayo-frontend.service << EOF
[Unit]
Description=Caguayo Frontend
After=network.target

[Service]
Type=simple
User=caguayo
WorkingDirectory=/home/caguayo/frontend
ExecStart=/usr/bin/pnpm start
Restart=always
Environment=VITE_APP_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y iniciar servicios
sudo systemctl daemon-reload
sudo systemctl enable caguayo-backend
sudo systemctl start caguayo-backend
sudo systemctl enable caguayo-frontend
sudo systemctl start caguayo-frontend
```

## Despliegue en la Nube

### 1. AWS

#### 1.1 Configurar AWS CLI

```bash
aws configure
```

#### 1.2 Crear Instancias EC2

```bash
# Iniciar instancia EC2
aws ec2 run-instances --image-id ami-0c02fb55956c7d316 --instance-type t3.medium --key-name tu-key-pair

# Obtener ID de instancia
INSTANCE_ID=$(aws ec2 run-instances --image-id ami-0c02fb55956c7d316 --instance-type t3.medium --key-name tu-key-pair --query 'Instances[0].InstanceId' --output text)

# Esperar a que la instancia esté lista
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Obtener IP pública
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
```

#### 1.3 Conectar a la Instancia

```bash
ssh -i tu-key-pair.pem ec2-user@$PUBLIC_IP
```

#### 1.4 Instalar Dependencias

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/caguayo.git
cd caguayo

# Instalar dependencias
dé backend
pip install -r requirements.txt
dé frontend
pnpm install

# Ejecutar migraciones
python -m alembic upgrade head

# Construir frontend
dé frontend
pnpm run build
```

#### 1.5 Configurar Servidor Web

```bash
# Instalar Nginx
sudo apt update
sudo apt install nginx

# Configurar Nginx para backend
sudo tee /etc/nginx/sites-available/caguayo-backend << EOF
server {
    listen 80;
    server_name api.caguayo.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Configurar Nginx para frontend
sudo tee /etc/nginx/sites-available/caguayo-frontend << EOF
server {
    listen 80;
    server_name app.caguayo.com;

    root /home/caguayo/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Habilitar sitios
sudo ln -s /etc/nginx/sites-available/caguayo-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/caguayo-frontend /etc/nginx/sites-enabled/

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 1.6 Configurar SSL/TLS

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d api.caguayo.com -d app.caguayo.com

# Configurar renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. Azure

#### 1.1 Configurar Azure CLI

```bash
azure login
```

#### 1.2 Crear Grupo de Recursos

```bash
az group create --name caguayo-rg --location eastus
```

#### 1.3 Crear Contenedores de App Service

```bash
# Crear contenedor para backend
az container-app create --resource-group caguayo-rg --name caguayo-backend --image caguayo/backend:latest --registry-server your-registry.azurecr.io --registry-username your-username --registry-password your-password

# Crear contenedor para frontend
az container-app create --resource-group caguayo-rg --name caguayo-frontend --image caguayo/frontend:latest --registry-server your-registry.azurecr.io --registry-username your-username --registry-password your-password
```

#### 1.4 Configurar DNS

```bash
# Crear DNS personalizado
az network dns create --resource-group caguayo-rg --zone-name caguayo.com

# Crear registros A
az network dns record-a create --resource-group caguayo-rg --zone-name caguayo.com --name api
az network dns record-a create --resource-group caguayo-rg --zone-name caguayo.com --name app
```

### 3. Google Cloud

#### 1.1 Configurar gcloud CLI

```bash
gcloud auth login
gcloud config set project your-project-id
```

#### 1.2 Crear Clúster GKE

```bash
# Crear clúster
gcloud container clusters create caguayo-cluster --zone us-central1-a --num-nodes=3

# Obtener credenciales
gcloud container clusters get-credentials caguayo-cluster --zone us-central1-a
```

#### 1.3 Desplegar con Helm

```bash
# Agregar repositorio Helm
helm repo add caguayo https://your-repo.github.io/caguayo

# Instalar helm-chart
helm install caguayo caguayo/caguayo --set backend.image.tag=latest --set frontend.image.tag=latest
```

## Configuración del Servidor

### 1. Servidor Web (Nginx)

#### 1.1 Instalar Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 1.2 Configurar Nginx

```nginx
# /etc/nginx/nginx.conf
server {
    listen 80;
    server_name api.caguayo.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name app.caguayo.com;

    root /home/caguayo/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 1.3 Reiniciar Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2. Servidor de Base de Datos (PostgreSQL)

#### 2.1 Instalar PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### 2.2 Configurar PostgreSQL

```bash
# Editar archivo de configuración
sudo nano /etc/postgresql/14/main/postgresql.conf

# Agregar configuración
sudo tee -a /etc/postgresql/14/main/postgresql.conf << EOF
# Configuración de Caguayo
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_connections = 100
EOF

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

#### 2.3 Crear Usuario y Base de Datos

```bash
# Conectar como postgres
sudo -u postgres psql

-- Crear usuario
CREATE USER caguayo_user WITH PASSWORD 'caguayo_pass';

-- Crear base de datos
CREATE DATABASE caguayo_prod OWNER caguayo_user;

-- Conceder permisos
GRANT ALL PRIVILEGES ON DATABASE caguayo_prod TO caguayo_user;
```

### 3. Servidor de Aplicación (systemd)

#### 3.1 Crear Servicios

```bash
# Servicio para backend
sudo tee /etc/systemd/system/caguayo-backend.service << EOF
[Unit]
Description=Caguayo Backend
After=network.target postgresql.service

[Service]
Type=simple
User=caguayo
WorkingDirectory=/home/caguayo/backend
ExecStart=/usr/bin/python main.py
Restart=always
Environment=ENV=production
Environment=DATABASE_URL=postgresql://caguayo_user:caguayo_pass@localhost:5432/caguayo_prod

[Install]
WantedBy=multi-user.target
EOF

# Servicio para frontend
sudo tee /etc/systemd/system/caguayo-frontend.service << EOF
[Unit]
Description=Caguayo Frontend
After=network.target

[Service]
Type=simple
User=caguayo
WorkingDirectory=/home/caguayo/frontend
ExecStart=/usr/bin/pnpm start
Restart=always
Environment=VITE_APP_ENV=production
Environment=VITE_API_URL=https://api.caguayo.com

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y iniciar servicios
sudo systemctl daemon-reload
sudo systemctl enable caguayo-backend
sudo systemctl start caguayo-backend
sudo systemctl enable caguayo-frontend
sudo systemctl start caguayo-frontend
```

## Monitoreo y Mantenimiento

### 1. Monitoreo

#### 1.1 Métricas del Sistema

```bash
# CPU
watch -n 5 'top -b -n 1 | head -20'

# Memoria
swatch -n 5 'free -h'

# Discos
watch -n 5 'df -h'

# Procesos
watch -n 5 'ps aux --sort=-%cpu | head -20'
```

#### 1.2 Métricas de la Aplicación

```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000/
```

#### 1.3 Logs

```bash
# Logs del backend
tail -f /var/log/caguayo/backend.log

# Logs del frontend
tail -f /var/log/caguayo/frontend.log

# Logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 2. Mantenimiento

#### 2.1 Copias de Seguridad

```bash
# Copia de seguridad de la base de datos
sudo -u postgres pg_dump caguayo_prod > /home/caguayo/backups/caguayo_prod_$(date +%Y%m%d_%H%M%S).sql

# Verificar copia de seguridad
pg_restore --list /home/caguayo/backups/caguayo_prod_$(date +%Y%m%d_%H%M%S).sql
```

#### 2.2 Actualizaciones

```bash
# Actualizar backend
dé backend
pip install -U -r requirements.txt

# Actualizar frontend
dé frontend
pnpm update
pnpm run build

# Reiniciar servicios
sudo systemctl restart caguayo-backend
sudo systemctl restart caguayo-frontend
```

#### 2.3 Optimización

```bash
# Reindexar base de datos
sudo -u postgres psql -d caguayo_prod -c "REINDEX DATABASE caguayo_prod;"

# Limpiar logs antiguos
sudo find /var/log/caguayo -name "*.log" -mtime +30 -delete

# Limpiar copias de seguridad antiguas
sudo find /home/caguayo/backups -name "*.sql" -mtime +90 -delete
```

## Problemas Comunes y Soluciones

### 1. Error de Conexión a la Base de Datos

**Síntoma**:
```
ERROR: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL: password authentication failed for user "caguayo_user"
```

**Solución**:
```bash
# Verificar usuario y contraseña
sudo -u postgres psql -c "\du caguayo_user"

# Verificar base de datos
sudo -u postgres psql -c "\l"

# Verificar configuración de PostgreSQL
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### 2. Error de Puerto en Uso

**Síntoma**:
```
Error: port 8000 is already in use
```

**Solución**:
```bash
# Verificar puertos en uso
netstat -tulpn | grep :8000

# Matar proceso
kill -9 $(lsof -t -i:8000)

# Reiniciar servicio
sudo systemctl restart caguayo-backend
```

### 3. Error de Construcción del Frontend

**Síntoma**:
```
Module not found: Error: Cannot resolve 'path/to/module'
```

**Solución**:
```bash
# Verificar node_modules
dé frontend
pnpm install

# Verificar configuración
dé frontend
pnpm run build
```

### 4. Error de Autenticación

**Síntoma**:
```
Error: Invalid token
```

**Solución**:
```bash
# Verificar secreto JWT
# Verificar configuración de entorno
# Reiniciar servicios
sudo systemctl restart caguayo-backend
sudo systemctl restart caguayo-frontend
```

### 5. Error de CORS

**Síntoma**:
```
Access-Control-Allow-Origin: '*' no está permitido
```

**Solución**:
```bash
# Verificar configuración CORS
# Actualizar archivo .env
# Reiniciar backend
sudo systemctl restart caguayo-backend
```

## Conclusión

El despliegue de Caguayo en producción requiere una configuración cuidadosa y una implementación sistemática. Características clave:

1. **Configuración Estricta**: Variables de entorno y archivos de configuración
2. **Seguridad**: SSL/TLS, autenticación y autorización
3. **Monitoreo**: Métricas y logs en tiempo real
4. **Mantenimiento**: Copias de seguridad y actualizaciones regulares
5. **Escalabilidad**: Arquitectura flexible y escalable

El sistema está diseñado para:

- **Fiabilidad**: Servicios robustos y redundantes
- **Rendimiento**: Optimización de recursos y cargas
- **Seguridad**: Protección de datos y autenticación
- **Mantenibilidad**: Documentación y scripts claros
- **Escalabilidad**: Arquitectura flexible y extensible

El despliegue exitoso requiere:

1. Preparación adecuada del sistema
2. Configuración correcta de la base de datos
3. Implementación sistemática
4. Monitoreo continuo
5. Mantenimiento preventivo

El sistema está listo para funcionar en entornos de desarrollo, pruebas y producción con configuraciones adecuadas.
# Despliegue de producción de Caguayo en Debian (sin contenedores)

Esta configuración instala Caguayo como servicios nativos de Debian:

- Nginx sirve el frontend compilado y actúa como proxy inverso de /api/.
- FastAPI/Uvicorn se ejecuta mediante systemd, solo en 127.0.0.1:8000.
- PostgreSQL es el servicio local de base de datos.
- systemd inicia PostgreSQL, backend y Nginx al encender el servidor.
- El dominio interno es caguayo.home.arpa.
- HTTPS utiliza una autoridad certificadora local. Los equipos cliente deben confiar en esa CA.
- dnsmasq es opcional para resolver el nombre en toda la LAN. No se configura DHCP.

## 1. Requisitos del servidor

Recomendado: Debian 13 (Trixie) x86_64, con:

- Python 3.13 o superior.
- Node.js 22.12 o superior y pnpm compatible con el lockfile v9.
- uv instalado.
- PostgreSQL instalado y habilitado.
- Nginx y OpenSSL instalados.
- curl, sudo, systemd, psql y createdb.
- dnsmasq, solo si este servidor también prestará DNS local.

Debian 12 no incluye Python 3.13 de forma predeterminada. Si se usa Debian 12, debe prepararse Python 3.13 por un medio compatible y probado antes del despliegue.

**Preparación offline:** los paquetes Debian, Python y Node no se descargan desde estos scripts. En una máquina de preparación con la misma arquitectura y versiones, descarga los paquetes .deb y llena las cachés de uv y pnpm. Transfiere esos paquetes/cachés al servidor por USB, disco local o repositorio LAN. deploy.sh usa explícitamente los modos offline; fallará de forma visible si falta una dependencia en caché.

## 2. Ubicación del proyecto

Instala o copia el repositorio completo en:

    /opt/caguayo

Si se prepara desde otra máquina con Git, puede transferirse un bundle de Git o un archivo del repositorio. No es necesario que el servidor tenga acceso a GitHub.

## 3. Configuración de entorno

Copia las plantillas:

    cd /opt/caguayo
    cp .env.example .env
    cp backend/.env.example backend/.env

Edita ambos archivos. En /opt/caguayo/.env configura como mínimo:

    SECRET_KEY=VALOR_ALEATORIO_LARGO
    AUTH_DATABASE=caguayo
    CENTRAL_DATABASE=caguayo_sa

Genera la clave, por ejemplo:

    openssl rand -hex 32

En backend/.env configura las credenciales reales de PostgreSQL. La base indicada al final de DATABASE_URL debe ser exactamente la misma que AUTH_DATABASE del .env raíz (por defecto, caguayo), porque esa URL es la conexión inicial del backend. POSTGRES_DB y CENTRAL_DATABASE deben coincidir (por defecto, caguayo_sa). La plantilla usa un rol dedicado llamado caguayo, no el superusuario postgres. Cambia change-me por una contraseña aleatoria en DATABASE_URL, POSTGRES_PASSWORD, ADMIN_DB_PASSWORD y LECTOR_PASSWORD (usa el mismo valor para las cuatro) y crea el rol antes del bootstrap:

No conserves las contraseñas de ejemplo. En PostgreSQL ejecuta como administrador local, usando exactamente la contraseña que guardaste en backend/.env:

    sudo -u postgres psql -c "CREATE ROLE caguayo LOGIN CREATEDB PASSWORD 'CONTRASENA_ALEATORIA';"

Protege ambos .env; el instalador los deja como root:caguayo, modo 0640.

## 4. Preparar las cachés offline

En la máquina de preparación, con el mismo checkout y versiones:

    cd /opt/caguayo/backend
    uv sync --frozen --no-dev
    uv cache dir

    cd /opt/caguayo/frontend
    pnpm install --frozen-lockfile
    pnpm store path

Transfiere las cachés de uv y pnpm al usuario que ejecutará el despliegue en el servidor. La caché de pnpm debe ser accesible por ese usuario. Alternativamente, prepara un artefacto de despliegue que ya contenga las dependencias y frontend/dist, respetando las versiones de Python/Node y la arquitectura.

## 5. Construir, migrar e inicializar

Antes de ejecutar el bootstrap, inicia PostgreSQL:

    sudo systemctl enable --now postgresql

Con las dependencias disponibles localmente:

    cd /opt/caguayo
    ./deploy/scripts/deploy.sh

El script:

1. Sincroniza el entorno Python desde la caché offline.
2. Instala dependencias frontend desde el store offline.
3. Compila React con VITE_API_BASE_URL=/api/v1.
4. Crea las bases configuradas si no existen.
5. Ejecuta alembic upgrade heads e inicializa los datos de oficina de cada base.
6. Reinicia el backend si ya estaba activo.

El usuario PostgreSQL indicado en backend/.env debe poder crear bases de datos y aplicar migraciones. Haz un respaldo antes de actualizar una instalación que ya contenga información real.

## 6. Instalar los servicios de producción

El repositorio debe estar en /opt/caguayo y el despliegue anterior debe haber generado .venv y frontend/dist.

    cd /opt/caguayo
    sudo ./deploy/scripts/install-production.sh

El instalador:

- Crea el usuario de sistema sin login caguayo.
- Instala la unidad caguayo-backend.service.
- Configura Nginx para servir frontend/dist y enviar /api/ a FastAPI.
- Genera una CA local y un certificado TLS para caguayo.home.arpa.
- Habilita PostgreSQL, backend y Nginx en el arranque de Debian.

La API no queda expuesta directamente en la LAN: Uvicorn escucha solo en loopback. Publica únicamente HTTPS de Nginx.

## 7. Configurar nombre DNS offline

Asigna al servidor una IP fija o una reserva DHCP, por ejemplo 192.168.1.100. Después, si instalaste dnsmasq:

    sudo ./deploy/scripts/configure-dnsmasq.sh 192.168.1.100

En el router configura el DHCP para entregar 192.168.1.100 como servidor DNS a los equipos de la LAN. Este script no modifica ni habilita DHCP.

Si el router no permite indicar DNS propio, agrega en cada equipo:

    192.168.1.100 caguayo.home.arpa

No uses .local: está reservado para mDNS. home.arpa está destinado a nombres privados de red doméstica/local.

## 8. Confiar en el certificado HTTPS

Copia este certificado público a cada equipo cliente:

    /usr/local/share/ca-certificates/caguayo-local-ca.crt

En Debian/Ubuntu cliente:

    sudo cp caguayo-local-ca.crt /usr/local/share/ca-certificates/
    sudo update-ca-certificates

En Windows, importa el certificado en Equipo local → Entidades de certificación raíz de confianza. En otros sistemas, instálalo en el almacén de autoridades raíz de confianza del sistema/navegador.

No distribuyas la clave privada de la CA: /etc/caguayo/ca/caguayo-local-ca.key.

## 9. Operación y diagnóstico

Acceso de usuario:

    https://caguayo.home.arpa

Comandos:

    sudo systemctl status postgresql caguayo-backend nginx
    sudo systemctl restart caguayo-backend
    sudo journalctl -u caguayo-backend -f
    sudo nginx -t
    ./deploy/scripts/status.sh

Para que los clientes accedan, permite en el firewall solo desde la LAN:

- TCP 443 (HTTPS).
- TCP 80 (solo redirección a HTTPS).
- UDP y TCP 53 si dnsmasq presta DNS.

No abras a la LAN los puertos 8000 (FastAPI) ni 5432 (PostgreSQL).

## 10. Consideraciones offline

El funcionamiento normal de la aplicación no requiere Internet si todos sus recursos y servicios están en la LAN. Esta configuración no instala ni configura actualizaciones del sistema operativo, sincronización externa, correo, servicios de terceros ni respaldos fuera del servidor. Revisa las funcionalidades que dependan de servicios externos antes de declarar el entorno completamente aislado.

Haz respaldos periódicos de PostgreSQL y de los archivos de configuración/empresa. El dominio solo será resoluble desde equipos que usen el DNS local o tengan la entrada correspondiente en hosts.

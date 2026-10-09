# ETL de migración: legacy MariaDB → PostgreSQL

Recupera los datos del sistema viejo (MariaDB, PHP) y los carga en
`caguayo_sa` (PostgreSQL). Vive aquí, dentro del repositorio, para que la
migración sea reproducible: cualquiera con el repo y los dos dumps puede
reconstruir la base desde cero.

## Cómo se ejecuta

No tiene entorno propio. Las únicas dependencias de terceros son `psycopg2` y
`bcrypt`, y las dos ya están en el venv del backend, así que se ejecuta con el
Python de `backend/`:

```bash
cd etl
../backend/.venv/bin/python main.py                # simulación: no escribe
../backend/.venv/bin/python main.py --commit       # ejecuta la migración
```

Si se prefiere un entorno aislado, `requirements.txt` lista lo necesario.

Por omisión es simulación. Nada se escribe en la base hasta pasar `--commit`.
Una fase ya ejecutada se puede volver a lanzar: todas son idempotentes y la
segunda pasada no inserta nada.

## Fases

Cada fase tiene su módulo `migrar_*.py` y su flag `--solo-*` para lanzarla
aislada. Sin flags se ejecutan todas en orden.

| Flag | Fase | Qué trae |
|---|---|---|
| *(ninguno)* | A, B, C | Artistas, clientes, TCP/MIPYME |
| `--solo-corregidos` | D | Artistas con CI inválido, normalizados y marcados `valido = false` |
| `--solo-cuentas` | E | Cuentas bancarias |
| `--solo-usuarios` | F | Usuarios, con la contraseña hasheada a bcrypt |
| `--solo-cuentas-dep` | G | Cuentas de las dependencias |
| `--solo-especialidades` | H | Especialidades del artista y su enlace al cliente |
| `--solo-catalogo` | I | Catálogos `tipo_contrato` y `tipo_convenio` |
| `--solo-grupos` | J | Grupos del legacy y reasignación de usuarios |

## Variables de entorno

Todas tienen valor por defecto, así que en esta máquina funciona sin
configurar nada. Se leen de `../.env` (el del proyecto) o del entorno.

| Variable | Por defecto | Para qué |
|---|---|---|
| `PROYECTO_DIR` | `/home/admin/caguayo` | Dónde está el `.env` del proyecto |
| `DUMP_MARIADB` | ruta absoluta de esta máquina | Dump de `caguayo_comercial` |
| `DUMP_CAGUAYO` | ruta absoluta de esta máquina | Dump de la base principal `caguayo` |
| `PG_HOST` / `DB_HOST` | `127.0.0.1` | Servidor PostgreSQL |
| `PG_PORT` / `DB_PORT` | `5432` | Puerto |
| `PG_USER` / `POSTGRES_USER` | `postgres` | Usuario |
| `PG_PASSWORD` / `POSTGRES_PASSWORD` | `postgres` | Contraseña |
| `PG_DB` / `POSTGRES_DB` | `caguayo_sa` | Base de destino |
| `TAMANO_LOTE` | `200` | Filas por lote al insertar |

**Las rutas de los dumps por defecto son absolutas y de esta máquina.** En
otro equipo hay que exportarlas; no hay lógica para descubrirlas.

## De dónde salen los datos

Los catálogos no están en una sola base, y esto es lo más fácil de equivocar:

- `caguayo_comercial` (el `DUMP_MARIADB` de siempre) **no tiene ni una fila de
  `tipo_convenio`**, y su `tipo_contrato` sólo llega hasta el id 7.
- La base principal `caguayo` (`DUMP_CAGUAYO`) es la que aporta los cuatro
  tipos de convenio y los cuatro tipos de contrato que faltan.

Los ids de ambas se solapan **con significado distinto**: `tipo_contrato`
id 7 es "CONTRATO DE OBRA POR ENCARGO" en una y "Prestación de Servicios -
Impresión" en la otra. Por eso los catálogos se unen por **nombre
normalizado** y el id lo asigna PostgreSQL. Migrar por id dejaría mal
clasificados 201 de los 214 contratos legacy.

## Correcciones a mano

Hay datos que el legacy trae mal y no se pueden arreglar solos. Viven en tablas
explícitas, con el motivo escrito al lado, y dejan un `WARNING` en
`migracion_log` al aplicarse:

- `CORRECCIONES_CI` en `migrar_usuarios.py`. Ileana Chuy e Isabel Alcántara
  comparten el CI `11111111111` y el legacy no guarda el real de ninguna. Al
  de Ileana se le cambia un dígito para que sea único: **es un marcador, hay
  que sustituirlo por su cédula real.**
- `FUSIONES` en `migrar_especialidades.py`. Une etiquetas que son la misma
  especialidad con otro plural o en femenino. No es heurística difusa: es una
  lista cerrada y revisada.

## Trazabilidad

- `migracion_log`: cada descarte, aviso y error, con tabla, motivo y detalle.
- `data/migracion_rechazos.csv`: los descartes en CSV. Es salida generada y
  está en `.gitignore`.
- `verificar()` se llama al final de cada fase y comprueba duplicados,
  huérfanos y el estado del log. Falla si queda algún `ERROR` registrado.

## Desde la aplicación

Configuración → Migración sube los dos ficheros del legacy (uno por base) y
lanza este ETL. La operación **sólo inserta**: no borra ni actualiza, y como
todo aquí es idempotente, si la base ya está migrada sale con 0 inserciones.

Sirve sobre todo para migrar un dump distinto del que se migró la vez
anterior, o para montar un entorno nuevo.

**Depende de que la aplicación vea el disco.** El backend lanza este ETL como
subproceso y le pasa por entorno las rutas de los ficheros subidos. Eso sólo
funciona si el ETL y `etl/data/subidas/` están en el mismo sistema de ficheros
que el backend, y la aplicación **no está en un contenedor** (corre con
`uv run uvicorn`). Si algún día se contenedoriza, esta pantalla deja de
funcionar tal cual y necesita un volumen montado o una vía de servicio aparte.

Antes de hacer nada comprueba que la base del ETL y la que sirve la aplicación
son la misma (`AUTH_DATABASE`, `POSTGRES_DB` y la de `DATABASE_URL`): si
difieren devuelve 409 y no migra. Y hay un advisory lock, porque dos
migraciones simultáneas se pisan.

## Salvaguardas

- El grupo `id 1` del destino no se toca nunca: `auth_service.py` lo usa fijo
  al registrar usuarios.
- La Fase H no borra especialidades, las desactiva. La FK es
  `ON DELETE SET NULL`, así que un borrado duro vaciaría en silencio el campo
  de los artistas que la usan.
- Ninguna fase borra clientes ni usuarios. Sólo inserta, actualiza y descarta.

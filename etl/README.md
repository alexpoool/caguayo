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

## Los volcados del legacy

El ETL no lee del legacy: lee **volcados** suyos, dos. Sin ellos no arranca, y
el error dice dónde los buscó. Se dejan en `etl/dumps/`, que es donde se
buscan por defecto, así que una vez preparado eso no hay que exportar nada
nunca más.

```bash
cd etl
../backend/.venv/bin/python main.py --instrucciones  # qué hace falta, cómo
../backend/.venv/bin/python main.py --generar-dumps  # los saca del MariaDB
../backend/.venv/bin/python main.py --adoptar A.sql B.sql   # instala los que ya tengas
```

`--instrucciones` imprime el manual completo: requisitos, los dos comandos
`mysqldump` con sus flags obligatorios, y el orden de la migración en una
máquina nueva. No toca disco ni base.

`--generar-dumps` usa `mysqldump` (o `mariadb-dump`), que tiene que estar en el
PATH. Configura el legacy con `LEGACY_HOST`, `LEGACY_PORT`, `LEGACY_USER`,
`LEGACY_PASSWORD`, `LEGACY_DB_COMERCIAL` y `LEGACY_DB_PRINCIPAL`. Si no hay
contraseña y hay terminal, la pregunta; si no hay terminal, se dice en vez de
esperar en balde.

`--adoptar` es el camino cuando el legacy ya no está y sólo quedan los
respaldos. Los dos caminos terminan igual: **el volcado se valida con el mismo
parser que usa la migración** y, sólo si sale bien, se mueve a su sitio. Un
volcado a medias, sin alguna tabla o con una vacía, no se queda instalado.

Sólo hacen falta 7 tablas, ni una más:

| Volcado | De qué base | Tablas |
|---|---|---|
| `comercial.sql` | `caguayo_comercial` | `artista`, `cliente`, `usuario`, `grupo`, `empresa` |
| `principal.sql` | `caguayo` (principal) | `tipo_contrato`, `tipo_convenio` |

`provincia` y `municipio` no hacen falta: su mapeo de ids está en `geo.py`.
Exportar sólo esas 7 da un volcado mucho más pequeño y no arrastra facturas ni
movimientos que nadie va a migrar.

`etl/dumps/` está en `.gitignore`: estos ficheros llevan CI y NITs de personas.

### Pruebas

```bash
cd etl && ../backend/.venv/bin/python -m pytest tests -q
```

Usan el pytest del venv del backend, que ya está. Hay un test de sincronía que
escanea las fases y falla si una lee una tabla que `generar_dumps` no exporta:
sin él, un volcado validado podría quedarse sin la tabla que una fase nueva
necesite, y reventaría en pleno `--commit`.

Lo que **no** cubren: que un MariaDB real acepte los flags y devuelva los
datos. En una máquina con el legacy a mano:

```bash
export LEGACY_HOST=... LEGACY_USER=... LEGACY_PASSWORD=...
../backend/.venv/bin/python main.py --generar-dumps
../backend/.venv/bin/python main.py     # debe decir "Filas a migrar: N"
```

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

Un `--solo-*` sólo exige el volcado que esa fase lee. La excepción es
`--solo-catalogo`, que lee `tipo_contrato` en los dos ficheros.

## Variables de entorno

Todas tienen valor por defecto. Se leen del entorno y, si no están ahí, de los
ficheros de configuración:

| Variable | Por defecto | Para qué |
|---|---|---|
| `PROYECTO_DIR` | la raíz del repo | Dónde se buscan los `.env` |
| `DUMP_DIR` | `etl/dumps` | Carpeta donde viven los volcados |
| `DUMP_MARIADB` | `$DUMP_DIR/comercial.sql` | Dump de `caguayo_comercial` |
| `DUMP_CAGUAYO` | `$DUMP_DIR/principal.sql` | Dump de la base principal `caguayo` |
| `PG_HOST` / `DB_HOST` | `127.0.0.1` | Servidor PostgreSQL |
| `PG_PORT` / `DB_PORT` | `5432` | Puerto |
| `PG_USER` / `POSTGRES_USER` | `postgres` | Usuario |
| `PG_PASSWORD` / `POSTGRES_PASSWORD` | `postgres` | Contraseña |
| `PG_DB` / `POSTGRES_DB` | `caguayo_sa` | Base de destino |
| `TAMANO_LOTE` | `200` | Filas por lote al insertar |
| `LEGACY_HOST` | `127.0.0.1` | MariaDB del legacy (sólo `--generar-dumps`) |
| `LEGACY_PORT` | `3306` | Puerto del legacy |
| `LEGACY_USER` | `root` | Usuario del legacy |
| `LEGACY_PASSWORD` | *(preguntada)* | Contraseña del legacy |
| `LEGACY_DB_COMERCIAL` | `caguayo_comercial` | Base del volcado comercial |
| `LEGACY_DB_PRINCIPAL` | `caguayo` | Base del volcado principal |

El orden es: **entorno real** y, si una variable no aparece ahí,
`PROYECTO_DIR/backend/.env` y después `PROYECTO_DIR/.env`. El primero gana; el
segundo sólo rellena lo que falte.

La configuración de PostgreSQL vive en `backend/.env`, que es su sitio: es el
fichero que la aplicación lee con `load_dotenv()`, de modo que el ETL y el
backend leen la misma configuración de la misma fuente. El `.env` de la raíz
se conserva porque `scripts/dev.sh` y `scripts/setup.sh` lo sourcean.

`PROYECTO_DIR` se deduce de dónde está el propio ETL, así que no hay que
exportarlo en ningún sitio salvo para moverlo. Las variables `DUMP_*` y
`LEGACY_*` también salen de los `.env`, así que se pueden dejar escritas ahí
en vez de exportarlas en cada uso.

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
son la misma: si difieren devuelve 409 y no migra. Y hay un advisory lock,
porque dos migraciones simultáneas se pisan.

La comprobación no adivina: el backend carga este mismo `etl/config.py` y le
pregunta a qué base va a escribir, y del lado de la aplicación usa la base de
la sesión. Las dos son distintas a propósito —una viene del `POSTGRES_DB` del
ETL, la otra de la sesión—, para que el guard pueda detectar que se han
separado. Si la base del ETL no se puede determinar (un despliegue sin el
directorio `etl/`, por ejemplo), no bloquea: avisa en pantalla y deja migrar.

## Salvaguardas

- El grupo `id 1` del destino no se toca nunca: `auth_service.py` lo usa fijo
  al registrar usuarios.
- La Fase H no borra especialidades, las desactiva. La FK es
  `ON DELETE SET NULL`, así que un borrado duro vaciaría en silencio el campo
  de los artistas que la usan.
- Ninguna fase borra clientes ni usuarios. Sólo inserta, actualiza y descarta.

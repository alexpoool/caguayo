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

Sólo hacen falta 15 tablas, ni una más:

| Volcado | De qué base | Tablas |
|---|---|---|
| `comercial.sql` | `caguayo_comercial` | `artista`, `cliente`, `usuario`, `grupo`, `empresa`, `artista_liquidacion`, `tipo_concepto`, `contrato`, `suplemento`, `solicitud_sc`, `estado_cs`, `etapas_cs`, `artista_contrato` |
| `principal.sql` | `caguayo` (principal) | `tipo_contrato`, `tipo_convenio` |

Cuatro de las de la comercial no se migran a una tabla propia: se leen sólo para
resolver ids. `solicitud_sc` es el puente de `contrato` a `clientes` —en el
legacy el contrato no guarda el cliente, lo guarda la solicitud—, `estado_cs`
traduce el estado del legacy al del destino y `tipo_concepto` da el nombre del
concepto de una liquidación.

`provincia` y `municipio` no hacen falta: su mapeo de ids está en `geo.py`.
Exportar sólo esas 13 da un volcado mucho más pequeño y no arrastra facturas ni
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
| `--solo-catalogo` | I | Catálogo `tipo_contrato` |
| `--solo-grupos` | J | Grupos del legacy y reasignación de usuarios |
| `--solo-liquidaciones` | K | Liquidaciones del legacy, por artista |
| `--solo-contratos` | L | Contratos del legacy, resueltos por su solicitud |
| `--solo-suplementos` | M | Suplementos del legacy, colgados de sus contratos |
| `--solo-solicitudes` | N | Solicitudes del legacy, enlazadas a su contrato |
| `--solo-etapas` | O | Etapas del legacy, con su tarea y sus realizadores |
| `--solo-liquidaciones-etapa` | P | Las mismas liquidaciones de la K, pero colgadas de su etapa y su realizador |

`--solo-liquidaciones-etapa` necesita la O previa: cada liquidación cuelga de
una etapa y dice qué realizador se lleva el dinero, y las dos cosas las pone la
O. Sin ella no hay dónde colocar nada y las 4.362 salen descartadas.

Un `--solo-*` sólo exige el volcado que esa fase lee. La excepción es
`--solo-catalogo`, que lee `tipo_contrato` en los dos ficheros.

`--solo-etapas` sin la fase N previa sólo localiza las solicitudes con código
propio del legacy: las 324 que no lo traen necesitan el mapa que pasa la N, y sin
él sus contratos se quedan sin realizadores. En la cadena completa no pasa,
porque la N va siempre antes.

### Los códigos que se generan

Cuatro columnas salen del ETL con un valor, y conviene saber de dónde:

- **`contrato.codigo`** — `FT.{codigo_contrato}` del legacy (`2022.021` →
  `FT.2022.021`; contrato sin código —0 hoy— → `FT.LEG-{id}`), con el id detrás
  si el código chocó con otro contrato (`FT.2014.019-388`) y `1.FT.…`/`2.FT.…`
  los partidos por moneda. La Fase M (suplementos) y la N emparejan con este
  código compuesto.
- **`solicitud_servicio.codigo_solicitud`** — `FT.{codigo_solicitudsc}` del
  legacy (`2014.001` → `FT.2014.001`) en las que lo traen; `FT.{codigo_contrato}`
  del contrato del que vienen en las 324 que no lo traen (la 3172, contrato
  `2022.021` → `FT.2022.021`; ninguna colisiona porque cada solicitud tiene a lo
  sumo un contrato); y `FT.AA.id_solicitudsc` si ni contrato tiene. El
  `id_solicitudsc` hace el código único y estable, y como `siguiente_secuencia`
  toma el `MAX` del último segmento, un contrato creado a mano después sale por
  encima de los migrados.
- **`solicitud_servicio.codigo_proyecto`** — `FT.AA.NNN`, sólo para las solicitudes
  con `aprobado` **y** `id_contrato`. Es la misma regla que aplica la aplicación
  en `servicio_service.py:187-190`. Sin las dos cosas la fila todavía no es un
  proyecto y lo seguirá sin él; `update()` se lo dará si algún día lo es.
- **`tareas_etapa.codigo_extendido`** — `GEN`, el servicio genérico, en las 3.757
  tareas. El legacy no trae catálogo de servicios (sólo `tipo_concepto`) y los
  `nombre_etapa` son 2.568 textos libres, así que no hay con qué emparejar tarea
  por tarea. La fase O crea una fila en `servicios` con ese código, la busca antes
  de insertar porque `codigo_servicio` es UNIQUE, y le cuelga todas las tareas.
  `concepto_modificado` no se toca: sigue siendo el nombre de la etapa, que es lo
  que muestran la tabla y los PDF.
- **`persona_liquidacion.numero`** — `FT.AA.<id_liquidacion del legacy>`. No se
  copia `numero_liquidacion`: sólo tiene 903 valores distintos en 4.362 filas y
  no puede ser clave. El año sale de la fecha de la liquidación y no del reloj
  como en la aplicación (`servicio_service.py:875`), porque este número es lo
  que permite reconocer en la segunda pasada lo que escribió la primera.

Las etapas **no tienen código**. La columna no existe en la tabla y nadie la lee;
si algún día hace falta, sale al vuelo de `{codigo_solicitud}.{numero_etapa}`
sin tocar la base.

Las cuatro son idempotentes: la segunda pasada no cambia nada.

`verificar.py` lo comprueba con cuatro controles —`codigo_proyecto inconsistente`,
`servicio generico GEN inconsistente`, `codigo_extendido inconsistente con su
servicio` e `importe descuadrado con por_cobrar`—. El tercero es el que avisaría si
alguien asigna un servicio real a una tarea y el código no se mueve con él, porque
`TareaEtapaService.update` no lo recalcula. El cuarto es el que agarra a las dos
mitades de la fase O y la P: `persona_etapa.por_cobrar` no es un dato propio sino
que la aplicación lo recalcula sumando el `importe` de las liquidaciones
confirmadas de esa persona en esa etapa (`servicio_repo.py:358-371`), así que si
las dos no dan el mismo número, el primero que edite una liquidación mueve el
`por_cobrar` por debajo de la vista.

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

`etl/dumps/` está en `.gitignore`: son varios MB con CI y NITs de personas, y
un clon recién hecho no los trae. La pantalla de migración lo avisa y dice
dónde esperarlos; el backend devuelve un 400 con lo mismo en vez de dejar que
el subproceso reviente.

## De dónde salen los datos

`comercial.sql` trae las cinco tablas de las fases A a H y J, más las nueve
filas de `tipo_contrato` que necesita la Fase I, y de ellas salen también las
filas TCP/MIPYME: la Fase C las saca de la propia `cliente`, no de otra tabla.

Una cosa no está: **`tipo_convenio` no sale de este volcado**, porque
`caguayo_comercial` no tiene esa tabla. Para migrarla haría falta `principal.sql`,
volcado de la base principal `caguayo`. Sin él, la Fase I migra `tipo_contrato` y
se salta `tipo_convenio`, dejándolo anotado en `migracion_log` con un `WARNING`
en vez de fingir que sí.

En PostgreSQL quedan entonces los dos valores de la semilla, y sólo `COMPRA
VENTA` está en uso, con un convenio apuntando. Si algún día hace falta otro tipo
de convenio, se añade a mano; las nueve fases restantes no dependen de él.

El `tipo_contrato` sí migra, y entra **por nombre normalizado, no por id**: el
id del legacy no se transporta y lo asigna PostgreSQL. Así un "Compra-Venta"
del legacy y un "compra venta" ya cargado se reconocen como el mismo tipo en
vez de insertar un duplicado por el guion.

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
- **`reglas_legacy.py`** (fases K, L y M). Cuatro cosas que el legacy no puede
  responder, aplicadas fila a fila y siempre con `WARNING`:
  - **CUC se traduce a USD.** El destino no tiene CUC y no hay tipo de cambio con
    el que convertirlo. Son 3.828 liquidaciones y 2.535 contratos: el importe no
    cambia, la etiqueta sí, y eso hay que saberlo antes de fiarse de un histórico.
  - **`vigencia` y `fecha_vigencia` se rellenan con `fecha`.** El legacy no las
    guarda y el destino las tiene NOT NULL. Quedan 3.387 contratos con la
    vigencia igual a su inicio, que en la interfaz puede leerse como vencido.
  - **Un documento sin fecha** (8 liquidaciones, 4 contratos) toma la fecha más
    antigua de los documentos de su mismo grupo: del mismo artista o el mismo
    cliente.
  - **Sin tipo o sin estado** (82 y 14 contratos) va al tipo más usado y a
    PENDIENTE. Sin estado no significa vigente: significa que nadie lo dijo
    todavía.

## Trazabilidad

- `migracion_log`: cada descarte, aviso y error, con tabla, motivo y detalle.
- `data/migracion_rechazos.csv`: los descartes en CSV. Es salida generada y
  está en `.gitignore`.
- `verificar()` se llama al final de cada fase y comprueba duplicados,
  huérfanos y el estado del log. Falla si queda algún `ERROR` registrado.

## Desde la aplicación

Configuración → Migración lanza este ETL. La pantalla sólo tiene un botón: los
volcados se fabrican antes con `main.py --generar-dumps` (mysqldump contra el
legacy) o `--adoptar` (un `.sql` que ya exista) y no se sube nada desde la
interfaz. Para migrar otro legacy se repite ese paso.

La operación **sólo inserta**: no borra ni actualiza, y como todo aquí es
idempotente, si la base ya está migrada sale con 0 inserciones.

**Depende de que la aplicación vea el disco.** El backend lanza este ETL como
subproceso con `cwd` en esta carpeta, así que sólo funciona si el ETL está en el
mismo sistema de ficheros que el backend, y la aplicación **no está en un
contenedor** (corre con `uv run uvicorn`). Si algún día se contenedoriza, esta
pantalla deja de funcionar tal cual y necesita un volumen montado o una vía de
servicio aparte.

**Depende de que la aplicación vea el disco.** El backend lanza este ETL como
subproceso con `cwd` en esta carpeta, así que sólo funciona si el ETL está en el
mismo sistema de ficheros que el backend, y la aplicación **no está en un
contenedor** (corre con `uv run uvicorn`). Si algún día se contenedoriza, esta
pantalla deja de funcionar tal cual y necesita un volumen montado o una vía de
servicio aparte.

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

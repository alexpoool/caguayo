"""Renombra las liquidaciones creadas por la app después del ETL.

El ETL deja los números visibles del legacy (`LEG-115-5662` en compras,
`FT.26.115` en proyectos). La app vieja no los leía: en proyectos usaba la PK
(`FT.26.4363`) y en compras el máximo por cliente (reiniciaba en `001` si el
cliente no tenía códigos). Este script deja la serie consecutiva:

  · Proyectos: `FT.26.115` -> la siguiente pasa a `FT.26.116`.
  · Compras: `LEG-115-5662` -> la siguiente pasa a `CAG.26.<cliente>.116`.

No toca las filas del ETL. En proyectos distingue las filas de la app porque su
secuencia supera el máximo del legacy para ese año; el máximo sale del dump de
MariaDB (o de `--legacy-max`). En compras distingue por el prefijo: las filas
del ETL empiezan por `LEG-` y las de la app no.

Es idempotente: una segunda pasada vuelve a calcular los mismos códigos. Corre
en una transacción, toma los mismos locks por año que la app y bloquea las
tablas para que no se cruce con un alta.

Uso:
    uv run python scripts/renumerar_liquidaciones_post_etl.py --dry-run
    uv run python scripts/renumerar_liquidaciones_post_etl.py --commit
    uv run python scripts/renumerar_liquidaciones_post_etl.py --commit --db nombre_bd
    uv run python scripts/renumerar_liquidaciones_post_etl.py --dry-run --legacy-max 115
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
PROYECTO = BACKEND_DIR.parent
ETL_DIR = PROYECTO / "etl"

sys.path.insert(0, str(BACKEND_DIR))
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))
load_dotenv(BACKEND_DIR / ".env")

from src.utils.codigos_entidad import (  # noqa: E402
    bloquear_secuencia_liquidacion,
    generar_codigo_liquidacion,
    secuencia_de_codigo,
)


def _database_url(db_name: str | None) -> str:
    url = os.environ["DATABASE_URL"]
    if db_name:
        url = url.rsplit("/", 1)[0] + "/" + db_name
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")
    elif url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+asyncpg://")
    return url


def _entero_positivo(valor) -> int | None:
    try:
        numero = int(str(valor).strip())
    except (TypeError, ValueError):
        return None
    return numero if numero > 0 else None


def _max_legacy_desde_dump(ruta: Path) -> dict[int, int]:
    """`año -> numero_liquidacion` máximo del dump de MariaDB.

    Para las filas sin fecha usa la fecha más antigua de otra liquidación del
    mismo artista, igual que la Fase P del ETL. Si tampoco hay, el ETL usa
    1900-01-01; esas filas no compiten con los años reales.
    """
    from fuente import leer_tabla
    from limpieza import fecha as fecha_legado

    _, filas = leer_tabla(ruta, "artista_liquidacion")

    fechas_por_artista: dict[object, list[str]] = defaultdict(list)
    for fila in filas:
        fecha = fecha_legado(fila.get("fecha_emision"))
        if fecha:
            fechas_por_artista[fila.get("id_artista")].append(fecha)

    maximos: dict[int, int] = {}
    for fila in filas:
        numero = _entero_positivo(fila.get("numero_liquidacion"))
        if numero is None:
            continue

        fecha = fecha_legado(fila.get("fecha_emision"))
        if not fecha:
            candidatas = sorted(fechas_por_artista.get(fila.get("id_artista"), []))
            fecha = candidatas[0] if candidatas else "1900-01-01"

        anio = int(fecha[:4])
        maximos[anio] = max(maximos.get(anio, 0), numero)

    return maximos


def _prefijo(codigo: str, defecto: str) -> str:
    """Prefijo visible del código, saltando la copia por moneda (`1.`/`2.`)."""
    partes = [parte.strip() for parte in codigo.split(".") if parte.strip()]
    if not partes:
        return defecto
    if len(partes) > 1 and partes[0].isdigit():
        return partes[1]
    return partes[0]


def _plan_proyectos(
    filas: list[tuple[int, str, int]],
    maximos_legacy: dict[int, int],
) -> list[tuple[int, str, str]]:
    """Cambios de `persona_liquidacion`: `(id, código_actual, código_nuevo)`."""
    por_anio: dict[int, list[tuple[int, str, int | None]]] = defaultdict(list)
    for id_liquidacion, numero, anio in filas:
        por_anio[anio].append((id_liquidacion, numero, secuencia_de_codigo(numero)))

    plan: list[tuple[int, str, str]] = []
    for anio in sorted(por_anio):
        maximo_legacy = maximos_legacy.get(anio, 0)
        siguiente = maximo_legacy + 1

        for id_liquidacion, numero, secuencia in por_anio[anio]:
            # Las filas del ETL nunca superan el máximo del dump. Las de la app
            # llevan la PK y sí lo superan.
            if secuencia is None or secuencia <= maximo_legacy:
                continue

            prefijo = _prefijo(numero, "FT")
            nuevo = f"{prefijo}.{str(anio)[-2:]}.{siguiente}"
            plan.append((id_liquidacion, numero, nuevo))
            siguiente += 1

    return plan


def _plan_compras(
    filas: list[tuple[int, str, int, int]],
) -> list[tuple[int, str, str]]:
    """Cambios de `liquidacion`: `(id, código_actual, código_nuevo)`.

    `filas` trae `(id_liquidacion, codigo, anio, id_cliente)`. Las filas del
    ETL empiezan por `LEG-`; todo lo demás lo creó la app.
    """
    por_anio: dict[int, list[tuple[int, str, int, int | None]]] = defaultdict(list)
    for id_liquidacion, codigo, anio, id_cliente in filas:
        por_anio[anio].append(
            (id_liquidacion, codigo, id_cliente, secuencia_de_codigo(codigo))
        )

    plan: list[tuple[int, str, str]] = []
    for anio in sorted(por_anio):
        maximo_legacy = 0
        for _, codigo, _, secuencia in por_anio[anio]:
            if codigo.upper().startswith("LEG-") and secuencia is not None:
                maximo_legacy = max(maximo_legacy, secuencia)

        siguiente = maximo_legacy + 1
        for id_liquidacion, codigo, id_cliente, secuencia in por_anio[anio]:
            if codigo.upper().startswith("LEG-") or secuencia is None:
                continue
            if id_cliente is None:
                continue

            prefijo = _prefijo(codigo, "CAG")
            nuevo = generar_codigo_liquidacion(prefijo, anio, id_cliente, siguiente)
            plan.append((id_liquidacion, codigo, nuevo))
            siguiente += 1

    return plan


async def _leer_proyectos(db) -> list[tuple[int, str, int]]:
    result = await db.exec(
        text(
            "SELECT id_liquidacion, numero, "
            "EXTRACT(YEAR FROM fecha_emision)::int AS anio "
            "FROM persona_liquidacion "
            "WHERE numero IS NOT NULL AND numero <> '' "
            "ORDER BY fecha_emision, id_liquidacion"
        )
    )
    return [(fila[0], fila[1], fila[2]) for fila in result.all()]


async def _leer_compras(db) -> list[tuple[int, str, int, int]]:
    result = await db.exec(
        text(
            "SELECT id_liquidacion, codigo, "
            "EXTRACT(YEAR FROM fecha_emision)::int AS anio, id_cliente "
            "FROM liquidacion "
            "WHERE codigo IS NOT NULL AND codigo <> '' "
            "ORDER BY fecha_emision, id_liquidacion"
        )
    )
    return [(fila[0], fila[1], fila[2], fila[3]) for fila in result.all()]


async def _aplicar(db, plan_proyectos, plan_compras) -> None:
    for id_liquidacion, _, nuevo in plan_proyectos:
        await db.exec(
            text(
                "UPDATE persona_liquidacion SET numero = :numero "
                "WHERE id_liquidacion = :id"
            ),
            params={"numero": nuevo, "id": id_liquidacion},
        )

    if plan_compras:
        ids = ", ".join(str(int(cambio[0])) for cambio in plan_compras)
        # `codigo` es UNIQUE: primero se liberan los valores viejos y después
        # se asignan los definitivos.
        await db.exec(
            text(
                "UPDATE liquidacion SET codigo = 'TMP-' || id_liquidacion "
                f"WHERE id_liquidacion IN ({ids})"
            )
        )
        for id_liquidacion, _, nuevo in plan_compras:
            await db.exec(
                text(
                    "UPDATE liquidacion SET codigo = :codigo WHERE id_liquidacion = :id"
                ),
                params={"codigo": nuevo, "id": id_liquidacion},
            )


def _imprimir(plan, titulo: str) -> None:
    print(f"\n{titulo}: {len(plan)} fila(s)")
    for id_liquidacion, actual, nuevo in plan:
        print(f"  id={id_liquidacion}  {actual} -> {nuevo}")


async def renumerar(
    db_name: str | None,
    *,
    commit: bool,
    legacy_max: int | None,
    dump: Path | None,
) -> None:
    if legacy_max is not None:
        maximos_legacy = {anio: legacy_max for anio in range(1900, 2200)}
    else:
        ruta_dump = dump or Path(
            os.getenv("DUMP_MARIADB", str(ETL_DIR / "dumps" / "comercial.sql"))
        )
        if not ruta_dump.exists():
            raise SystemExit(
                f"No existe el dump {ruta_dump}. Indica --dump o --legacy-max."
            )
        maximos_legacy = _max_legacy_desde_dump(ruta_dump)

    engine = create_async_engine(_database_url(db_name), echo=False, future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        if commit:
            async with db.begin():
                # Primero se leen los años para tomar los mismos locks que la
                # app. Si se tomaran las tablas primero, una alta que ya tiene
                # el lock de su año esperaría a la tabla y el script al lock:
                # deadlock. Con los locks de año por delante, la app espera
                # antes de leer la secuencia.
                filas_proyectos = await _leer_proyectos(db)
                filas_compras = await _leer_compras(db)
                anios = {fila[2] for fila in filas_proyectos}
                anios.update(fila[2] for fila in filas_compras)
                anios.add(date.today().year)
                anios.add(date.today().year + 1)

                for anio in sorted(anios):
                    await bloquear_secuencia_liquidacion(
                        db, "persona_liquidacion", "numero", anio
                    )
                    await bloquear_secuencia_liquidacion(
                        db, "liquidacion", "codigo", anio
                    )

                await db.exec(
                    text("LOCK TABLE persona_liquidacion IN SHARE ROW EXCLUSIVE MODE")
                )
                await db.exec(
                    text("LOCK TABLE liquidacion IN SHARE ROW EXCLUSIVE MODE")
                )

                # Releer ya con los locks: la primera lectura sólo sirvió para
                # conocer los años.
                filas_proyectos = await _leer_proyectos(db)
                filas_compras = await _leer_compras(db)
                plan_proyectos = _plan_proyectos(filas_proyectos, maximos_legacy)
                plan_compras = _plan_compras(filas_compras)

                _imprimir(plan_proyectos, "Proyectos (persona_liquidacion)")
                _imprimir(plan_compras, "Compras (liquidacion)")

                await _aplicar(db, plan_proyectos, plan_compras)
                print("\nCambios aplicados en la transacción.")
        else:
            filas_proyectos = await _leer_proyectos(db)
            filas_compras = await _leer_compras(db)
            plan_proyectos = _plan_proyectos(filas_proyectos, maximos_legacy)
            plan_compras = _plan_compras(filas_compras)

            _imprimir(plan_proyectos, "Proyectos (persona_liquidacion)")
            _imprimir(plan_compras, "Compras (liquidacion)")
            print("\nDry-run: no se escribió nada. Usa --commit para aplicar.")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Renumera las liquidaciones creadas después del ETL."
    )
    parser.add_argument(
        "--db",
        help="Nombre de la base de datos; por defecto la de DATABASE_URL.",
    )
    modo = parser.add_mutually_exclusive_group()
    modo.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra los cambios sin escribir (por defecto).",
    )
    modo.add_argument(
        "--commit",
        action="store_true",
        help="Aplica los cambios en una transacción.",
    )
    parser.add_argument(
        "--legacy-max",
        type=int,
        help=(
            "Máximo del legacy para todos los años. Evita leer el dump; úsalo "
            "sólo si sabes el valor (2026: 115)."
        ),
    )
    parser.add_argument(
        "--dump",
        type=Path,
        help="Ruta del dump de MariaDB (por defecto etl/dumps/comercial.sql).",
    )
    args = parser.parse_args()

    asyncio.run(
        renumerar(
            args.db,
            commit=args.commit,
            legacy_max=args.legacy_max,
            dump=args.dump,
        )
    )


if __name__ == "__main__":
    main()

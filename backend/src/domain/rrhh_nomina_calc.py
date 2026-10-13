"""Cálculo de deducciones y bonificaciones (Fase 5).

Funciones puras, sin acceso a BD ni a FastAPI. Se ocupan de dos cosas:

- **monto_aplicado**: traduce el `valor` guardado a dinero efectivo. El tipo
  define si es un importe fijo o un porcentaje sobre el salario; los dos
  movimientos guardan el número crudo y la conversión ocurre aquí.
- **solape de periodos**: dos movimientos del mismo tipo y empleado no pueden
  solaparse, porque el mismo concepto se cobraría dos veces en la ventana
  compartida.

Convención decidida en la Fase 0: un movimiento se aplica **completo una
sola vez**, en la nómina de su periodo. El registro en las tablas puente
`nomina_deducciones`/`nomina_bonificaciones` es lo que impide el doble cobro
en periodos posteriores.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

DOS_DECIMALES = Decimal("0.01")

# Un porcentaje no puede superar el 100 % del salario.
LIMITE_PORCENTAJE = Decimal("100")


def redondear(valor: Decimal) -> Decimal:
    """Redondea a 2 decimales, con la mitad hacia arriba (comerciales)."""
    return valor.quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)


def validar_porcentaje(valor: Decimal) -> bool:
    """Si un valor marcado como porcentaje está en el rango admisible."""
    return Decimal("0") <= valor <= LIMITE_PORCENTAJE


def monto_aplicado(
    valor: Decimal,
    es_porcentaje: bool,
    salario: Decimal | None,
) -> Decimal:
    """Dinero efectivo que representa un movimiento.

    Si el tipo es porcentual, el resultado es el porcentaje del salario del
    empleado. Si el empleado no tiene salario registrado no se puede convertir
    el porcentaje, así que el monto es 0 (no se descuenta nada a ciegas).

    Los tipos fijos devuelven el valor tal cual.
    """
    if not es_porcentaje:
        return redondear(valor)
    if salario is None:
        return Decimal("0.00")
    return redondear(valor * salario / Decimal("100"))


def periodos_solapan(
    inicio_a: date,
    fin_a: date,
    inicio_b: date,
    fin_b: date,
) -> bool:
    """Si dos periodos se cruzan (inclusive en los extremos).

    Dos periodos que solo se tocan en un día (el fin de uno es el inicio del
    otro) **sí** se consideran solape, porque ese día quedaría cobrado dos
    veces.
    """
    return inicio_a <= fin_b and inicio_b <= fin_a


def cubre_periodo(
    inicio: date,
    fin: date,
    desde: date | None,
    hasta: date | None,
) -> bool:
    """Si el periodo de un movimiento intersecta el rango consultado.

    Con `desde`/`hasta` en `None` el rango es abierto por ese lado, así que
    cualquier movimiento lo cubre.
    """
    if desde is not None and fin < desde:
        return False
    if hasta is not None and inicio > hasta:
        return False
    return True


def saldo(total_bonificaciones: Decimal, total_deducciones: Decimal) -> Decimal:
    """Neto de un consolidado: bonificaciones menos deducciones."""
    return redondear(total_bonificaciones - total_deducciones)

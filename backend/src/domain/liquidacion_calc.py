from decimal import Decimal
from pydantic import BaseModel, computed_field


class ValoresDescuento(BaseModel):
    devengado: Decimal = Decimal("0.00")
    tributario: Decimal = Decimal("0.00")
    comision_bancaria: Decimal = Decimal("0.00")
    gasto_empresa: Decimal = Decimal("0.00")


class CalculadoraLiquidacion(BaseModel):
    importe_base: Decimal = Decimal("0.00")
    descuentos: ValoresDescuento = ValoresDescuento()

    @computed_field
    @property
    def neto_pagar(self) -> Decimal:
        return self.importe_base - (
            self.descuentos.tributario
            + self.descuentos.comision_bancaria
            + self.descuentos.gasto_empresa
        )

from sqlmodel import SQLModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal
from pydantic import field_validator

TIPOS_PAGO_VALIDOS = {"TRANSFERENCIA", "EFECTIVO", "CHEQUE", "OTRO"}

if TYPE_CHECKING:
    from .monedas_dto import MonedaRead
    from .productos_en_liquidacion_dto import ProductosEnLiquidacionRead


class LiquidacionBase(SQLModel):
    id_cliente: int = Field(gt=0)
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int = Field(gt=0)
    liquidada: bool = False
    fecha_emision: date
    fecha_liquidacion: Optional[date] = None
    observaciones: Optional[str] = Field(default=None, max_length=500)
    devengado: Decimal = Field(default=Decimal("0.00"), ge=0)
    tributario: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    comision_bancaria: Decimal = Field(default=Decimal("0.00"), ge=0)
    gasto_empresa: Decimal = Field(default=Decimal("0.00"), ge=0)
    importe: Decimal = Field(default=Decimal("0.00"), ge=0)
    neto_pagar: Decimal = Field(default=Decimal("0.00"), ge=0)
    porcentaje_caguayo: Decimal = Field(default=Decimal("10.00"), ge=0, le=100)
    importe_caguayo: Decimal = Field(default=Decimal("0.00"), ge=0)
    tributario_monto: Decimal = Field(default=Decimal("0.00"), ge=0)
    tipo_pago: str = "TRANSFERENCIA"


class LiquidacionCreate(SQLModel):
    id_cliente: int = Field(gt=0)
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int = Field(gt=0)
    fecha_emision: Optional[date] = None
    observaciones: Optional[str] = Field(default=None, max_length=500)
    devengado: Optional[Decimal] = Field(default=None, ge=0)
    tributario: Optional[Decimal] = Field(default=None, ge=0, le=100)
    comision_bancaria: Optional[Decimal] = Field(default=None, ge=0)
    gasto_empresa: Optional[Decimal] = Field(default=None, ge=0)
    porcentaje_caguayo: Optional[Decimal] = Field(
        default=Decimal("10.00"), ge=0, le=100
    )
    tipo_pago: str = "TRANSFERENCIA"
    producto_ids: List[int] = []

    @field_validator("tipo_pago")
    @classmethod
    def validar_tipo_pago(cls, v: str) -> str:
        if v not in TIPOS_PAGO_VALIDOS:
            raise ValueError(f"tipo_pago debe ser uno de {TIPOS_PAGO_VALIDOS}")
        return v

    @field_validator("producto_ids")
    @classmethod
    def validar_producto_ids(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("Debe incluir al menos un producto")
        if any(pid <= 0 for pid in v):
            raise ValueError("Todos los producto_ids deben ser > 0")
        return v


class LiquidacionRead(LiquidacionBase):
    id_liquidacion: int
    codigo: str
    moneda: Optional["MonedaRead"] = None
    productos_en_liquidacion: Optional[List["ProductosEnLiquidacionRead"]] = None


class LiquidacionUpdate(SQLModel):
    id_cliente: Optional[int] = Field(default=None, gt=0)
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: Optional[int] = Field(default=None, gt=0)
    liquidada: Optional[bool] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    observaciones: Optional[str] = Field(default=None, max_length=500)
    devengado: Optional[Decimal] = Field(default=None, ge=0)
    tributario: Optional[Decimal] = Field(default=None, ge=0, le=100)
    comision_bancaria: Optional[Decimal] = Field(default=None, ge=0)
    gasto_empresa: Optional[Decimal] = Field(default=None, ge=0)
    importe: Optional[Decimal] = Field(default=None, ge=0)
    neto_pagar: Optional[Decimal] = Field(default=None, ge=0)
    tipo_pago: Optional[str] = None

    @field_validator("tipo_pago")
    @classmethod
    def validar_tipo_pago(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TIPOS_PAGO_VALIDOS:
            raise ValueError(f"tipo_pago debe ser uno de {TIPOS_PAGO_VALIDOS}")
        return v


class LiquidacionConfirmar(SQLModel):
    tipo_pago: Optional[str] = None
    devengado: Optional[Decimal] = Field(default=None, ge=0)
    tributario: Optional[Decimal] = Field(default=None, ge=0, le=100)
    comision_bancaria: Optional[Decimal] = Field(default=None, ge=0)
    gasto_empresa: Optional[Decimal] = Field(default=None, ge=0)
    observaciones: Optional[str] = Field(default=None, max_length=500)

    @field_validator("tipo_pago")
    @classmethod
    def validar_tipo_pago(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TIPOS_PAGO_VALIDOS:
            raise ValueError(f"tipo_pago debe ser uno de {TIPOS_PAGO_VALIDOS}")
        return v


class LiquidacionConProductos(SQLModel):
    id_cliente: int = Field(gt=0)
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int = Field(gt=0)
    devengado: Optional[Decimal] = Field(default=None, ge=0)
    tributario: Optional[Decimal] = Field(default=None, ge=0, le=100)
    comision_bancaria: Optional[Decimal] = Field(default=None, ge=0)
    gasto_empresa: Optional[Decimal] = Field(default=None, ge=0)
    tipo_pago: str = "TRANSFERENCIA"
    observaciones: Optional[str] = Field(default=None, max_length=500)
    producto_ids: List[int] = []

    @field_validator("tipo_pago")
    @classmethod
    def validar_tipo_pago(cls, v: str) -> str:
        if v not in TIPOS_PAGO_VALIDOS:
            raise ValueError(f"tipo_pago debe ser uno de {TIPOS_PAGO_VALIDOS}")
        return v

    @field_validator("producto_ids")
    @classmethod
    def validar_producto_ids(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("Debe incluir al menos un producto")
        if any(pid <= 0 for pid in v):
            raise ValueError("Todos los producto_ids deben ser > 0")
        return v


# Rebuild forward references
from .monedas_dto import MonedaRead  # noqa: E402
from .productos_en_liquidacion_dto import ProductosEnLiquidacionRead  # noqa: E402

LiquidacionRead.model_rebuild()

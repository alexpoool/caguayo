from typing import List
from datetime import datetime
from sqlmodel import Session
from src.repository import ventas_repo
from src.dto import (
    VentasCreate,
    VentasRead,
)

class VentasService:
    @staticmethod
    def create_venta(db: Session, venta: VentasCreate) -> VentasRead:
        db_venta = ventas_repo.create(db, obj_in=venta)
        return VentasRead.from_orm(db_venta)

    @staticmethod
    def get_venta(db: Session, venta_id: int) -> VentasRead:
        db_venta = ventas_repo.get(db, id=venta_id)
        return VentasRead.from_orm(db_venta) if db_venta else None

    @staticmethod
    def get_ventas(db: Session, skip: int = 0, limit: int = 100) -> List[VentasRead]:
        db_ventas = ventas_repo.get_multi(db, skip=skip, limit=limit)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    def get_ventas_mes_actual(db: Session) -> List[VentasRead]:
        now = datetime.now()
        db_ventas = ventas_repo.get_by_mes(db, year=now.year, month=now.month)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    def confirmar_venta(db: Session, venta_id: int) -> VentasRead:
        db_venta = ventas_repo.get(db, id=venta_id)
        if db_venta:
            db_venta.confirmacion = True
            db.commit()
            db.refresh(db_venta)
            return VentasRead.from_orm(db_venta)
        return None

from typing import List
from sqlmodel import Session
from src.repository import movimiento_repo
from src.dto import (
    MovimientoCreate,
    MovimientoRead,
)

class MovimientoService:
    @staticmethod
    def create_movimiento(db: Session, movimiento: MovimientoCreate) -> MovimientoRead:
        db_movimiento = movimiento_repo.create(db, obj_in=movimiento)
        return MovimientoRead.from_orm(db_movimiento)

    @staticmethod
    def get_movimiento(db: Session, movimiento_id: int) -> MovimientoRead:
        db_movimiento = movimiento_repo.get(db, id=movimiento_id)
        return MovimientoRead.from_orm(db_movimiento) if db_movimiento else None

    @staticmethod
    def get_movimientos(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[MovimientoRead]:
        db_movimientos = movimiento_repo.get_multi(db, skip=skip, limit=limit)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    def get_movimientos_pendientes(db: Session) -> List[MovimientoRead]:
        db_movimientos = movimiento_repo.get_pendientes(db)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    def confirmar_movimiento(db: Session, movimiento_id: int) -> MovimientoRead:
        db_movimiento = movimiento_repo.get(db, id=movimiento_id)
        if db_movimiento:
            db_movimiento.confirmacion = True
            db.commit()
            db.refresh(db_movimiento)
            return MovimientoRead.from_orm(db_movimiento)
        return None

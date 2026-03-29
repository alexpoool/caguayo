from typing import TypeVar, Generic, Type, List, Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)
ReadDTOType = TypeVar("ReadDTOType", bound=BaseModel)


class GenericService(Generic[ModelType, CreateDTOType, UpdateDTOType, ReadDTOType]):
    def __init__(
        self,
        repository,  # CRUDBase instance
        read_schema: Type[ReadDTOType],
        model_name: str = "Ítem",
    ):
        self.repository = repository
        self.read_schema = read_schema
        self.model_name = model_name

    def _to_read_dto(self, db_obj: ModelType) -> ReadDTOType:
        """Hook method to override DTO conversion logic if needed."""
        return self.read_schema.model_validate(db_obj)

    async def get(self, db: AsyncSession, id: int) -> ReadDTOType:
        db_obj = await self.repository.get(db, id=id)
        if not db_obj:
            raise HTTPException(
                status_code=404, detail=f"{self.model_name} no encontrado"
            )
        return self._to_read_dto(db_obj)

    async def get_multi(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ReadDTOType]:
        db_objs = await self.repository.get_multi(db, skip=skip, limit=limit)
        return [self._to_read_dto(obj) for obj in db_objs]

    async def get_all(self, db: AsyncSession) -> List[ReadDTOType]:
        db_objs = await self.repository.get_all(db)
        return [self._to_read_dto(obj) for obj in db_objs]

    async def create(self, db: AsyncSession, obj_in: CreateDTOType) -> ReadDTOType:
        db_obj = await self.repository.create(db, obj_in=obj_in)
        return self._to_read_dto(db_obj)

    async def update(
        self, db: AsyncSession, id: int, obj_in: UpdateDTOType
    ) -> ReadDTOType:
        db_obj = await self.repository.get(db, id=id)
        if not db_obj:
            raise HTTPException(
                status_code=404, detail=f"{self.model_name} no encontrado"
            )
        updated_obj = await self.repository.update(db, db_obj=db_obj, obj_in=obj_in)
        return self._to_read_dto(updated_obj)

    async def delete(self, db: AsyncSession, id: int) -> None:
        db_obj = await self.repository.get(db, id=id)
        if not db_obj:
            raise HTTPException(
                status_code=404, detail=f"{self.model_name} no encontrado"
            )
        await self.repository.remove(db, id=id)

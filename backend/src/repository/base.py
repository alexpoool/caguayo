from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Type, TypeVar, Generic, Any

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(
        self, db: AsyncSession, id: Any, load_options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        if load_options:
            return await db.get(self.model, id, options=load_options)
        return await db.get(self.model, id)

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        load_options: Optional[List[Any]] = None,
    ) -> List[ModelType]:
        statement = select(self.model)
        if load_options:
            for option in load_options:
                statement = statement.options(option)
        statement = statement.offset(skip).limit(limit)
        results = await db.exec(statement)
        return list(results.all())

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType, commit: bool = True) -> ModelType:
        obj_data = obj_in.model_dump()
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        else:
            await db.flush()
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType, commit: bool = True
    ) -> ModelType:
        obj_data = obj_in.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        else:
            await db.flush()
        return db_obj

    async def remove(self, db: AsyncSession, *, id: Any) -> Optional[ModelType]:
        obj = await db.get(self.model, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

    async def get_all(
        self, db: AsyncSession, load_options: Optional[List[Any]] = None
    ) -> List[ModelType]:
        statement = select(self.model)
        if load_options:
            for option in load_options:
                statement = statement.options(option)
        results = await db.exec(statement)
        return list(results.all())

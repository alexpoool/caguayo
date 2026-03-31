with open("backend/src/repository/base.py", "r") as f:
    content = f.read()

# Modify create
content = content.replace(
    'async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:\n        obj_data = obj_in.model_dump()\n        db_obj = self.model(**obj_data)\n        db.add(db_obj)\n        await db.commit()\n        await db.refresh(db_obj)\n        return db_obj',
    'async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType, commit: bool = True) -> ModelType:\n        obj_data = obj_in.model_dump()\n        db_obj = self.model(**obj_data)\n        db.add(db_obj)\n        if commit:\n            await db.commit()\n            await db.refresh(db_obj)\n        else:\n            await db.flush()\n        return db_obj'
)

# Modify update
content = content.replace(
    'async def update(\n        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType\n    ) -> ModelType:\n        obj_data = obj_in.model_dump(exclude_unset=True)\n        for field, value in obj_data.items():\n            setattr(db_obj, field, value)\n        db.add(db_obj)\n        await db.commit()\n        await db.refresh(db_obj)\n        return db_obj',
    'async def update(\n        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType, commit: bool = True\n    ) -> ModelType:\n        obj_data = obj_in.model_dump(exclude_unset=True)\n        for field, value in obj_data.items():\n            setattr(db_obj, field, value)\n        db.add(db_obj)\n        if commit:\n            await db.commit()\n            await db.refresh(db_obj)\n        else:\n            await db.flush()\n        return db_obj'
)

with open("backend/src/repository/base.py", "w") as f:
    f.write(content)

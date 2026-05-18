from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import selectinload
from src.repository.cliente_repo import (
    cliente_repo,
    cliente_natural_repo,
    cliente_juridica_repo,
    cliente_tcp_repo,
    tipo_entidad_repo,
    cuenta_repo,
)
from src.models import Cliente
from src.dto import (
    ClienteCreate,
    ClienteRead,
    ClienteUpdate,
    ClienteNaturalCreate,
    ClienteNaturalRead,
    ClienteNaturalUpdate,
    ClienteJuridicaCreate,
    ClienteJuridicaRead,
    ClienteJuridicaUpdate,
    ClienteTCPCreate,
    ClienteTCPRead,
    ClienteTCPUpdate,
    TipoEntidadCreate,
    TipoEntidadRead,
    TipoEntidadUpdate,
    CuentaCreate,
    CuentaRead,
    CuentaUpdate,
)


class ClienteService:
    @staticmethod
    async def create_cliente(db: AsyncSession, cliente: ClienteCreate) -> ClienteRead:
        from sqlmodel import select
        from sqlalchemy.orm import selectinload
        from src.models.cliente_natural import ClienteNatural
        from src.models.cliente_juridica import ClienteJuridica
        from src.models.cliente_tcp import ClienteTCP

        async with db.begin():
            # Convert DTO to dict, excluding specific subtypes
            obj_data = cliente.model_dump(
                exclude={"cliente_natural", "cliente_juridica", "cliente_tcp", "cuentas"}
            )
            db_cliente = Cliente(**obj_data)
            db.add(db_cliente)
            await db.flush()  # Gets the id_cliente without finalizing transaction

            tipo = cliente.tipo_persona
            if tipo == "NATURAL" and cliente.cliente_natural:
                nat_data = cliente.cliente_natural.model_dump()
                nat_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteNatural(**nat_data))
            elif tipo == "JURIDICA" and cliente.cliente_juridica:
                jur_data = cliente.cliente_juridica.model_dump()
                jur_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteJuridica(**jur_data))
            elif tipo == "TCP" and cliente.cliente_tcp:
                tcp_data = cliente.cliente_tcp.model_dump()
                tcp_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteTCP(**tcp_data))

            # Crear cuentas asociadas si se proporcionaron
            if cliente.cuentas:
                from src.models.cuenta import Cuenta
                for cuenta_data in cliente.cuentas:
                    cuenta_dict = cuenta_data.model_dump()
                    cuenta_dict["id_cliente"] = db_cliente.id_cliente
                    db_cuenta = Cuenta(**cuenta_dict)
                    db.add(db_cuenta)

            await db.flush()

        # Load relationships explicitly (populate_existing forces SA to
        # ignore identity map and apply selectinload eagerly)
        result = await db.exec(
            select(Cliente)
            .where(Cliente.id_cliente == db_cliente.id_cliente)
            .options(
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
            )
            .execution_options(populate_existing=True)
        )
        db_cliente = result.one()
        return ClienteRead.model_validate(db_cliente)

    @staticmethod
    async def get_cliente(db: AsyncSession, cliente_id: int) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(
            db,
            id=cliente_id,
            load_options=[
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
            ],
        )
        return ClienteRead.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_clientes(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10000,
        tipo_relacion: Optional[str] = None,
    ) -> List[ClienteRead]:
        from sqlalchemy import or_

        statement = select(Cliente).options(
            selectinload(Cliente.provincia),
            selectinload(Cliente.municipio),
            selectinload(Cliente.cuentas),
            selectinload(Cliente.cliente_natural),
            selectinload(Cliente.cliente_juridica),
            selectinload(Cliente.cliente_tcp),
        )

        # Person type filters (NATURAL, TCP, JURIDICA)
        person_types = {"NATURAL", "TCP", "JURIDICA"}
        
        if tipo_relacion:
            # Support comma-separated values (e.g., "PROVEEDOR,AMBAS")
            tipos = [t.strip() for t in tipo_relacion.split(",") if t.strip()]
            # Check if filtering by person type (NATURAL, TCP, JURIDICA)
            if tipos and set(tipos).issubset(person_types):
                statement = statement.where(Cliente.tipo_persona.in_(tipos))
            else:
                # Filter by relation type (CLIENTE, PROVEEDOR, AMBAS)
                if len(tipos) == 1:
                    statement = statement.where(Cliente.tipo_relacion == tipos[0])
                elif len(tipos) > 1:
                    statement = statement.where(Cliente.tipo_relacion.in_(tipos))

        statement = statement.offset(skip).limit(limit)
        results = await db.exec(statement)
        db_clientes = list(results.all())

        return [ClienteRead.model_validate(c) for c in db_clientes]

    @staticmethod
    async def update_cliente(
        db: AsyncSession, cliente_id: int, cliente_update: ClienteUpdate
    ) -> Optional[ClienteRead]:
        from src.models.cuenta import Cuenta
        
        print(f"[DEBUG] update_cliente: cliente_id={cliente_id}")
        print(f"[DEBUG] update_cliente: cliente_update type={type(cliente_update)}")
        
        db_cliente = await cliente_repo.get(db, id=cliente_id)
        if not db_cliente:
            return None
        
        # Detectar si es dict u objeto Pydantic
        if isinstance(cliente_update, dict):
            print(f"[DEBUG] update_cliente: Es dict, keys={list(cliente_update.keys())}")
            cuentas_data = cliente_update.get("cuentas")
            update_data = {
                k: v for k, v in cliente_update.items() 
                if k not in ("cuentas", "cliente_natural", "cliente_juridica", "cliente_tcp") 
                and v is not None
            }
        else:
            print(f"[DEBUG] update_cliente: Es Pydantic model, cuentas={cliente_update.cuentas}")
            cuentas_data = cliente_update.cuentas
            update_data = cliente_update.model_dump(
                exclude={"cuentas", "cliente_natural", "cliente_juridica", "cliente_tcp"}, 
                exclude_none=True
            )
        
        print(f"[DEBUG] update_cliente: cuentas_data={cuentas_data}")
        
        # Update manual de campos (evitar usar repo.update con dict)
        for field, value in update_data.items():
            setattr(db_cliente, field, value)
        await db.flush()
        
        # --- Procesar datos tipo-específicos ---
        from src.models.cliente_natural import ClienteNatural
        from src.models.cliente_juridica import ClienteJuridica
        from src.models.cliente_tcp import ClienteTCP
        
        tipo = update_data.get("tipo_persona") or db_cliente.tipo_persona
        
        if isinstance(cliente_update, dict):
            cliente_natural_data = cliente_update.get("cliente_natural")
            cliente_juridica_data = cliente_update.get("cliente_juridica")
            cliente_tcp_data = cliente_update.get("cliente_tcp")
        else:
            cliente_natural_data = cliente_update.cliente_natural
            cliente_juridica_data = cliente_update.cliente_juridica
            cliente_tcp_data = cliente_update.cliente_tcp
        
        # Limpiar todas las tablas tipo-específicas
        await db.execute(text("DELETE FROM clientes_persona_natural WHERE id_cliente = :id"), {"id": cliente_id})
        await db.execute(text("DELETE FROM clientes_persona_juridica WHERE id_cliente = :id"), {"id": cliente_id})
        await db.execute(text("DELETE FROM cliente_tcp WHERE id_cliente = :id"), {"id": cliente_id})
        
        if tipo == "NATURAL" and cliente_natural_data:
            nat_dict = cliente_natural_data if isinstance(cliente_natural_data, dict) else cliente_natural_data.model_dump()
            nat_dict["id_cliente"] = cliente_id
            db.add(ClienteNatural(**nat_dict))
        elif tipo == "JURIDICA" and cliente_juridica_data:
            jur_dict = cliente_juridica_data if isinstance(cliente_juridica_data, dict) else cliente_juridica_data.model_dump()
            jur_dict["id_cliente"] = cliente_id
            db.add(ClienteJuridica(**jur_dict))
        elif tipo == "TCP" and cliente_tcp_data:
            tcp_dict = cliente_tcp_data if isinstance(cliente_tcp_data, dict) else cliente_tcp_data.model_dump()
            tcp_dict["id_cliente"] = cliente_id
            db.add(ClienteTCP(**tcp_dict))
        
        await db.flush()
        
        # --- Procesar cuentas bancarias ---
        print(f"[DEBUG] update_cliente: cuentas_data={cuentas_data}")
        
        if cuentas_data is not None:
            # Eliminar cuentas existentes para evitar duplicados
            existing_cuentas = await db.exec(select(Cuenta).where(Cuenta.id_cliente == cliente_id))
            for c in existing_cuentas.all():
                await db.delete(c)
            
            # Re-insertar todas las cuentas del payload
            for cuenta_dict in cuentas_data:
                if isinstance(cuenta_dict, dict):
                    cuenta_clean = {k: v for k, v in cuenta_dict.items() if v is not None}
                else:
                    cuenta_clean = cuenta_dict.model_dump(exclude_none=True)
                
                cuenta_clean = {
                    k: v for k, v in cuenta_clean.items()
                    if k in ("titular", "banco", "sucursal", "numero_cuenta", "direccion", "id_moneda", "id_cliente")
                }
                cuenta_clean["id_cliente"] = cliente_id
                db.add(Cuenta(**cuenta_clean))
            
            await db.flush()
        else:
            print(f"[DEBUG] update_cliente: No se procesan cuentas (None)")
        
        # Cargar relaciones para retornar
        result = await db.exec(
            select(Cliente)
            .where(Cliente.id_cliente == cliente_id)
            .options(
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
            )
            .execution_options(populate_existing=True)
        )
        updated_cliente = result.one()
        return ClienteRead.model_validate(updated_cliente)

    @staticmethod
    async def delete_cliente(db: AsyncSession, cliente_id: int) -> bool:
        await db.execute(
            text("DELETE FROM clientes WHERE id_cliente = :id"), {"id": cliente_id}
        )
        await db.commit()
        return True

class ClienteNaturalService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_natural: ClienteNaturalCreate
    ) -> ClienteNaturalRead:
        db_obj = await cliente_natural_repo.create(db, obj_in=cliente_natural)
        return ClienteNaturalRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteNaturalRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteNaturalUpdate
    ) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_natural_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteNaturalRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_natural_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteJuridicaService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_juridica: ClienteJuridicaCreate
    ) -> ClienteJuridicaRead:
        db_obj = await cliente_juridica_repo.create(db, obj_in=cliente_juridica)
        return ClienteJuridicaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteJuridicaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteJuridicaUpdate
    ) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_juridica_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteJuridicaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_juridica_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteTCPService:
    @staticmethod
    async def create(db: AsyncSession, cliente_tcp: ClienteTCPCreate) -> ClienteTCPRead:
        db_obj = await cliente_tcp_repo.create(db, obj_in=cliente_tcp)
        return ClienteTCPRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteTCPRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteTCPUpdate
    ) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_tcp_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return ClienteTCPRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_tcp_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class TipoEntidadService:
    @staticmethod
    async def create(
        db: AsyncSession, tipo_entidad: TipoEntidadCreate
    ) -> TipoEntidadRead:
        db_obj = await tipo_entidad_repo.create(db, obj_in=tipo_entidad)
        return TipoEntidadRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        return TipoEntidadRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession) -> List[TipoEntidadRead]:
        db_objs = await tipo_entidad_repo.get_all(db)
        return [TipoEntidadRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: TipoEntidadUpdate
    ) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await tipo_entidad_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return TipoEntidadRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await tipo_entidad_repo.remove(db, id=id)
        return db_obj is not None


class CuentaService:
    @staticmethod
    async def create(db: AsyncSession, cuenta: CuentaCreate) -> CuentaRead:
        db_obj = await cuenta_repo.create(db, obj_in=cuenta)
        return CuentaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get_with_relations(db, id=id)
        return CuentaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_multi(db, skip=skip, limit=limit)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def get_by_cliente(db: AsyncSession, id_cliente: int) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_by_cliente(db, id_cliente=id_cliente)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: CuentaUpdate
    ) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await cuenta_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return CuentaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await cuenta_repo.remove(db, id=id)
        return db_obj is not None

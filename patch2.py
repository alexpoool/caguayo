import re

with open("backend/src/services/cliente_service.py", "r") as f:
    content = f.read()

# Replace the create_cliente method
# We will use re.sub with regex to locate def create_cliente and re-write it

pattern = r'    @staticmethod\n    async def create_cliente\(db: AsyncSession, cliente: ClienteCreate\).*?        return ClienteRead\.model_validate\(db_cliente\)'

replacement = """    @staticmethod
    async def create_cliente(db: AsyncSession, cliente: ClienteCreate) -> ClienteRead:
        from sqlmodel import select
        from sqlalchemy.orm import selectinload
        from backend.src.models.cliente_natural import ClienteNatural
        from backend.src.models.cliente_juridica import ClienteJuridica
        from backend.src.models.cliente_tcp import ClienteTCP

        async with db.begin():
            # Convert DTO to dict, excluding specific subtypes
            obj_data = cliente.model_dump(exclude={"cliente_natural", "cliente_juridica", "cliente_tcp"})
            db_cliente = Cliente(**obj_data)
            db.add(db_cliente)
            await db.flush()  # Gets the id_cliente without finalizing transaction

            tipo = cliente.tipo_entidad_enum
            if tipo == "Natural" and cliente.cliente_natural:
                nat_data = cliente.cliente_natural.model_dump()
                nat_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteNatural(**nat_data))
            elif tipo == "Jurídica" and cliente.cliente_juridica:
                jur_data = cliente.cliente_juridica.model_dump()
                jur_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteJuridica(**jur_data))
            elif tipo == "TCP" and cliente.cliente_tcp:
                tcp_data = cliente.cliente_tcp.model_dump()
                tcp_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteTCP(**tcp_data))

            await db.flush()

        # The begin() context manager handles the commit()
        await db.refresh(db_cliente)
        
        # Load relationships explicitly
        db_cliente = await db.get(Cliente, db_cliente.id_cliente, options=[
            selectinload(Cliente.cliente_natural), 
            selectinload(Cliente.cliente_juridica), 
            selectinload(Cliente.cliente_tcp),
            selectinload(Cliente.provincia),
            selectinload(Cliente.municipio)
        ])
        return ClienteRead.model_validate(db_cliente)"""


import re

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
if new_content == content:
    print("WARNING: Replacement failed!")
else:
    with open("backend/src/services/cliente_service.py", "w") as f:
        f.write(new_content)
    print("Patched!")

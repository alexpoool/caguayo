import re

with open("backend/src/services/cliente_service.py", "r") as f:
    content = f.read()

# Replace the create_cliente logic
pattern = r'class ClienteService\(CRUDBase\[Cliente, ClienteCreate, ClienteUpdate\]\):.*'
replacement = """class ClienteService(CRUDBase[Cliente, ClienteCreate, ClienteUpdate]):
    def __init__(self):
        super().__init__(Cliente)

    async def get_multi_with_relations(self, db: AsyncSession, *, skip: int = 0, limit: int = 100):
        # Already handled by get_multi in CRUDBase with load_options
        return await super().get_multi(
            db, skip=skip, limit=limit, load_options=[selectinload(Cliente.cliente_natural), selectinload(Cliente.cliente_juridica), selectinload(Cliente.cliente_tcp)]
        )

    async def create_cliente(
        self, db: AsyncSession, obj_in: ClienteCreate
    ) -> Cliente:
        async with db.begin():
            # Create base cliente
            cliente = await super().create(db, obj_in=obj_in, commit=False)
            
            # Create sub-type
            tipo = obj_in.tipo_entidad_enum
            if tipo == "Natural" and obj_in.cliente_natural:
                nat_data = obj_in.cliente_natural.model_dump()
                nat_data["id_cliente"] = cliente.id_cliente
                nat_obj = ClienteNatural(**nat_data)
                db.add(nat_obj)
            elif tipo == "Jurídica" and obj_in.cliente_juridica:
                jur_data = obj_in.cliente_juridica.model_dump()
                jur_data["id_cliente"] = cliente.id_cliente
                jur_obj = ClienteJuridica(**jur_data)
                db.add(jur_obj)
            elif tipo == "TCP" and obj_in.cliente_tcp:
                tcp_data = obj_in.cliente_tcp.model_dump()
                tcp_data["id_cliente"] = cliente.id_cliente
                tcp_obj = ClienteTCP(**tcp_data)
                db.add(tcp_obj)

            await db.flush()

        await db.refresh(cliente)
        return await db.get(Cliente, cliente.id_cliente, options=[selectinload(Cliente.cliente_natural), selectinload(Cliente.cliente_juridica), selectinload(Cliente.cliente_tcp)])

cliente_service = ClienteService()
"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("backend/src/services/cliente_service.py", "w") as f:
    f.write(new_content)

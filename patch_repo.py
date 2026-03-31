import re

with open("backend/src/repository/ventas_clientes_repo.py", "r") as f:
    text = f.read()

text = text.replace(
    'class ClienteRepository(CRUDBase[Cliente, "ClienteCreate", "ClienteUpdate"]):',
    'class VentasClienteRepository(CRUDBase[Cliente, "ClienteCreate", "ClienteUpdate"]):'
)
text = text.replace(
    'cliente_repo = ClienteRepository(Cliente)',
    'ventas_cliente_repo = VentasClienteRepository(Cliente)'
)

with open("backend/src/repository/ventas_clientes_repo.py", "w") as f:
    f.write(text)

with open("backend/src/services/ventas_clientes_service.py", "r") as f:
    text2 = f.read()

text2 = text2.replace('cliente_repo', 'ventas_cliente_repo')
text2 = text2.replace('ClienteRepository', 'VentasClienteRepository')

with open("backend/src/services/ventas_clientes_service.py", "w") as f:
    f.write(text2)

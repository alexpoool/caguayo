import re
with open('backend/src/services/ventas_clientes_service.py', 'r') as f:
    text = f.read()

# remove ClienteService class
text = re.sub(r'class ClienteService:.*?class VentasService:', 'class VentasService:', text, flags=re.DOTALL)

with open('backend/src/services/ventas_clientes_service.py', 'w') as f:
    f.write(text)

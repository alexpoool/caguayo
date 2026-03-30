from sqlalchemy.orm import Session
from src.models.cliente import Cliente
from src.models.cliente_natural import ClienteNatural
from src.models.cliente_tcp import ClienteTCP
from src.models.cliente_juridica import ClienteJuridica
from src.models.dependencia import Dependencia, Provincia, Municipio
from src.models.contrato import Contrato
from src.models.convenio import Convenio
from src.models.anexo import Anexo

def get_proveedores_por_dependencia(db: Session, id_dependencia: int, tipo_entidad: str, id_provincia: int = None):
    # Determine which model to join based on tipo_entidad
    # NATURAL, TCP, JURIDICA
    
    query = db.query(
        Cliente,
        Dependencia.nombre.label('dependencia_nombre'),
        Dependencia.direccion.label('dependencia_direccion'),
        Provincia.nombre.label('provincia_nombre'),
        Municipio.nombre.label('municipio_nombre')
    ).join(
        Dependencia, Contrato.id_dependencia == Dependencia.id_dependencia # Simplified link
    ).join(
        Contrato, Contrato.id_cliente == Cliente.id_cliente
    ).join(
        Provincia, Cliente.id_provincia == Provincia.id_provincia, isouter=True
    ).join(
        Municipio, Cliente.id_municipio == Municipio.id_municipio, isouter=True
    ).filter(
        Contrato.id_dependencia == id_dependencia,
        Cliente.tipo_relacion.in_(['PROVEEDOR', 'AMBAS'])
    )

    if id_provincia:
        query = query.filter(Cliente.id_provincia == id_provincia)

    if tipo_entidad == 'NATURAL':
        query = query.join(ClienteNatural, Cliente.id_cliente == ClienteNatural.id_cliente)
        query = query.add_columns(ClienteNatural.carnet_identidad, ClienteNatural.vigencia)
    elif tipo_entidad == 'TCP':
        query = query.join(ClienteTCP, Cliente.id_cliente == ClienteTCP.id_cliente)
    elif tipo_entidad == 'JURIDICA':
        query = query.join(ClienteJuridica, Cliente.id_cliente == ClienteJuridica.id_cliente)
        query = query.add_columns(ClienteJuridica.codigo_reup)

    results = query.all()
    
    proveedores = []
    dependencia_info = {}

    for row in results:
        # Depending on how SQLAlchemy returns the combined row
        cliente_obj = row.Cliente
        
        # Populating dependencia info from the first row (since it's the same for all)
        if not dependencia_info:
            dependencia_info = {
                'nombre': row.dependencia_nombre,
                'direccion': row.dependencia_direccion
            }

        proveedor_data = {
            'nombre': cliente_obj.nombre,
            'direccion': cliente_obj.direccion,
            'provincia': row.provincia_nombre,
            'municipio': row.municipio_nombre,
        }
        
        if tipo_entidad == 'NATURAL':
             proveedor_data['carnet_identidad'] = getattr(row, 'carnet_identidad', '')
             proveedor_data['vigencia'] = getattr(row, 'vigencia', '')
        elif tipo_entidad == 'JURIDICA':
             proveedor_data['codigo_reup'] = getattr(row, 'codigo_reup', '')
             
        proveedores.append(proveedor_data)

    return proveedores, dependencia_info

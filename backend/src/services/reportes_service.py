from sqlalchemy.orm import Session
from sqlalchemy import func
from src.models.cliente import Cliente
from src.models.cliente_natural import ClienteNatural
from src.models.cliente_tcp import ClienteTCP
from src.models.cliente_juridica import ClienteJuridica
from src.models.dependencia import Dependencia, Provincia, Municipio
from src.models.contrato import Contrato
from src.models.convenio import Convenio
from src.models.anexo import Anexo
from src.models.movimiento import Movimiento, TipoMovimiento
from src.models.productos import Productos

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

def get_existencias(db: Session, id_dependencia: int):
    dependencia = db.query(Dependencia).filter(Dependencia.id_dependencia == id_dependencia).first()
    dependencia_info = {'nombre': dependencia.nombre, 'direccion': dependencia.direccion} if dependencia else {}

    results = db.query(
        Productos.codigo.label('codigo'),
        Productos.nombre.label('descripcion'),
        func.sum(Movimiento.cantidad * TipoMovimiento.factor).label('cantidad')
    ).join(
        Productos, Movimiento.id_producto == Productos.id_producto
    ).join(
        TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento
    ).filter(
        Movimiento.id_dependencia == id_dependencia
    ).group_by(
        Productos.codigo, Productos.nombre
    ).all()

    existencias = [
        {
            'codigo': r.codigo,
            'descripcion': r.descripcion,
            'cantidad': r.cantidad or 0
        } for r in results
    ]
    return existencias, dependencia_info


def get_movimientos_dependencia(db: Session, id_dependencia: int, fecha_inicio, fecha_fin):
    dependencia = db.query(Dependencia).filter(Dependencia.id_dependencia == id_dependencia).first()
    dependencia_info = {'nombre': dependencia.nombre, 'direccion': dependencia.direccion} if dependencia else {}

    results = db.query(
        Movimiento.fecha,
        TipoMovimiento.tipo.label('operacion'),
        Productos.nombre.label('producto'),
        func.case(
            (TipoMovimiento.factor > 0, 'Entrada'),
            (TipoMovimiento.factor < 0, 'Salida'),
            else_='Neutro'
        ).label('tipo'),
        Movimiento.cantidad
    ).join(
        TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento
    ).join(
        Productos, Movimiento.id_producto == Productos.id_producto
    ).filter(
        Movimiento.id_dependencia == id_dependencia,
        Movimiento.fecha >= fecha_inicio,
        Movimiento.fecha <= fecha_fin
    ).order_by(Movimiento.fecha.desc()).all()

    movimientos = [
        {
            'fecha': r.fecha,
            'operacion': r.operacion,
            'producto': r.producto,
            'tipo': r.tipo,
            'cantidad': r.cantidad
        } for r in results
    ]

    return movimientos, dependencia_info


def get_movimientos_producto(db: Session, id_dependencia: int, id_producto: int, fecha_inicio, fecha_fin):
    dependencia = db.query(Dependencia).filter(Dependencia.id_dependencia == id_dependencia).first()
    dependencia_info = {'nombre': dependencia.nombre, 'direccion': dependencia.direccion} if dependencia else {}

    producto = db.query(Productos).filter(Productos.id_producto == id_producto).first()
    producto_info = {'codigo': producto.codigo, 'nombre': producto.nombre} if producto else {}

    results = db.query(
        Movimiento.fecha,
        TipoMovimiento.tipo.label('operacion'),
        func.case(
            (TipoMovimiento.factor > 0, 'Entrada'),
            (TipoMovimiento.factor < 0, 'Salida'),
            else_='Neutro'
        ).label('tipo'),
        Movimiento.cantidad
    ).join(
        TipoMovimiento, Movimiento.id_tipo_movimiento == TipoMovimiento.id_tipo_movimiento
    ).filter(
        Movimiento.id_dependencia == id_dependencia,
        Movimiento.id_producto == id_producto,
        Movimiento.fecha >= fecha_inicio,
        Movimiento.fecha <= fecha_fin
    ).order_by(Movimiento.fecha.desc()).all()

    movimientos = [
        {
            'fecha': r.fecha,
            'operacion': r.operacion,
            'tipo': r.tipo,
            'cantidad': r.cantidad
        } for r in results
    ]

    return movimientos, dependencia_info, producto_info

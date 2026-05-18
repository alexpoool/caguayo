#!/usr/bin/env python3
import asyncio
import os
from datetime import date, timedelta
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

from sqlmodel import SQLModel, Field, select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
DB_NAME = "caguayosa"

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql+asyncpg://")

DB_URL_FOR_DB = DATABASE_URL.replace(DATABASE_URL.split("/")[-1], DB_NAME)

engine = create_async_engine(DB_URL_FOR_DB, echo=False, future=True, connect_args={"server_settings": {"client_encoding": "utf8"}})
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def truncate_all():
    async with async_session_maker() as session:
        from src.models.item_venta_efectivo import ItemVentaEfectivo
        from src.models.item_anexo import ItemAnexo
        from src.models.item_factura import ItemFactura
        from src.models.servicio import PagoFacturaServicio
        from src.models.servicio import FacturaServicio
        from src.models.servicio import Servicio
        from src.models.servicio import PersonaEtapa
        from src.models.servicio import TareaEtapa
        from src.models.servicio import Etapa
        from src.models.servicio import SolicitudServicio
        from src.models.productos_en_liquidacion import ProductosEnLiquidacion
        from src.models.contrato import VentaEfectivo
        from src.models.contrato import Factura
        from src.models.contrato import Suplemento
        from src.models.contrato import Contrato
        from src.models.contrato import EstadoContrato
        from src.models.contrato import TipoContrato
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio
        from src.models.tipo_convenio import TipoConvenio
        from src.models.producto import Productos
        from src.models.categoria import Subcategorias
        from src.models.categoria import Categorias
        from src.models.cliente import Cliente
        from src.models.dependencia import Dependencia
        from src.models.dependencia import TipoDependencia
        from src.models.dependencia import Municipio
        from src.models.dependencia import Provincia
        from src.models.moneda import Moneda
        
        for table in [ItemVentaEfectivo, ItemAnexo, ItemFactura, PagoFacturaServicio, FacturaServicio, 
                      Servicio, PersonaEtapa, TareaEtapa, Etapa, SolicitudServicio, ProductosEnLiquidacion,
                      VentaEfectivo, Factura, Suplemento, Contrato, EstadoContrato, TipoContrato,
                      Anexo, Convenio, TipoConvenio, Productos, Subcategorias, Categorias,
                      Cliente, Dependencia, TipoDependencia, Municipio, Provincia, Moneda]:
            await session.execute(delete(table))
        await session.commit()
        print("Base de datos limpiada")

async def main():
    print("Iniciando insertion de datos en caguayosa...")
    print("=" * 50)
    
    await truncate_all()
    
    async with async_session_maker() as session:
        # Corregir FK de anexo si está mal
        from sqlalchemy import text
        try:
            await session.execute(text("ALTER TABLE anexo DROP CONSTRAINT IF EXISTS anexo_id_convenio_fkey"))
            await session.execute(text("ALTER TABLE anexo ADD CONSTRAINT anexo_id_convenio_fkey FOREIGN KEY (id_convenio) REFERENCES convenio(id_convenio)"))
            await session.commit()
            print("FK anexo corregida")
        except Exception as e:
            print(f"FK ya estaba correcta o error: {e}")
        
        # 1. Monedas
        from src.models.moneda import Moneda
        simbolos = ["CUP", "USD", "EUR", "GBP", "JPY", "CNY", "RUB", "KRW", "MXN", "BRL"]
        for i in range(10):
            session.add(Moneda(nombre=f"Moneda {i+1}", denominacion=f"Denom {i+1}", simbolo=simbolos[i]))
        await session.commit()
        result = await session.execute(select(Moneda))
        monedas = result.scalars().all()
        moneda_ids = [m.id_moneda for m in monedas]
        print(f"10 monedas insertadas")
        
        # 2. Tipos de contrato
        from src.models.contrato import TipoContrato
        for i in range(10):
            session.add(TipoContrato(nombre=f"Tipo Contrato {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(TipoContrato))
        tipo_contrato_ids = [t.id_tipo_contrato for t in result.scalars().all()]
        print(f"10 tipos de contrato insertados")
        
        # 3. Estados de contrato
        from src.models.contrato import EstadoContrato
        for i in range(10):
            session.add(EstadoContrato(nombre=f"Estado {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(EstadoContrato))
        estado_ids = [e.id_estado_contrato for e in result.scalars().all()]
        print(f"10 estados de contrato insertados")
        
        # 4. Tipos de convenio
        from src.models.tipo_convenio import TipoConvenio
        for i in range(10):
            session.add(TipoConvenio(nombre=f"Tipo Conv {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(TipoConvenio))
        tipo_conv_ids = [t.id_tipo_convenio for t in result.scalars().all()]
        print(f"10 tipos de convenio insertados")
        
        # 5. Tipos de dependencia
        from src.models.dependencia import TipoDependencia
        for i in range(10):
            session.add(TipoDependencia(nombre=f"Tipo Dep {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(TipoDependencia))
        tipo_dep_ids = [t.id_tipo_dependencia for t in result.scalars().all()]
        print(f"10 tipos de dependencia insertados")
        
        # 6. Categorías
        from src.models.categoria import Categorias
        for i in range(10):
            session.add(Categorias(nombre=f"Categoria {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(Categorias))
        cat_ids = [c.id_categoria for c in result.scalars().all()]
        print(f"10 categorias insertadas")
        
        # 7. Provincias
        from src.models.dependencia import Provincia
        for i in range(10):
            session.add(Provincia(nombre=f"Provincia {i+1}"))
        await session.commit()
        result = await session.execute(select(Provincia))
        prov_ids = [p.id_provincia for p in result.scalars().all()]
        print(f"10 provincias insertadas")
        
        # 8. Subcategorías
        from src.models.categoria import Subcategorias
        for i in range(10):
            session.add(Subcategorias(id_categoria=cat_ids[i], nombre=f"Subcat {i+1}", descripcion=f"Desc {i+1}"))
        await session.commit()
        result = await session.execute(select(Subcategorias))
        subcat_ids = [s.id_subcategoria for s in result.scalars().all()]
        print(f"10 subcategorias insertadas")
        
        # 9. Municipios
        from src.models.dependencia import Municipio
        for i in range(10):
            session.add(Municipio(id_provincia=prov_ids[i], nombre=f"Municipio {i+1}"))
        await session.commit()
        result = await session.execute(select(Municipio))
        mun_ids = [m.id_municipio for m in result.scalars().all()]
        print(f"10 municipios insertados")
        
        # 10. Dependencias
        from src.models.dependencia import Dependencia
        for i in range(10):
            session.add(Dependencia(id_tipo_dependencia=tipo_dep_ids[i], nombre=f"Dep {i+1}", direccion=f"Dir {i+1}", telefono=f"555000{i:03d}"))
        await session.commit()
        result = await session.execute(select(Dependencia))
        dep_ids = [d.id_dependencia for d in result.scalars().all()]
        print(f"10 dependencias insertadas")
        
        # 11. Clientes
        from src.models.cliente import Cliente
        for i in range(10):
            session.add(Cliente(nit=f"V{10000000+i}", nombre=f"Cliente {i+1}", 
                                tipo_persona=["NATURAL", "JURIDICA", "TCP"][i%3], telefono=f"555000{i:04d}", 
                                email=f"cli{i+1}@test.cu", id_provincia=prov_ids[i], id_municipio=mun_ids[i], 
                                direccion=f"Direccion {i+1}", tipo_relacion="CLIENTE", estado="ACTIVO"))
        await session.commit()
        result = await session.execute(select(Cliente).where(Cliente.tipo_relacion == "CLIENTE"))
        cliente_ids = [c.id_cliente for c in result.scalars().all()]
        print(f"10 clientes insertados")

        # 11b. Proveedores
        for i in range(10):
            session.add(Cliente(nit=f"J{20000000+i}", nombre=f"Proveedor {i+1}", 
                                tipo_persona=["NATURAL", "JURIDICA", "TCP"][i%3], telefono=f"666000{i:04d}", 
                                email=f"prov{i+1}@test.cu", id_provincia=prov_ids[i], id_municipio=mun_ids[i], 
                                direccion=f"Direccion Prov {i+1}", tipo_relacion="PROVEEDOR", estado="ACTIVO"))
        await session.commit()
        result = await session.execute(select(Cliente).where(Cliente.tipo_relacion == "PROVEEDOR"))
        proveedor_ids = [c.id_cliente for c in result.scalars().all()]
        print(f"10 proveedores insertados")
        
        # 12. Productos
        from src.models.producto import Productos
        for i in range(10):
            session.add(Productos(codigo=f"PROD-{i+1:03d}", id_subcategoria=subcat_ids[i], nombre=f"Producto {i+1}",
                                  descripcion=f"Desc {i+1}", moneda_compra=moneda_ids[0], precio_compra=Decimal(f"{(i+1)*100}"),
                                  moneda_venta=moneda_ids[0], precio_venta=Decimal(f"{(i+1)*150}"), precio_minimo=Decimal(f"{(i+1)*80}")))
        await session.commit()
        result = await session.execute(select(Productos))
        prod_ids = [p.id_producto for p in result.scalars().all()]
        print(f"10 productos insertados")
        
        # 13. Convenios
        from src.models.convenio import Convenio
        for i in range(10):
            session.add(Convenio(id_cliente=cliente_ids[i], nombre_convenio=f"Convenio {i+1}", 
                                fecha=date.today(), vigencia=date.today() + timedelta(days=365),
                                id_tipo_convenio=tipo_conv_ids[i]))
        await session.commit()
        result = await session.execute(select(Convenio))
        conv_ids = [c.id_convenio for c in result.scalars().all()]
        print(f"DEBUG conv_ids: {conv_ids}")
        print(f"10 convenios insertados")
        
        # 14. Contratos
        from src.models.contrato import Contrato
        for i in range(10):
            session.add(Contrato(id_cliente=cliente_ids[i], nombre=f"Contrato {i+1}", proforma=f"PROF-{i+1}",
                                 id_estado=estado_ids[i], fecha=date.today(), vigencia=date.today() + timedelta(days=365),
                                 id_tipo_contrato=tipo_contrato_ids[i], id_moneda=moneda_ids[0], monto=Decimal(f"{(i+1)*10000}")))
        await session.commit()
        result = await session.execute(select(Contrato))
        cont_ids = [c.id_contrato for c in result.scalars().all()]
        print(f"10 contratos insertados")

        # 14b. Contratos de Proveedores
        for i in range(10):
            session.add(Contrato(id_cliente=proveedor_ids[i], nombre=f"Contrato Prov {i+1}", proforma=f"PPROF-{i+1}",
                                 id_estado=estado_ids[i], fecha=date.today(), vigencia=date.today() + timedelta(days=365),
                                 id_tipo_contrato=tipo_contrato_ids[i], id_moneda=moneda_ids[0], monto=Decimal(f"{(i+1)*15000}")))
        await session.commit()
        result = await session.execute(select(Contrato))
        cont_prov_ids = [c.id_contrato for c in result.scalars().all() if c.nombre.startswith("Contrato Prov")]
        print(f"10 contratos de proveedores insertados")
        
        # 15. Anexos
        from src.models.anexo import Anexo
        for i in range(10):
            session.add(Anexo(id_convenio=conv_ids[i], id_moneda=moneda_ids[0], nombre_anexo=f"Anexo {i+1}", fecha=date.today()))
        await session.commit()
        result = await session.execute(select(Anexo))
        anx_ids = [a.id_anexo for a in result.scalars().all()]
        print(f"10 anexos insertados")
        
        # 16. Suplementos
        from src.models.contrato import Suplemento
        for i in range(10):
            session.add(Suplemento(id_contrato=cont_ids[i], nombre=f"Suplemento {i+1}", id_estado=estado_ids[i],
                                   fecha=date.today(), monto=Decimal(f"{(i+1)*5000}")))
        await session.commit()

        # 16b. Suplementos de Proveedores
        for i in range(10):
            session.add(Suplemento(id_contrato=cont_prov_ids[i], nombre=f"Suplemento Prov {i+1}", id_estado=estado_ids[i],
                                   fecha=date.today(), monto=Decimal(f"{(i+1)*7000}")))
        await session.commit()
        print(f"20 suplementos insertados")
        
        # 17. Facturas
        from src.models.contrato import Factura
        for i in range(10):
            session.add(Factura(id_contrato=cont_ids[i], codigo_factura=f"FAC-{i+1:06d}", descripcion=f"Factura {i+1}",
                               fecha=date.today(), monto=Decimal(f"{(i+1)*8000}"), pago_actual=Decimal("0")))
        await session.commit()

        # 17b. Facturas de Proveedores
        for i in range(10):
            session.add(Factura(id_contrato=cont_prov_ids[i], codigo_factura=f"PFAC-{i+1:06d}", descripcion=f"Factura Prov {i+1}",
                               fecha=date.today(), monto=Decimal(f"{(i+1)*12000}"), pago_actual=Decimal("0")))
        await session.commit()
        result = await session.execute(select(Factura).where(~Factura.codigo_factura.like("PFAC%")))
        fac_ids = [f.id_factura for f in result.scalars().all()]
        print(f"20 facturas insertadas")
        
        # 18. Ventas efectivo
        from src.models.contrato import VentaEfectivo
        for i in range(10):
            session.add(VentaEfectivo(slip=f"SLIP-{i+1:06d}", fecha=date.today(), id_dependencia=dep_ids[i],
                                      cajero=f"Cajero {i+1}", monto=Decimal(f"{(i+1)*500}")))
        await session.commit()
        result = await session.execute(select(VentaEfectivo))
        ve_ids = [v.id_venta_efectivo for v in result.scalars().all()]
        print(f"10 ventas efectivo insertadas")
        
        # 19. Items Factura
        from src.models.item_factura import ItemFactura
        for i in range(10):
            session.add(ItemFactura(id_factura=fac_ids[i], id_producto=prod_ids[i], cantidad=i+1,
                                    precio_compra=Decimal(f"{(i+1)*100}"), precio_venta=Decimal(f"{(i+1)*150}"),
                                    id_moneda=moneda_ids[0]))

        # 19b. Items Facturas Proveedores
        result = await session.execute(select(Factura).where(Factura.codigo_factura.like("PFAC%")))
        prov_fac_ids = [f.id_factura for f in result.scalars().all()]
        for i in range(10):
            session.add(ItemFactura(id_factura=prov_fac_ids[i], id_producto=prod_ids[i], cantidad=i+2,
                                    precio_compra=Decimal(f"{(i+1)*120}"), precio_venta=Decimal(f"{(i+1)*180}"),
                                    id_moneda=moneda_ids[0]))
        await session.commit()
        print(f"20 items factura insertados")
        
        # 20. Items Anexo
        from src.models.item_anexo import ItemAnexo
        for i in range(10):
            session.add(ItemAnexo(id_anexo=anx_ids[i], id_producto=prod_ids[i], cantidad=i+1,
                                  precio_compra=Decimal(f"{(i+1)*80}"), precio_venta=Decimal(f"{(i+1)*120}"),
                                  id_moneda=moneda_ids[0]))
        await session.commit()
        print(f"10 items anexo insertados")
        
        # 21. Items Venta Efectivo
        from src.models.item_venta_efectivo import ItemVentaEfectivo
        for i in range(10):
            session.add(ItemVentaEfectivo(id_venta_efectivo=ve_ids[i], id_producto=prod_ids[i], cantidad=i+1,
                                         precio_compra=Decimal(f"{(i+1)*50}"), precio_venta=Decimal(f"{(i+1)*75}"),
                                         id_moneda=moneda_ids[0]))
        await session.commit()
        print(f"10 items venta efectivo insertados")
        
        # 22. Servicios
        from src.models.servicio import Servicio
        for i in range(10):
            session.add(Servicio(codigo_servicio=f"SERV-{i+1:03d}", concepto=f"Servicio {i+1}",
                                 unidad_medida="Hora", precio=Decimal(f"{(i+1)*500}"), id_moneda=moneda_ids[0]))
        await session.commit()
        print(f"10 servicios insertados")
        
    print("=" * 50)
    print("TODOS LOS DATOS INSERTADOS CORRECTAMENTE")

if __name__ == "__main__":
    asyncio.run(main())
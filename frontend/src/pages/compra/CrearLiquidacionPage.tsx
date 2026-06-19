import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { clientesService, anexosService, monedaService, liquidacionService, existenciaService } from '../../services/api';
import type { Cliente, Anexo, Moneda, LiquidacionCreate } from '../../services/api';
import { Plus, Save, ArrowLeft, CheckCircle, Package, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { esPorcentaje, esNumeroPositivo } from '../../utils/validacionFormularios';

export function CrearLiquidacionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedorId = searchParams.get('proveedor');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [itemsAnexo, setItemsAnexo] = useState<any[]>([]);
  const [allItemsAnexo, setAllItemsAnexo] = useState<any[]>([]);
  
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialProveedorId ? Number(initialProveedorId) : null);
  const [filtroAnexo, setFiltroAnexo] = useState<number | null>(null);
  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);

  const validateNumericField = (field: string, value: any): string | null => {
    if (field === 'porcentaje_caguayo' || field === 'tributario') {
      const err = esPorcentaje(value, field === 'porcentaje_caguayo' ? '% Caguayo' : 'Tributario');
      setErrors(prev => ({ ...prev, [field]: err || '' }));
      return err;
    }
    if (field === 'comision_bancaria' || field === 'gasto_empresa') {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        const err = `${field === 'comision_bancaria' ? 'Comisión' : 'Gasto'} no puede ser negativo`;
        setErrors(prev => ({ ...prev, [field]: err }));
        return err;
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
      return null;
    }
    return null;
  };
  
  const [formData, setFormData] = useState<LiquidacionCreate>({
    id_cliente: 0,
    id_convenio: undefined,
    id_anexo: undefined,
    id_moneda: 0,
    devengado: 0,
    tributario: 5,
    comision_bancaria: 0,
    gasto_empresa: 0,
    porcentaje_caguayo: 10,
    tipo_pago: 'TRANSFERENCIA',
    observaciones: '',
    producto_ids: []
  });

  const [convenioInfo, setConvenioInfo] = useState<{
    tipoConvenio: string;
    codigo: string;
    moneda: string;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (monedas.length > 0 && formData.id_moneda === 0) {
      setFormData(prev => ({ ...prev, id_moneda: monedas[0].id_moneda }));
    }
  }, [monedas]);

  useEffect(() => {
    if (filtroCliente) {
      loadItemsAnexo();
    } else {
      setItemsAnexo([]);
      setAllItemsAnexo([]);
    }
  }, [filtroCliente, filtroAnexo, formData.id_moneda]);

  const loadInitialData = async () => {
    try {
      const [clientesData, anexosData, monedasData] = await Promise.all([
        clientesService.getClientes(0, 1000),
        anexosService.getAnexos(undefined, undefined, 0, 1000),
        monedaService.getMonedas()
      ]);
      
      setClientes(clientesData);
      setAnexos(anexosData);
      setMonedas(monedasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const anexosFiltrados = useMemo(() => {
    if (!filtroCliente) return anexos;
    // Filtrar anexos cuyo convenio pertenezca al cliente seleccionado
    return anexos.filter(a => {
      const convenio = (a as any).convenios;
      return convenio && convenio.id_cliente === filtroCliente;
    });
  }, [anexos, filtroCliente]);

  const loadItemsAnexo = async () => {
    if (!filtroCliente) return;
    
    setIsLoadingProductos(true);
    try {
      const [filteredData, allData] = await Promise.all([
        liquidacionService.getItemsAnexoConEstado(
          filtroCliente, 
          filtroAnexo || undefined,
          formData.id_moneda || undefined
        ),
        liquidacionService.getItemsAnexoConEstado(
          filtroCliente, 
          filtroAnexo || undefined
        )
      ]);
      setItemsAnexo(filteredData);
      setAllItemsAnexo(allData);
      setSelectedProductos([]);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setIsLoadingProductos(false);
    }
  };

  const productosPorMoneda = useMemo(() => {
    const counts: Record<number, number> = {};
    allItemsAnexo.forEach((item: any) => {
      if (item.id_moneda) {
        counts[item.id_moneda] = (counts[item.id_moneda] || 0) + 1;
      }
    });
    return counts;
  }, [allItemsAnexo]);

  // Agrupar productos por anexo
  const itemsPorAnexo = useMemo(() => {
    const grupos: Record<number, any> = {};
    
    itemsAnexo.forEach(item => {
      const key = item.id_anexo || 0;
      if (!grupos[key]) {
        grupos[key] = {
          id_anexo: item.id_anexo,
          nombre_anexo: item.nombre_anexo,
          es_compra_venta: item.es_compra_venta,
          origen: item.origen,
          productos: []
        };
      }
      grupos[key].productos.push(item);
    });
    
    return Object.values(grupos);
  }, [itemsAnexo]);

  const handleClienteChange = (clienteId: number) => {
    setFiltroCliente(clienteId);
    setFiltroAnexo(null);
    setFormData(prev => ({
      ...prev,
      id_cliente: clienteId,
      id_anexo: undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
    setConvenioInfo(null);
  };

  const handleChangeProveedorClick = () => {
    setFiltroCliente(null);
    setFiltroAnexo(null);
    setFormData(prev => ({
      ...prev,
      id_cliente: 0,
      id_anexo: undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
    setConvenioInfo(null);
    setItemsAnexo([]);
    setAllItemsAnexo([]);
  };

  const handleAnexoChange = (anexoId: number | null) => {
    setFiltroAnexo(anexoId);
    setFormData(prev => ({
      ...prev,
      id_anexo: anexoId || undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
    
    if (anexoId) {
      const anexo = anexos.find(a => a.id_anexo === anexoId);
      if (anexo) {
        const conv = (anexo as any).convenios;
        setConvenioInfo({
          tipoConvenio: conv?.tipo_convenio?.nombre || '',
          codigo: conv?.codigo || '',
          moneda: conv?.id_moneda ? monedas.find(m => m.id_moneda === conv.id_moneda)?.nombre || '' : ''
        });
      }
    } else {
      setConvenioInfo(null);
    }
  };

  const handleProductoSelect = (pelIds: number[]) => {
    setSelectedProductos(prev => {
      const nuevosIds = pelIds.filter(id => !prev.includes(id));
      return [...prev, ...nuevosIds];
    });
    setFormData(prev => {
      const nuevosIds = pelIds.filter(id => !prev.producto_ids.includes(id));
      return { ...prev, producto_ids: [...prev.producto_ids, ...nuevosIds] };
    });
  };

  const handleProductoDeselect = (pelIds: number[]) => {
    setSelectedProductos(prev => {
      return prev.filter(id => !pelIds.includes(id));
    });
    setFormData(prev => ({
      ...prev,
      producto_ids: prev.producto_ids.filter(id => !pelIds.includes(id))
    }));
  };

  const handleSelectAll = () => {
    const allPelIds: number[] = [];
    itemsAnexo.forEach((item: any) => {
      if (item.estado === 'A LIQUIDAR' && item.pel_ids && item.pel_ids.length > 0) {
        allPelIds.push(...item.pel_ids);
      } else if (item.estado === 'A LIQUIDAR' && item.id_producto_en_liquidacion) {
        allPelIds.push(item.id_producto_en_liquidacion);
      }
    });
    const uniqueIds = [...new Set(allPelIds)];
    setSelectedProductos(uniqueIds);
    setFormData(prev => ({ ...prev, producto_ids: uniqueIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData(prev => ({ ...prev, producto_ids: [] }));
  };

  const handleSelectAllAnexo = (idAnexo: number) => {
    const productosDelAnexo = itemsAnexo.filter(
      (item: any) => item.id_anexo === idAnexo && item.estado === 'A LIQUIDAR'
    );
    
    const pelIdsDelAnexo: number[] = [];
    productosDelAnexo.forEach((item: any) => {
      if (item.pel_ids && item.pel_ids.length > 0) {
        pelIdsDelAnexo.push(...item.pel_ids);
      } else if (item.id_producto_en_liquidacion) {
        pelIdsDelAnexo.push(item.id_producto_en_liquidacion);
      }
    });
    
    setSelectedProductos(prev => {
      const otrosIds = prev.filter(id => {
        const item = itemsAnexo.find((i: any) => 
          (i.pel_ids && i.pel_ids.includes(id)) || i.id_producto_en_liquidacion === id
        );
        return !item || item.id_anexo !== idAnexo;
      });
      return [...otrosIds, ...pelIdsDelAnexo];
    });
    
    setFormData(prev => {
      const otrosIds = prev.producto_ids.filter(id => {
        const item = itemsAnexo.find((i: any) => 
          (i.pel_ids && i.pel_ids.includes(id)) || i.id_producto_en_liquidacion === id
        );
        return !item || item.id_anexo !== idAnexo;
      });
      return { ...prev, producto_ids: [...otrosIds, ...pelIdsDelAnexo] };
    });
  };

  const calculateImporte = () => {
    return itemsAnexo
      .filter((item: any) => item.estado === 'A LIQUIDAR' && selectedProductos.includes(item.id_producto_en_liquidacion))
      .reduce((sum: number, item: any) => {
        return sum + (item.precio_venta * (item.por_liquidar || item.cantidad || 0));
      }, 0);
  };

  const calculateImporteCaguayo = () => {
    const importe = calculateImporte();
    const porcentaje = Number(formData.porcentaje_caguayo) || 10;
    return importe * (porcentaje / 100);
  };

  const calculateDevengado = () => {
    const importe = calculateImporte();
    const importe_caguayo = calculateImporteCaguayo();
    return importe - importe_caguayo;
  };

  const calculateTributarioMonto = () => {
    const devengado = calculateDevengado();
    const tributario = Number(formData.tributario) || 0;
    return devengado * (tributario / 100);
  };

  const calculateSubtotal = () => {
    const devengado = calculateDevengado();
    const tributario_monto = calculateTributarioMonto();
    return devengado - tributario_monto;
  };

  const calculateNetoPagar = () => {
    const devengado = calculateDevengado();
    const tributario_monto = calculateTributarioMonto();
    const subtotal = devengado - tributario_monto;
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    return subtotal - gasto_empresa - comision;
  };

  // Calcular datos de productos seleccionados para el resumen
  const getResumenProductos = () => {
    const productosSeleccionados = itemsAnexo.filter((item: any) => {
      const pelIds = item.pel_ids && item.pel_ids.length > 0 
        ? item.pel_ids 
        : item.id_producto_en_liquidacion ? [item.id_producto_en_liquidacion] : [];
      return pelIds.some((id: number) => selectedProductos.includes(id));
    });

    const totalCantidad = productosSeleccionados.reduce((sum: number, item: any) => 
      sum + (item.por_liquidar || item.cantidad || 0), 0);
    const totalMonto = productosSeleccionados.reduce((sum: number, item: any) => 
      sum + (Number(item.precio_venta) * (item.por_liquidar || item.cantidad || 0)), 0);

    return {
      cantidadProductos: productosSeleccionados.length,
      totalCantidad,
      totalMonto,
      productos: productosSeleccionados.map((item: any) => ({
        nombre: item.producto_nombre || `Producto ${item.id_producto}`,
        cantidad: item.por_liquidar || item.cantidad || 0,
        importe: Number(item.precio_venta) * (item.por_liquidar || item.cantidad || 0)
      }))
    };
  };

  const handleSave = async () => {
if (!filtroCliente) {
      toast.error('Seleccione un proveedor');
      return;
    }

    if (selectedProductos.length === 0) {
      toast.error('Seleccione al menos un producto');
      return;
    }

    if (!formData.id_moneda || formData.id_moneda === 0) {
      toast.error('Seleccione una moneda');
      return;
    }

    const caguayoErr = validateNumericField('porcentaje_caguayo', formData.porcentaje_caguayo);
    const tributarioErr = validateNumericField('tributario', formData.tributario);
    const comisionErr = validateNumericField('comision_bancaria', formData.comision_bancaria);
    const gastoErr = validateNumericField('gasto_empresa', formData.gasto_empresa);
    if (caguayoErr || tributarioErr || comisionErr || gastoErr) {
      toast.error('Corrija los valores en los campos de cálculos');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const productosValidar = itemsAnexo
        .filter((item: any) => item.origen !== "COMPRA_VENTA")
        .filter((item: any) => 
          selectedProductos.includes(item.id_producto_en_liquidacion) ||
          (item.pel_ids && item.pel_ids.some((id: number) => selectedProductos.includes(id)))
        )
        .map((item: any) => ({
          id_producto: item.id_producto,
          cantidad: item.por_liquidar || item.cantidad || 0
        }));

      if (productosValidar.length > 0) {
        const validacion = await existenciaService.validarMultiple(productosValidar);
        if (!validacion.valido) {
          const erroresMsg = validacion.errores
            .map((e: any) => `• ${e.mensaje}`)
            .join('\n');
          toast.error(`Stock insuficiente:\n${erroresMsg}`);
          setIsLoading(false);
          return;
        }
      }

      const dataToSend = {
        ...formData,
        id_cliente: filtroCliente,
        producto_ids: selectedProductos
      };
      
      await liquidacionService.createLiquidacion(dataToSend);
      toast.success('Liquidación creada correctamente');
      navigate('/compra/liquidaciones');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.detail || 'Error al crear liquidación');
} finally {
      setIsLoading(false);
    }
  };

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || '';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Liquidación</h1>
        <Button variant="outline" onClick={() => navigate('/compra/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Información de la Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          
          {convenioInfo && (
            <div className="absolute top-6 right-6 bg-gray-50 border border-gray-300 p-3 text-xs rounded shadow-sm z-10" style={{ right: '24px', top: '24px' }}>
              <div className="font-bold text-gray-700 mb-2 border-b pb-1">LIQUIDACIÓN</div>
              <div className="mb-1">
                <span className="text-gray-500">Concepto:</span>
                <div className="font-medium">{convenioInfo.tipoConvenio}</div>
              </div>
              <div className="mb-1">
                <span className="text-gray-500">Número:</span>
                <div className="font-medium">{convenioInfo.codigo}</div>
              </div>
              <div>
                <span className="text-gray-500">Moneda:</span>
                <div className="font-medium">{convenioInfo.moneda}</div>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Proveedor *</Label>
              <div className="relative mt-1">
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white pr-10"
                  value={filtroCliente || ''}
                  onChange={(e: any) => {
                    const value = Number(e.target.value);
                    if (value) {
                      handleClienteChange(value);
                    }
                  }}
                >
                  <option value="">Seleccionar proveedor</option>
                  {clientes.map((cliente: Cliente) => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
                {filtroCliente && (
                  <button
                    type="button"
                    onClick={handleChangeProveedorClick}
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-500 transition-colors"
                    title="Cambiar proveedor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Anexo</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={filtroAnexo || ''}
                onChange={(e: any) => handleAnexoChange(e.target.value ? Number(e.target.value) : null)}
                disabled={!filtroCliente}
              >
                <option value="">Todos los anexos</option>
                {anexosFiltrados.map((anexo: Anexo) => (
                  <option key={anexo.id_anexo} value={anexo.id_anexo}>
                    {anexo.nombre_anexo}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Moneda *</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.id_moneda}
                onChange={(e: any) => setFormData(prev => ({ ...prev, id_moneda: Number(e.target.value) }))}
              >
                {monedas.map((moneda: Moneda) => {
                  const count = productosPorMoneda[moneda.id_moneda] || 0;
                  return (
                    <option key={moneda.id_moneda} value={moneda.id_moneda}>
                      {moneda.nombre} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Tipo de Pago</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.tipo_pago}
                onChange={(e: any) => setFormData(prev => ({ ...prev, tipo_pago: e.target.value }))}
              >
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            </div>

            {filtroCliente && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium">Productos por Anexo</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>
              
              {isLoadingProductos ? (
                <p className="text-gray-500 py-4">Cargando productos...</p>
              ) : itemsAnexo.length === 0 ? (
                <p className="text-gray-500 py-4">No hay productos en los anexos de este proveedor</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {itemsPorAnexo.map((grupo: any) => {
                    const productosALiquidar = grupo.productos.filter((p: any) => p.estado !== 'LIQUIDADO');
                    const seleccionadosDelAnexo = selectedProductos.filter(id => {
                      const producto = grupo.productos.find((p: any) => p.id_producto_en_liquidacion === id);
                      return !!producto;
                    });
                    const todosSeleccionados = productosALiquidar.length > 0 && 
                      productosALiquidar.length === seleccionadosDelAnexo.length;
                    
                    return (
                      <div key={grupo.id_anexo} className="border rounded-lg overflow-hidden">
                        {/* Header del anexo */}
                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                          <div className="font-medium text-gray-800">
                            {grupo.nombre_anexo || 'Sin nombre'}
                            {grupo.es_compra_venta && (
                              <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                                COMPRA VENTA
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (todosSeleccionados) {
                                const pelIdsDelAnexo: number[] = [];
                                productosALiquidar.forEach((item: any) => {
                                  if (item.pel_ids && item.pel_ids.length > 0) {
                                    pelIdsDelAnexo.push(...item.pel_ids);
                                  } else if (item.id_producto_en_liquidacion) {
                                    pelIdsDelAnexo.push(item.id_producto_en_liquidacion);
                                  }
                                });
                                handleProductoDeselect(pelIdsDelAnexo);
                              } else {
                                handleSelectAllAnexo(grupo.id_anexo);
                              }
                            }}
                            className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={productosALiquidar.length === 0}
                          >
                            {todosSeleccionados ? 'Deseleccionar' : 'Seleccionar todos'}
                          </button>
                        </div>
                        
                        {/* Tabla de productos del anexo */}
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left w-10"></th>
                              <th className="px-3 py-2 text-left">Producto</th>
                              <th className="px-3 py-2 text-right">Máx. a Liquidar</th>
                              <th className="px-3 py-2 text-right">En Consignación</th>
                              <th className="px-3 py-2 text-right">Precio</th>
                              <th className="px-3 py-2 text-right">Total</th>
                              <th className="px-3 py-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {grupo.productos.map((item: any) => {
                              const isALiquidar = item.estado === 'A LIQUIDAR';
                              const isConsignacion = item.estado === 'EN_CONSIGNACION';
                              const maxALiquidar = item.por_liquidar || item.cantidad || 0;
                              const enConsignacion = item.en_consignacion ?? 0;
                              const pelIds = item.pel_ids && item.pel_ids.length > 0 ? item.pel_ids : (item.id_producto_en_liquidacion ? [item.id_producto_en_liquidacion] : []);
                              const isSelected = pelIds.length > 0 && pelIds.some((id: number) => selectedProductos.includes(id));
                              const toggleSelect = () => {
                                if (isSelected) {
                                  handleProductoDeselect(pelIds);
                                } else {
                                  handleProductoSelect(pelIds);
                                }
                              };
                              return (
                                <tr key={`${item.id_item_anexo}-${item.id_anexo}-${item.id_producto_en_liquidacion || 'none'}`} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={toggleSelect}
                                      className="rounded"
                                      disabled={!isALiquidar}
                                    />
                                  </td>
                                  <td className="px-3 py-2">{item.producto_nombre || `Producto ${item.id_producto}`}</td>
                                  <td className="px-3 py-2 text-right font-medium text-blue-600">{maxALiquidar}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">{enConsignacion}</td>
                                  <td className="px-3 py-2 text-right">${Number(item.precio_venta).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    ${(item.precio_venta * maxALiquidar).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                      isConsignacion ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {isConsignacion ? 'En Consignación' : 'A Liquidar'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedProductos.length > 0 && (() => {
            const resumen = getResumenProductos();
            return (
              <div className="mt-6 border rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Resumen de Liquidación</h3>
                <div className="flex gap-4 mb-4 text-sm">
                  <span><strong>{resumen.cantidadProductos}</strong> productos</span>
                  <span>|</span>
                  <span>Cantidad a liquidar: <strong>{resumen.totalCantidad}</strong> unidades</span>
                  <span>|</span>
                  <span>Total: <strong className="text-green-600">${resumen.totalMonto.toFixed(2)}</strong></span>
                </div>
                
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resumen.productos.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{p.nombre}</td>
                        <td className="px-3 py-2 text-right">{p.cantidad}</td>
                        <td className="px-3 py-2 text-right">${p.importe.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-gray-50">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{resumen.totalCantidad}</td>
                      <td className="px-3 py-2 text-right">${resumen.totalMonto.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          <div className="grid gap-4 md:grid-cols-5 mt-6">
            <div>
              <Label className="text-sm font-medium">Caguayo (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.porcentaje_caguayo}
                onChange={(e: any) => { setFormData(prev => ({ ...prev, porcentaje_caguayo: Number(e.target.value) })); validateNumericField('porcentaje_caguayo', e.target.value); }}
              />
              {errors.porcentaje_caguayo && <p className="text-red-500 text-sm mt-1">{errors.porcentaje_caguayo}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Tributario (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tributario}
                onChange={(e: any) => { setFormData(prev => ({ ...prev, tributario: Number(e.target.value) })); validateNumericField('tributario', e.target.value); }}
              />
              {errors.tributario && <p className="text-red-500 text-sm mt-1">{errors.tributario}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Comisión Bancaria</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.comision_bancaria}
                onChange={(e: any) => { setFormData(prev => ({ ...prev, comision_bancaria: Number(e.target.value) })); validateNumericField('comision_bancaria', e.target.value); }}
              />
              {errors.comision_bancaria && <p className="text-red-500 text-sm mt-1">{errors.comision_bancaria}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Gasto Empresa</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.gasto_empresa}
                onChange={(e: any) => { setFormData(prev => ({ ...prev, gasto_empresa: Number(e.target.value) })); validateNumericField('gasto_empresa', e.target.value); }}
              />
              {errors.gasto_empresa && <p className="text-red-500 text-sm mt-1">{errors.gasto_empresa}</p>}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            {/* Sección: Cálculos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Cálculos</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-gray-800">IMPORTE:</span>
                  <span className="text-base font-bold text-gray-800">{calculateImporte().toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-sm text-gray-500">Importe Caguayo ({Number(formData.porcentaje_caguayo || 10)}%):</span>
                  <span className="text-sm text-gray-500">- {calculateImporteCaguayo().toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-base font-semibold text-red-600">DEVENGADO:</span>
                  <span className="text-base font-semibold text-red-600">{calculateDevengado().toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-sm text-gray-500">Tributario ({Number(formData.tributario || 0)}%):</span>
                  <span className="text-sm text-gray-500">- {calculateTributarioMonto().toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-base font-semibold text-gray-700">SUBTOTAL:</span>
                  <span className="text-base font-semibold text-gray-700">{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-sm text-gray-500">Gasto Empresa:</span>
                  <span className="text-sm text-gray-500">- {Number(formData.gasto_empresa || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-sm text-gray-500">Comisión:</span>
                  <span className="text-sm text-gray-500">- {Number(formData.comision_bancaria || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-300 pt-2 mt-1">
                  <span className="text-lg font-bold text-gray-800">NETO A PAGAR:</span>
                  <span className="text-lg font-bold text-green-600">{calculateNetoPagar().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-sm font-medium">Observaciones</Label>
            <textarea
              value={formData.observaciones}
              onChange={(e: any) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>

          <div className="flex gap-2 mt-8 pt-6 border-t">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Liquidación'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/compra/liquidaciones')}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

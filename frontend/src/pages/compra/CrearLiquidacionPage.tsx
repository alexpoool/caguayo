import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { clientesService, monedaService, liquidacionService, existenciaService } from '../../services/api';
import type { Cliente, Moneda, LiquidacionCreate, ProductosEnLiquidacion } from '../../services/api';
import { Plus, Save, ArrowLeft, CheckCircle, Package, X, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { esPorcentaje } from '../../utils/validacionFormularios';
import { Decimal } from 'decimal.js';
import { mul, add, sub, percentToMultiplier, toNumber, toFixed } from '../../utils/decimal';
import { DEFAULTS } from '../../config/defaults';

export function CrearLiquidacionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedorId = searchParams.get('proveedor');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
  const proveedorDropdownRef = useRef<HTMLDivElement>(null);
  
  const [filtroCliente, setFiltroCliente] = useState<number | null>(initialProveedorId ? Number(initialProveedorId) : null);
  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (proveedorDropdownRef.current && !proveedorDropdownRef.current.contains(event.target as Node)) {
        setShowProveedorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    tributario: DEFAULTS.TRIBUTARIO,
    comision_bancaria: 0,
    gasto_empresa: 0,
    porcentaje_caguayo: DEFAULTS.PORCENTAJE_CAGUAYO,
    tipo_pago: DEFAULTS.TIPO_PAGO,
    observaciones: '',
    producto_ids: []
  });

  const { data: productosPendientes = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ['productos-pendientes-crear', filtroCliente, formData.id_moneda],
    queryFn: () => {
      if (!filtroCliente) return Promise.resolve([]);
      return liquidacionService.getProductosPendientesByCliente(
        filtroCliente, undefined, formData.id_moneda
      );
    },
    enabled: !!filtroCliente
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (monedas.length > 0 && formData.id_moneda === 0) {
      setFormData(prev => ({ ...prev, id_moneda: monedas[0].id_moneda }));
    }
  }, [monedas]);

  const loadInitialData = async () => {
    try {
      const [clientesData, monedasData] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas()
      ]);
      
      setClientes(clientesData);
      setMonedas(monedasData);
    } catch (error) {
      console.error('Error en operación:', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleClienteChange = (clienteId: number) => {
    setFiltroCliente(clienteId);
    setFormData(prev => ({
      ...prev,
      id_cliente: clienteId,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleChangeProveedorClick = () => {
    setFiltroCliente(null);
    setFormData(prev => ({
      ...prev,
      id_cliente: 0,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleProductoSelect = (productoId: number) => {
    setSelectedProductos(prev => {
      if (prev.includes(productoId)) {
        return prev.filter(id => id !== productoId);
      }
      return [...prev, productoId];
    });
    setFormData(prev => ({
      ...prev,
      producto_ids: prev.producto_ids.includes(productoId)
        ? prev.producto_ids.filter(id => id !== productoId)
        : [...prev.producto_ids, productoId]
    }));
  };

  const handleSelectAll = () => {
    const allIds = productosPendientes.map((p: ProductosEnLiquidacion) => p.id_producto_en_liquidacion);
    setSelectedProductos(allIds);
    setFormData(prev => ({ ...prev, producto_ids: allIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData(prev => ({ ...prev, producto_ids: [] }));
  };

  const calculateImporte = (): number => {
    const total = productosPendientes
      .filter((p: ProductosEnLiquidacion) => selectedProductos.includes(p.id_producto_en_liquidacion))
      .reduce((acc: Decimal, p: ProductosEnLiquidacion) => {
        return add(acc, mul(p.precio, p.cantidad));
      }, new Decimal(0));
    return toNumber(total);
  };

  const calculateImporteCaguayo = (): number => {
    const importe = new Decimal(calculateImporte());
    const porcentaje = Number(formData.porcentaje_caguayo) || DEFAULTS.PORCENTAJE_CAGUAYO;
    const result = mul(importe, percentToMultiplier(porcentaje));
    return toNumber(result);
  };

  const calculateDevengado = (): number => {
    const importe = new Decimal(calculateImporte());
    const importe_caguayo = new Decimal(calculateImporteCaguayo());
    return toNumber(sub(importe, importe_caguayo));
  };

  const calculateTributarioMonto = (): number => {
    const devengado = new Decimal(calculateDevengado());
    const tributario = Number(formData.tributario) || 0;
    const result = mul(devengado, percentToMultiplier(tributario));
    return toNumber(result);
  };

  const calculateSubtotal = (): number => {
    const devengado = new Decimal(calculateDevengado());
    const tributario_monto = new Decimal(calculateTributarioMonto());
    return toNumber(sub(devengado, tributario_monto));
  };

  const calculateNetoPagar = (): number => {
    const subtotal = new Decimal(calculateSubtotal());
    const gasto_empresa = Number(formData.gasto_empresa) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    return toNumber(sub(sub(subtotal, gasto_empresa), comision));
  };

  const getResumenProductos = () => {
    const productosSeleccionados = productosPendientes.filter((p: ProductosEnLiquidacion) =>
      selectedProductos.includes(p.id_producto_en_liquidacion)
    );

    const totalCantidad = productosSeleccionados.reduce((sum: number, p: ProductosEnLiquidacion) => 
      sum + p.cantidad, 0);
    const totalMonto = toNumber(
      productosSeleccionados.reduce((acc: Decimal, p: ProductosEnLiquidacion) => 
        add(acc, mul(p.precio, p.cantidad)), new Decimal(0))
    );

    return {
      cantidadProductos: productosSeleccionados.length,
      totalCantidad,
      totalMonto,
      productos: productosSeleccionados.map((p: ProductosEnLiquidacion) => ({
        nombre: p.producto_nombre || `Producto ${p.id_producto}`,
        cantidad: p.cantidad,
        importe: toNumber(mul(p.precio, p.cantidad))
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
      const productosValidar = productosPendientes
        .filter((p: ProductosEnLiquidacion) => selectedProductos.includes(p.id_producto_en_liquidacion))
        .map((p: ProductosEnLiquidacion) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad
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
      console.error('Error en operación:', error instanceof Error ? error.message : 'Error desconocido');
      toast.error(error?.response?.data?.detail || 'Error al crear liquidación');
} finally {
      setIsLoading(false);
    }
  };

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || '';
  };

  const getMonedaNombre = (monedaId: number) => {
    const moneda = monedas.find((m: Moneda) => m.id_moneda === monedaId);
    return moneda?.nombre || '';
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
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Proveedor *</Label>
              <div className="relative mt-1">
                {filtroCliente ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-teal-300 rounded-lg bg-teal-50">
                    <span className="flex-1 font-medium text-teal-900">
                      {clientes.find((c: Cliente) => c.id_cliente === filtroCliente)?.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={handleChangeProveedorClick}
                      className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                      title="Cambiar proveedor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={proveedorDropdownRef}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar proveedor..."
                      value={proveedorSearch}
                      onChange={(e) => setProveedorSearch(e.target.value)}
                      onFocus={() => setShowProveedorDropdown(true)}
                      className="pl-10"
                    />
                    {showProveedorDropdown && (() => {
                      const filtrados = proveedorSearch
                        ? clientes.filter((c: Cliente) =>
                            c.nombre.toLowerCase().includes(proveedorSearch.toLowerCase()) ||
                            c.codigo?.toLowerCase().includes(proveedorSearch.toLowerCase()) ||
                            c.nit?.toLowerCase().includes(proveedorSearch.toLowerCase())
                          )
                        : clientes;
                      return filtrados.length > 0 ? (
                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filtrados.slice(0, 20).map((cliente: Cliente) => (
                            <li
                              key={cliente.id_cliente}
                              onClick={() => {
                                handleClienteChange(cliente.id_cliente);
                                setProveedorSearch("");
                                setShowProveedorDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{cliente.nombre}</div>
                              <div className="text-xs text-gray-500">{cliente.codigo} · {cliente.nit}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                          No se encontraron proveedores
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Moneda *</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.id_moneda}
                onChange={(e: any) => setFormData(prev => ({ ...prev, id_moneda: Number(e.target.value) }))}
              >
                {monedas.map((moneda: Moneda) => (
                  <option key={moneda.id_moneda} value={moneda.id_moneda}>
                    {moneda.nombre}
                  </option>
                ))}
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
                <Label className="text-sm font-medium">Productos Pendientes</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-teal-600 hover:underline"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-sm text-teal-600 hover:underline"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>
              
              {isLoadingProductos ? (
                <p className="text-gray-500 py-4">Cargando productos...</p>
              ) : productosPendientes.length === 0 ? (
                <p className="text-gray-500 py-4">No hay productos pendientes para este proveedor</p>
              ) : (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-left">Moneda</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2 text-right">Precio</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productosPendientes.map((prod: ProductosEnLiquidacion) => (
                        <tr key={prod.id_producto_en_liquidacion} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedProductos.includes(prod.id_producto_en_liquidacion)}
                              onChange={() => handleProductoSelect(prod.id_producto_en_liquidacion)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2">{prod.producto_nombre || prod.producto?.nombre || `Producto ${prod.id_producto}`}</td>
                          <td className="px-3 py-2">{getMonedaNombre(prod.id_moneda)}</td>
                          <td className="px-3 py-2 text-right">{prod.cantidad}</td>
                          <td className="px-3 py-2 text-right">${prod.precio.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            ${(prod.precio * prod.cantidad).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <span className="text-sm text-gray-500">Importe Caguayo ({Number(formData.porcentaje_caguayo || DEFAULTS.PORCENTAJE_CAGUAYO)}%):</span>
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

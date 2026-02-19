import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  movimientosService,
  productosService,
  monedaService,
  provedoresService,
  conveniosService,
  anexosService,
  dependenciasService
} from '../../services/api';
import type {
  MovimientoCreate
} from '../../types/index';
import { Button, Card, CardContent, Input, Label } from '../../components/ui';
import {
  Truck,
  AlertCircle,
  Gift,
  RotateCcw,
  Save,
  Package,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
  ChevronDown,
  Search,
  Building,
  FileText,
  Calendar,
  Hash,
  DollarSign,
  Sparkles,
  MapPin,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MovimientoFormData extends MovimientoCreate {}

// Componente SearchableSelect reutilizable
interface SearchableSelectProps<T> {
  value: number | null;
  onChange: (value: number | null, item: T | null) => void;
  onSearchChange?: (searchTerm: string) => void;
  options: T[];
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => number;
  getOptionDisplay?: (item: T) => React.ReactNode;
  idField: keyof T;
  label?: string;
  icon?: React.ReactNode;
}

function SearchableSelect<T extends Record<string, any>>({
  value,
  onChange,
  onSearchChange,
  options,
  isLoading,
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
  getOptionLabel,
  getOptionValue,
  getOptionDisplay,
  idField,
  label,
  icon
}: SearchableSelectProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedItem = options.find(item => item[idField] === value);

  // Filtrar opciones localmente según el término de búsqueda
  const filteredOptions = options.filter(item => {
    const label = getOptionLabel(item).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  // Calcular la posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      setDropdownPosition({
        top: rect.bottom + scrollY + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Actualizar posición cuando cambia el tamaño de la ventana
  useEffect(() => {
    function handleResize() {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        setDropdownPosition({
          top: rect.bottom + scrollY + 4,
          left: rect.left,
          width: rect.width
        });
      }
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  // Notificar cambios en el término de búsqueda con debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    onChange(getOptionValue(item), item);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Renderizar el dropdown usando Portal
  const renderDropdown = () => {
    if (!isOpen || disabled || !dropdownPosition) return null;

    const dropdownContent = (
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto z-[9999]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
        }}
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
            Cargando...
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchTerm ? 'No se encontraron resultados' : 'Escribe para buscar...'}
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map((item) => (
              <button
                key={item[idField]}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                  value === getOptionValue(item) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {getOptionDisplay ? getOptionDisplay(item) : getOptionLabel(item)}
              </button>
            ))}
          </div>
        )}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-gray-700">
          {icon}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <div
          className={`flex items-center border rounded-lg transition-all duration-200 ${
            disabled
              ? 'bg-gray-100 cursor-not-allowed border-gray-200'
              : 'bg-white border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
          }`}
          onClick={handleInputClick}
        >
          <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : selectedItem ? getOptionLabel(selectedItem) : ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={selectedItem ? '' : placeholder}
            disabled={disabled}
            className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm"
            readOnly={!isOpen}
          />
          {selectedItem && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 mr-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 mr-3 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
      {renderDropdown()}
    </div>
  );
}

interface MovimientoRecepcionFormProps {
  tipoMovimiento: 'RECEPCION' | 'MERMA' | 'DONACION' | 'DEVOLUCION';
  onSubmit: (data: MovimientoCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function MovimientoRecepcionForm({ 
  tipoMovimiento, 
  onSubmit, 
  onCancel,
  isSubmitting = false 
}: MovimientoRecepcionFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MovimientoFormData>>({
    fecha: new Date().toISOString().split('T')[0],
    estado: 'pendiente',
  });
  const [codigoGenerado, setCodigoGenerado] = useState<string>('');

  const crearMutation = useMutation({
    mutationFn: (data: MovimientoCreate) => movimientosService.createMovimiento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      toast.success(`${tipoMovimiento} creada exitosamente`);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        estado: 'pendiente',
      });
      setCodigoGenerado('');
    },
    onError: (error: any) => {
      toast.error(error?.message || `Error al crear ${tipoMovimiento.toLowerCase()}`);
    },
  });

  // Cargar todos los datos
  const { data: proveedores = [], isLoading: isLoadingProveedores } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => provedoresService.getProvedores(),
  });

  // Convenios filtrados por proveedor seleccionado
  const { data: convenios = [], isLoading: isLoadingConvenios } = useQuery({
    queryKey: ['convenios', formData.id_provedor],
    queryFn: () => conveniosService.getConvenios(formData.id_provedor!),
    enabled: !!formData.id_provedor,
  });

  // Anexos filtrados por convenio seleccionado
  const { data: anexos = [], isLoading: isLoadingAnexos } = useQuery({
    queryKey: ['anexos', formData.id_convenio],
    queryFn: () => anexosService.getAnexos(formData.id_convenio!),
    enabled: !!formData.id_convenio,
  });

  // Productos filtrados por anexo seleccionado
  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ['productos-anexo', formData.id_anexo],
    queryFn: () => productosService.getProductosByAnexo(formData.id_anexo!),
    enabled: !!formData.id_anexo,
  });

  const { data: monedas = [], isLoading: isLoadingMonedas } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: dependencias = [], isLoading: isLoadingDependencias } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: tiposMovimiento = [] } = useQuery({
    queryKey: ['tipos-movimiento'],
    queryFn: () => movimientosService.getTiposMovimiento(),
  });

  // Generar código automáticamente cuando se seleccionan todos los campos
  useEffect(() => {
    if (formData.id_provedor && formData.id_convenio && formData.id_anexo && formData.id_producto) {
      // El código será generado por el backend con formato: año+id_movimiento+id_provedor+id_convenio+id_anexo+id_producto
      const anio = new Date().getFullYear();
      const codigoPreview = `${anio}-${formData.id_provedor}-${formData.id_convenio}-${formData.id_anexo}-${formData.id_producto}`;
      setCodigoGenerado(codigoPreview);
    } else {
      setCodigoGenerado('');
    }
  }, [formData.id_provedor, formData.id_convenio, formData.id_anexo, formData.id_producto]);

  const handleProveedorChange = (value: number | null) => {
    setFormData({
      ...formData,
      id_provedor: value || undefined,
      id_convenio: undefined,
      id_anexo: undefined,
      id_producto: undefined,
    });
  };

  const handleConvenioChange = (value: number | null) => {
    setFormData({
      ...formData,
      id_convenio: value || undefined,
      id_anexo: undefined,
      id_producto: undefined,
    });
  };

  const handleAnexoChange = (value: number | null) => {
    setFormData({
      ...formData,
      id_anexo: value || undefined,
      id_producto: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tipoMov = tiposMovimiento.find(t => t.tipo === tipoMovimiento);
    if (!tipoMov) {
      toast.error('Tipo de movimiento no encontrado');
      return;
    }

    // Validaciones comunes para todos los tipos
    if (!formData.id_provedor) {
      toast.error('Debe seleccionar un proveedor');
      return;
    }
    if (!formData.id_convenio) {
      toast.error('Debe seleccionar un convenio');
      return;
    }
    if (!formData.id_anexo) {
      toast.error('Debe seleccionar un anexo');
      return;
    }
    if (!formData.id_producto) {
      toast.error('Debe seleccionar un producto');
      return;
    }
    if (!formData.cantidad || formData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (!formData.id_dependencia) {
      toast.error('Debe seleccionar una dependencia');
      return;
    }

    // Validaciones específicas solo para RECEPCION
    if (tipoMovimiento === 'RECEPCION') {
      if (!formData.precio_compra || formData.precio_compra <= 0) {
        toast.error('Debe ingresar un precio de compra válido');
        return;
      }
      if (!formData.precio_venta || formData.precio_venta <= 0) {
        toast.error('Debe ingresar un precio de venta válido');
        return;
      }
      if (!formData.id_moneda_compra || !formData.id_moneda_venta) {
        toast.error('Debe seleccionar las monedas');
        return;
      }
    }

    const movimientoData: MovimientoCreate = {
      id_tipo_movimiento: tipoMov.id_tipo_movimiento,
      id_dependencia: formData.id_dependencia || 0,
      id_anexo: formData.id_anexo || 0,
      id_producto: formData.id_producto || 0,
      cantidad: formData.cantidad || 0,
      fecha: formData.fecha || new Date().toISOString(),
      observacion: formData.observacion,
      estado: formData.estado || 'pendiente',
      id_convenio: formData.id_convenio,
      id_provedor: formData.id_provedor,
      // Solo incluir precios para RECEPCION
      ...(tipoMovimiento === 'RECEPCION' && {
        precio_compra: formData.precio_compra,
        id_moneda_compra: formData.id_moneda_compra,
        precio_venta: formData.precio_venta,
        id_moneda_venta: formData.id_moneda_venta,
      }),
    };

    try {
      await crearMutation.mutateAsync(movimientoData);
      onSubmit(movimientoData);
    } catch (error) {
      console.error('Error al crear movimiento:', error);
    }
  };

  const getTipoConfig = () => {
    switch (tipoMovimiento) {
      case 'RECEPCION':
        return {
          icon: Truck,
          gradient: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          shadowColor: 'shadow-green-200',
          impacto: 'Entrada',
          impactoIcon: TrendingUp,
          impactoColor: 'text-green-600',
          descripcion: 'Registro de entrada de nuevos productos al inventario',
          sectionColor: 'border-l-green-500',
          priceSectionColor: 'border-l-green-500'
        };
      case 'MERMA':
        return {
          icon: AlertCircle,
          gradient: 'from-red-500 to-rose-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          shadowColor: 'shadow-red-200',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de pérdidas, deterioro o productos dañados',
          sectionColor: 'border-l-red-500',
          priceSectionColor: 'border-l-red-500'
        };
      case 'DONACION':
        return {
          icon: Gift,
          gradient: 'from-purple-500 to-violet-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          shadowColor: 'shadow-purple-200',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de donaciones de productos',
          sectionColor: 'border-l-purple-500',
          priceSectionColor: 'border-l-purple-500'
        };
      case 'DEVOLUCION':
        return {
          icon: RotateCcw,
          gradient: 'from-orange-500 to-amber-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          shadowColor: 'shadow-orange-200',
          impacto: 'Salida',
          impactoIcon: TrendingDown,
          impactoColor: 'text-red-600',
          descripcion: 'Registro de devoluciones a proveedores',
          sectionColor: 'border-l-orange-500',
          priceSectionColor: 'border-l-orange-500'
        };
      default:
        return {
          icon: Package,
          gradient: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          shadowColor: 'shadow-gray-200',
          impacto: '',
          impactoIcon: Package,
          impactoColor: 'text-gray-600',
          descripcion: '',
          sectionColor: 'border-l-gray-500',
          priceSectionColor: 'border-l-gray-500'
        };
    }
  };

  const config = getTipoConfig();
  const Icon = config.icon;
  const ImpactoIcon = config.impactoIcon;
  const mostrarPrecios = tipoMovimiento === 'RECEPCION';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${config.gradient} text-white shadow-xl animate-bounce-subtle`}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${config.textColor}`}>
              {tipoMovimiento}
            </h1>
            <p className="text-gray-500 mt-1">
              {config.descripcion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sparkles className={`h-6 w-6 ${config.impactoColor} animate-pulse`} />
          <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full ${config.bgColor} ${config.impactoColor} border ${config.borderColor}`}>
            <ImpactoIcon className="h-5 w-5" />
            {config.impacto}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Sección de Proveedor - Jerarquía */}
          <Card className={`border-l-4 ${config.sectionColor} shadow-md hover:shadow-lg transition-shadow duration-300 overflow-visible`}>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} text-white`}>
                  <Truck className="h-5 w-5" />
                </div>
                Información del Proveedor
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-normal text-gray-500">Jerarquía: Proveedor → Convenio → Anexo</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <SearchableSelect
                    label="Proveedor"
                    required
                    icon={<Building className="h-4 w-4 text-blue-500" />}
                    value={formData.id_provedor || null}
                    onChange={handleProveedorChange}
                    options={proveedores}
                    isLoading={isLoadingProveedores}
                    placeholder="Buscar proveedor..."
                    getOptionLabel={(item) => item.nombre}
                    getOptionValue={(item) => item.id_provedores}
                    idField="id_provedores"
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Convenio"
                    required
                    icon={<FileText className="h-4 w-4 text-green-500" />}
                    disabled={!formData.id_provedor}
                    value={formData.id_convenio || null}
                    onChange={handleConvenioChange}
                    options={convenios}
                    isLoading={isLoadingConvenios}
                    placeholder={!formData.id_provedor ? "Seleccione un proveedor primero" : "Buscar convenio..."}
                    getOptionLabel={(item) => item.nombre_convenio}
                    getOptionValue={(item) => item.id_convenio}
                    idField="id_convenio"
                  />
                  {!formData.id_provedor && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Seleccione un proveedor para ver sus convenios
                    </p>
                  )}
                  {formData.id_provedor && convenios.length === 0 && !isLoadingConvenios && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Este proveedor no tiene convenios registrados
                    </p>
                  )}
                </div>

                <div>
                  <SearchableSelect
                    label="Anexo"
                    required
                    icon={<ClipboardList className="h-4 w-4 text-purple-500" />}
                    disabled={!formData.id_convenio}
                    value={formData.id_anexo || null}
                    onChange={handleAnexoChange}
                    options={anexos}
                    isLoading={isLoadingAnexos}
                    placeholder={!formData.id_convenio ? "Seleccione un convenio primero" : "Buscar anexo..."}
                    getOptionLabel={(item) => `${item.nombre_anexo} - ${item.numero_anexo}`}
                    getOptionValue={(item) => item.id_anexo}
                    getOptionDisplay={(item) => (
                      <div className="flex flex-col">
                        <span className="font-medium">{item.nombre_anexo}</span>
                        <span className="text-gray-500 text-xs">Anexo N° {item.numero_anexo}</span>
                      </div>
                    )}
                    idField="id_anexo"
                  />
                  {!formData.id_convenio && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Seleccione un convenio para ver sus anexos
                    </p>
                  )}
                  {formData.id_convenio && anexos.length === 0 && !isLoadingAnexos && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Este convenio no tiene anexos registrados
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Producto y Cantidad */}
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 overflow-visible">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Package className="h-5 w-5" />
                </div>
                Producto y Cantidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Producto"
                    required
                    icon={<Package className="h-4 w-4 text-blue-500" />}
                    disabled={!formData.id_anexo}
                    value={formData.id_producto || null}
                    onChange={(value) => setFormData({ ...formData, id_producto: value || undefined })}
                    options={productos}
                    isLoading={isLoadingProductos}
                    placeholder={!formData.id_anexo ? "Seleccione un anexo primero" : "Buscar producto por nombre..."}
                    getOptionLabel={(item) => item.nombre}
                    getOptionValue={(item) => item.id_producto}
                    getOptionDisplay={(item) => (
                      <div className="flex justify-between items-center">
                        <span>{item.nombre}</span>
                        <span className="text-gray-500 text-xs">Disponible: {item.cantidad || 0}</span>
                      </div>
                    )}
                    idField="id_producto"
                  />
                  {!formData.id_anexo && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Seleccione un anexo para ver los productos disponibles
                    </p>
                  )}
                  {formData.id_anexo && productos.length === 0 && !isLoadingProductos && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No hay productos disponibles en este anexo
                    </p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Hash className="h-4 w-4 text-orange-500" />
                    Cantidad *
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    className="mt-1.5 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.cantidad || ''}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    placeholder="Cantidad"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Fecha, Dependencia y Código */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="h-4 w-4 text-blue-500" />
                Fecha *
              </Label>
              <Input
                type="date"
                required
                className="mt-1.5 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.fecha || ''}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>

            <div>
              <SearchableSelect
                label="Dependencia"
                required
                icon={<MapPin className="h-4 w-4 text-red-500" />}
                value={formData.id_dependencia || null}
                onChange={(value) => setFormData({ ...formData, id_dependencia: value || undefined })}
                options={dependencias}
                isLoading={isLoadingDependencias}
                placeholder="Buscar dependencia..."
                getOptionLabel={(item) => item.nombre}
                getOptionValue={(item) => item.id_dependencia}
                idField="id_dependencia"
              />
            </div>

            {/* Código Generado */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Hash className="h-4 w-4 text-green-500" />
                Código del Movimiento
              </Label>
              <div className={`mt-1.5 px-4 py-3 rounded-lg border-2 flex items-center gap-2 ${
                codigoGenerado 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 font-mono font-bold shadow-sm' 
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}>
                {codigoGenerado ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    {codigoGenerado}
                  </>
                ) : (
                  <>
                    <Hash className="h-5 w-5" />
                    Se generará automáticamente
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sección de Precios - SOLO PARA RECEPCION */}
          {mostrarPrecios && (
            <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  Precios y Monedas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Precio de Compra *
                    </Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.precio_compra || ''}
                        onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="flex-1 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <select
                        value={formData.id_moneda_compra || ''}
                        onChange={(e) => setFormData({ ...formData, id_moneda_compra: parseInt(e.target.value) || 0 })}
                        disabled={isLoadingMonedas}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all"
                      >
                        <option value="">💱 Moneda</option>
                        {monedas.map((moneda) => (
                          <option key={moneda.id_moneda} value={moneda.id_moneda}>
                            {moneda.simbolo} - {moneda.denominacion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Precio de Venta *
                    </Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.precio_venta || ''}
                        onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="flex-1 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <select
                        value={formData.id_moneda_venta || ''}
                        onChange={(e) => setFormData({ ...formData, id_moneda_venta: parseInt(e.target.value) || 0 })}
                        disabled={isLoadingMonedas}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all"
                      >
                        <option value="">💱 Moneda</option>
                        {monedas.map((moneda) => (
                          <option key={moneda.id_moneda} value={moneda.id_moneda}>
                            {moneda.simbolo} - {moneda.denominacion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observación */}
          <div>
            <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ClipboardList className="h-4 w-4 text-gray-500" />
              Observación
            </Label>
            <textarea
              value={formData.observacion || ''}
              onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
              rows={3}
              className="w-full mt-1.5 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder={`Describa detalles de la ${tipoMovimiento.toLowerCase()}...`}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 mt-6 border-t">
            <Button
              type="submit"
              disabled={crearMutation.isPending || isSubmitting}
              className={`gap-2 px-8 py-6 text-lg font-bold bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300`}
            >
              <Save className="h-5 w-5" />
              {crearMutation.isPending ? 'Guardando...' : 'Guardar Movimiento'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={crearMutation.isPending}
              className="px-6 py-6 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  movimientosService,
  dependenciasService
} from '../../services/api';
import { Button, Card, CardContent, Input, Label } from '../../components/ui';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Package,
  Truck,
  Building,
  Hash,
  MapPin,
  ClipboardList,
  Search,
  ChevronDown,
  X,
  CheckCircle2,
  ArrowRightLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

interface RecepcionSeleccionada {
  id_movimiento: number;
  id_producto: number;
  nombre_producto: string;
  codigo_producto: string | null;
  cantidad: number;
  id_dependencia: number;
  nombre_dependencia: string;
  id_proveedor: number | null;
  proveedor_nombre: string | null;
  id_convenio: number | null;
  convenio_nombre: string | null;
  id_anexo: number | null;
  anexo_nombre: string | null;
  anexo_numero: string | null;
  fecha: string;
  codigo: string | null;
}

interface Destino {
  id: number;
  id_dependencia: number | null;
  cantidad: number;
}

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

  const filteredOptions = options.filter(item => {
    const label = getOptionLabel(item).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
  };

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
          onClick={() => !disabled && setIsOpen(true)}
        >
          <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : selectedItem ? getOptionLabel(selectedItem) : ''}
            onChange={(e) => handleSearchChange(e.target.value)}
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

export function MovimientoAjusteForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const recepcionInicial = location.state?.recepcionSeleccionada as RecepcionSeleccionada | undefined;
  
  const [recepcionSeleccionada] = useState<RecepcionSeleccionada | null>(
    recepcionInicial || null
  );
  const [destinos, setDestinos] = useState<Destino[]>([
    { id: 1, id_dependencia: null, cantidad: 0 }
  ]);
  const [observacion, setObservacion] = useState('');
  const [nextId, setNextId] = useState(2);

  const { data: dependencias = [], isLoading: isLoadingDependencias } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const crearAjusteMutation = useMutation({
    mutationFn: (data: {
      id_movimiento_origen: number;
      destinos: { id_dependencia: number; cantidad: number }[];
      observacion?: string;
    }) => movimientosService.crearAjuste(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepciones-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      toast.success('Ajuste creado exitosamente');
      navigate('/movimientos');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear ajuste');
    },
  });

  const handleElegirRecepcion = () => {
    navigate('/movimientos/seleccionar-recepcion', {
      state: { returnTo: '/movimientos/ajuste' }
    });
  };

  const handleAgregarDestino = () => {
    setDestinos([...destinos, { id: nextId, id_dependencia: null, cantidad: 0 }]);
    setNextId(nextId + 1);
  };

  const handleEliminarDestino = (id: number) => {
    if (destinos.length > 1) {
      setDestinos(destinos.filter(d => d.id !== id));
    }
  };

  const handleDestinoChange = (id: number, field: 'id_dependencia' | 'cantidad', value: number | null) => {
    setDestinos(destinos.map(d => 
      d.id === id ? { ...d, [field]: value ?? 0 } : d
    ));
  };

  const cantidadTotalDestinos = destinos.reduce((sum, d) => sum + (d.cantidad || 0), 0);
  const stockOrigen = recepcionSeleccionada?.cantidad || 0;
  const puedeGuardar = recepcionSeleccionada && 
    destinos.every(d => d.id_dependencia !== null && d.cantidad > 0) &&
    cantidadTotalDestinos > 0 &&
    cantidadTotalDestinos <= stockOrigen &&
    !destinos.some(d => d.id_dependencia === recepcionSeleccionada.id_dependencia);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recepcionSeleccionada) {
      toast.error('Debe seleccionar una recepción');
      return;
    }

    const destinosValidos = destinos
      .filter(d => d.id_dependencia !== null && d.cantidad > 0)
      .map(d => ({
        id_dependencia: d.id_dependencia as number,
        cantidad: d.cantidad
      }));

    if (destinosValidos.length === 0) {
      toast.error('Debe agregar al menos un destino con cantidad');
      return;
    }

    const cantidadTotal = destinosValidos.reduce((sum, d) => sum + d.cantidad, 0);
    if (cantidadTotal > stockOrigen) {
      toast.error('La cantidad total en destinos no puede exceder el stock en origen');
      return;
    }

    try {
      await crearAjusteMutation.mutateAsync({
        id_movimiento_origen: recepcionSeleccionada.id_movimiento,
        destinos: destinosValidos,
        observacion: observacion || undefined
      });
    } catch (error) {
      console.error('Error al crear ajuste:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/movimientos')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl">
            <ArrowRightLeft className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Ajuste
            </h1>
            <p className="text-gray-500 mt-1">
              Transferencia de productos entre dependencias
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Sección de Recepción */}
          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Truck className="h-5 w-5" />
                </div>
                Recepción de Origen
              </h3>
              
              {!recepcionSeleccionada ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Selecciona un movimiento de recepción para comenzar el ajuste
                  </p>
                  <Button
                    type="button"
                    onClick={handleElegirRecepcion}
                    className="gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  >
                    <Search className="h-5 w-5" />
                    Elegir Movimiento de Recepción
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Proveedor</p>
                        <p className="text-sm font-medium text-gray-900">
                          {recepcionSeleccionada.proveedor_nombre || 'Sin proveedor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Producto</p>
                        <p className="text-sm font-medium text-gray-900">
                          {recepcionSeleccionada.nombre_producto}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Stock Disponible</p>
                        <p className="text-sm font-bold text-green-600">
                          {recepcionSeleccionada.cantidad} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Dependencia Origen</p>
                        <p className="text-sm font-medium text-gray-900">
                          {recepcionSeleccionada.nombre_dependencia}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <Button
                      type="button"
                      onClick={handleElegirRecepcion}
                      variant="secondary"
                      className="text-sm"
                    >
                      Cambiar Recepción
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sección de Destinos */}
          {recepcionSeleccionada && (
            <Card className="border-l-4 border-l-green-500 shadow-md">
            <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  Destinos
                </h3>
                
                <div className="space-y-4">
                  {destinos.map((destino) => (
                    <div key={destino.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <SearchableSelect
                          label="Dependencia"
                          required
                          icon={<MapPin className="h-4 w-4 text-green-500" />}
                          value={destino.id_dependencia}
                          onChange={(value) => handleDestinoChange(destino.id, 'id_dependencia', value)}
                          options={dependencias}
                          isLoading={isLoadingDependencias}
                          placeholder="Buscar dependencia..."
                          getOptionLabel={(item) => item.nombre}
                          getOptionValue={(item) => item.id_dependencia}
                          idField="id_dependencia"
                        />
                      </div>
                      <div className="w-40">
                        <Label className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-gray-700">
                          <Hash className="h-4 w-4 text-orange-500" />
                          Cantidad
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max={stockOrigen}
                          value={destino.cantidad}
                          onChange={(e) => handleDestinoChange(destino.id, 'cantidad', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      {destinos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleEliminarDestino(destino.id)}
                          className="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleAgregarDestino}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Agregar Destino
                  </Button>
                </div>

                {/* Resumen */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Total a transferir: 
                        <span className="font-bold text-green-600 ml-2">
                          {cantidadTotalDestinos} unidades
                        </span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock origen: {stockOrigen} | 
                      <span className={cantidadTotalDestinos > stockOrigen ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {' '}Restante: {stockOrigen - cantidadTotalDestinos}
                      </span>
                    </div>
                  </div>
                  {cantidadTotalDestinos > stockOrigen && (
                    <p className="text-red-600 text-sm mt-2">
                      ⚠️ La cantidad total en destinos excede el stock disponible en origen
                    </p>
                  )}
                  {destinos.some(d => d.id_dependencia === recepcionSeleccionada.id_dependencia) && (
                    <p className="text-red-600 text-sm mt-2">
                      ⚠️ No puedes agregar la dependencia origen como destino
                    </p>
                  )}
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
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="w-full mt-1.5 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Describe el motivo del ajuste..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 mt-6 border-t">
            <Button
              type="submit"
              disabled={!puedeGuardar || crearAjusteMutation.isPending}
              className={`gap-2 px-8 py-6 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              <Save className="h-5 w-5" />
              {crearAjusteMutation.isPending ? 'Guardando...' : 'Guardar Ajuste'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/movimientos')}
              disabled={crearAjusteMutation.isPending}
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

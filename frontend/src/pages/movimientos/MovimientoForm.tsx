import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  movimientosService,
  productosService,
  monedaService,
  dependenciasService,
} from "../../services/api";
import type { MovimientoCreate } from "../../types/index";
import type { FacturaWithDetails } from "../../types/contrato";
import { generarCodigoMovimiento } from "../../utils/codigos";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "../../components/ui";
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
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

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
  placeholder = "Buscar...",
  disabled = false,
  required = false,
  getOptionLabel,
  getOptionValue,
  getOptionDisplay,
  idField,
  label,
  icon,
}: SearchableSelectProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const selectedItem = options.find((item) => item[idField] === value);

  // Filtrar opciones localmente según el término de búsqueda
  const filteredOptions = options.filter((item) => {
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
        width: rect.width,
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
          width: rect.width,
        });
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    onChange(getOptionValue(item), item);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSearchTerm("");
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
            {searchTerm
              ? "No se encontraron resultados"
              : "Escribe para buscar..."}
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map((item) => (
              <button
                key={item[idField]}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                  value === getOptionValue(item)
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700"
                }`}
              >
                {getOptionDisplay
                  ? getOptionDisplay(item)
                  : getOptionLabel(item)}
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
              ? "bg-slate-50 cursor-not-allowed border-gray-200"
              : "bg-white border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
          }`}
          onClick={handleInputClick}
        >
          <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={
              isOpen
                ? searchTerm
                : selectedItem
                  ? getOptionLabel(selectedItem)
                  : ""
            }
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={selectedItem ? "" : placeholder}
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
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>
      {renderDropdown()}
    </div>
  );
}

interface MovimientoRecepcionFormProps {
  tipoMovimiento: "RECEPCION" | "MERMA" | "DONACION" | "DEVOLUCION";
  onSubmit: (data: MovimientoCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function MovimientoRecepcionForm({
  tipoMovimiento,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MovimientoRecepcionFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MovimientoFormData>>({
    fecha: new Date().toISOString().split("T")[0],
    estado: "pendiente",
  });
  const [codigoGenerado, setCodigoGenerado] = useState<string>("");

  const crearMutation = useMutation({
    mutationFn: (data: MovimientoCreate) =>
      movimientosService.createMovimiento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos-pendientes"] });
      toast.success(`${tipoMovimiento} creada exitosamente`);
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        estado: "pendiente",
      });
      setCodigoGenerado("");
    },
    onError: (error: any) => {
      toast.error(
        error?.message || `Error al crear ${tipoMovimiento.toLowerCase()}`,
      );
    },
  });

  const { data: monedas = [], isLoading: isLoadingMonedas } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: dependencias = [], isLoading: isLoadingDependencias } =
    useQuery({
      queryKey: ["dependencias"],
      queryFn: () => dependenciasService.getDependencias(),
    });

  const { data: tiposMovimiento = [] } = useQuery({
    queryKey: ["tipos-movimiento"],
    queryFn: () => movimientosService.getTiposMovimiento(),
  });

  // Productos con stock (todos los movimientos)
  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ["productos-con-stock"],
    queryFn: () => productosService.getProductosConStock(),
  });

  // Producto seleccionado para acceder a id_convenio e id_anexo
  const selectedProduct = productos.find(
    (p) => Number(p.id_producto) === Number(formData.id_producto),
  );

  // Generar código automáticamente cuando se selecciona el producto
  useEffect(() => {
    if (formData.id_producto && selectedProduct) {
      const anio = new Date().getFullYear();
      const tipoMap: Record<string, "REC" | "MER" | "DON" | "DEV"> = {
        RECEPCION: "REC",
        MERMA: "MER",
        DONACION: "DON",
        DEVOLUCION: "DEV",
      };
      const idConvenio = selectedProduct.id_convenio || 0;
      const idAnexo = selectedProduct.id_anexo || 0;
      const codigo = generarCodigoMovimiento(
        tipoMap[tipoMovimiento] || "REC",
        anio,
        idConvenio,
        idAnexo,
        formData.id_producto,
      );
      setCodigoGenerado(codigo);
    } else {
      setCodigoGenerado("");
    }
  }, [formData.id_producto, tipoMovimiento, selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tipoMov = tiposMovimiento.find((t) => t.tipo === tipoMovimiento);
    if (!tipoMov) {
      toast.error("Tipo de movimiento no encontrado");
      return;
    }

    // Validaciones comunes para todos los tipos
    if (!formData.id_producto) {
      toast.error("Debe seleccionar un producto");
      return;
    }
    if (!formData.cantidad || formData.cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (!formData.id_dependencia) {
      toast.error("Debe seleccionar una dependencia");
      return;
    }
    if (
      !dependencias.some((d) => d.id_dependencia === formData.id_dependencia)
    ) {
      toast.error(
        "La dependencia seleccionada no está registrada en el sistema",
      );
      return;
    }

    // Validaciones específicas para salidas: verificar stock disponible
    if (["MERMA", "DONACION", "DEVOLUCION"].includes(tipoMovimiento)) {
      const productoStock = selectedProduct?.cantidad || 0;
      if (productoStock <= 0) {
        toast.error(
          "No hay stock disponible para este producto. Debe crear primero una recepción.",
        );
        return;
      }
      if (formData.cantidad > productoStock) {
        toast.error(
          `La cantidad no puede exceder el stock disponible (${productoStock} unidades)`,
        );
        return;
      }
    }

    // Validaciones específicas solo para RECEPCION
    if (tipoMovimiento === "RECEPCION") {
      if (!formData.precio_compra || formData.precio_compra <= 0) {
        toast.error("Debe ingresar un precio de compra válido");
        return;
      }
      if (!formData.precio_venta || formData.precio_venta <= 0) {
        toast.error("Debe ingresar un precio de venta válido");
        return;
      }
      if (!formData.moneda_compra || !formData.moneda_venta) {
        toast.error("Debe seleccionar las monedas");
        return;
      }
    }

    const movimientoData: MovimientoCreate = {
      id_tipo_movimiento: tipoMov.id_tipo_movimiento,
      id_dependencia: Number(formData.id_dependencia) || 0,
      id_producto: Number(formData.id_producto) || 0,
      cantidad: Number(formData.cantidad) || 0,
      fecha: formData.fecha || new Date().toISOString(),
      observacion: formData.observacion,
      estado: formData.estado || "pendiente",
      codigo: codigoGenerado,
      // Para RECEPCION incluir precios, para otros movimientos 0
      ...(tipoMovimiento === "RECEPCION"
        ? {
            precio_compra: formData.precio_compra,
            moneda_compra: formData.moneda_compra,
            precio_venta: formData.precio_venta,
            moneda_venta: formData.moneda_venta,
          }
        : {
            precio_compra: 0,
            moneda_compra: undefined,
            precio_venta: 0,
            moneda_venta: undefined,
          }),
    };

    console.log("Submitting movimiento:", movimientoData);
    try {
      await crearMutation.mutateAsync(movimientoData);
      onSubmit(movimientoData);
    } catch (error) {
      console.error("Error al crear movimiento:", error);
    }
  };

  const getTipoConfig = () => {
    switch (tipoMovimiento) {
      case "RECEPCION":
        return {
          icon: Truck,
          gradient: "from-green-500 to-emerald-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-700",
          shadowColor: "shadow-green-200",
          impacto: "Entrada",
          impactoIcon: TrendingUp,
          impactoColor: "text-green-600",
          descripcion: "Registro de entrada de nuevos productos al inventario",
          sectionColor: "border-l-green-500",
          priceSectionColor: "border-l-green-500",
        };
      case "MERMA":
        return {
          icon: AlertCircle,
          gradient: "from-red-500 to-rose-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-700",
          shadowColor: "shadow-red-200",
          impacto: "Salida",
          impactoIcon: TrendingDown,
          impactoColor: "text-red-600",
          descripcion: "Registro de pérdidas, deterioro o productos dañados",
          sectionColor: "border-l-red-500",
          priceSectionColor: "border-l-red-500",
        };
      case "DONACION":
        return {
          icon: Gift,
          gradient: "from-purple-500 to-violet-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          textColor: "text-purple-700",
          shadowColor: "shadow-purple-200",
          impacto: "Salida",
          impactoIcon: TrendingDown,
          impactoColor: "text-red-600",
          descripcion: "Registro de donaciones de productos",
          sectionColor: "border-l-purple-500",
          priceSectionColor: "border-l-purple-500",
        };
      case "DEVOLUCION":
        return {
          icon: RotateCcw,
          gradient: "from-orange-500 to-amber-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          textColor: "text-orange-700",
          shadowColor: "shadow-orange-200",
          impacto: "Salida",
          impactoIcon: TrendingDown,
          impactoColor: "text-red-600",
          descripcion: "Registro de devoluciones a proveedores",
          sectionColor: "border-l-orange-500",
          priceSectionColor: "border-l-orange-500",
        };
      default:
        return {
          icon: Package,
          gradient: "from-gray-500 to-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          textColor: "text-gray-700",
          shadowColor: "shadow-gray-200",
          impacto: "",
          impactoIcon: Package,
          impactoColor: "text-gray-600",
          descripcion: "",
          sectionColor: "border-l-gray-500",
          priceSectionColor: "border-l-gray-500",
        };
    }
  };

  const config = getTipoConfig();
  const Icon = config.icon;
  const ImpactoIcon = config.impactoIcon;
  const mostrarPrecios = tipoMovimiento === "RECEPCION";
  const esSalida = ["MERMA", "DONACION", "DEVOLUCION"].includes(tipoMovimiento);
  const sinStock =
    esSalida && (!selectedProduct || selectedProduct.cantidad <= 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-md bg-gradient-to-br ${config.gradient} text-white shadow-lg animate-bounce-subtle`}
          >
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {tipoMovimiento}
            </h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {config.descripcion}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onCancel} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Sección de Producto y Cantidad */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className={`h-5 w-5 ${config.textColor}`} />
                Producto y Cantidad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SearchableSelect
                    label="Producto"
                    required
                    icon={<Package className="h-4 w-4 text-blue-500" />}
                    value={Number(formData.id_producto) || null}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        id_producto: value ? Number(value) : undefined,
                      });
                    }}
                    options={productos}
                    isLoading={isLoadingProductos}
                    placeholder="Buscar producto del inventario..."
                    getOptionLabel={(item) => item.nombre}
                    getOptionValue={(item) => Number(item.id_producto)}
                    getOptionDisplay={(item) => (
                      <div className="flex justify-between items-center">
                        <span>{item.nombre}</span>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-gray-500 text-xs">
                            Disponible: {item.cantidad || 0}
                          </span>
                          {(item as any).precio_compra && (
                            <span className="text-green-600 text-xs font-medium">
                              Precio: {(item as any).precio_compra}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    idField="id_producto"
                  />
                  {sinStock && (
                    <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">
                        No hay stock disponible. Solo se permiten recepciones
                        para este producto.
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Cantidad *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.cantidad || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidad: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Cantidad"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Fecha, Dependencia y Código */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className={`h-5 w-5 ${config.textColor}`} />
                Detalles del Movimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha *</Label>
                  <Input
                    type="date"
                    required
                    className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.fecha || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Dependencia"
                    required
                    icon={<MapPin className="h-4 w-4 text-red-500" />}
                    value={formData.id_dependencia || null}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        id_dependencia: value || undefined,
                      })
                    }
                    options={dependencias}
                    isLoading={isLoadingDependencias}
                    placeholder="Buscar dependencia..."
                    getOptionLabel={(item) => item.nombre}
                    getOptionValue={(item) => item.id_dependencia}
                    idField="id_dependencia"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">
                    Código del Movimiento
                  </Label>
                  <div
                    className={`mt-1 px-4 py-3 rounded-lg border-2 flex items-center gap-2 ${
                      codigoGenerado
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 font-mono font-bold shadow-sm"
                        : "bg-slate-50 border-gray-200 text-gray-400"
                    }`}
                  >
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
            </CardContent>
          </Card>

          {/* Sección de Precios - SOLO PARA RECEPCION */}
          {mostrarPrecios && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Precios y Monedas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Precio de Compra *
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.precio_compra || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            precio_compra: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                        className="flex-1 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                      <select
                        value={formData.moneda_compra || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            moneda_compra: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={isLoadingMonedas}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                      >
                        <option value="">Moneda</option>
                        {monedas.map((moneda) => (
                          <option
                            key={moneda.id_moneda}
                            value={moneda.id_moneda}
                          >
                            {moneda.simbolo} - {moneda.denominacion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Precio de Venta *
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.precio_venta || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            precio_venta: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                        className="flex-1 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                      <select
                        value={formData.moneda_venta || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            moneda_venta: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={isLoadingMonedas}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                      >
                        <option value="">Moneda</option>
                        {monedas.map((moneda) => (
                          <option
                            key={moneda.id_moneda}
                            value={moneda.id_moneda}
                          >
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
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-gray-600" />
                Observación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <textarea
                value={formData.observacion || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observacion: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder={`Describa detalles de la ${tipoMovimiento.toLowerCase()}...`}
              />
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button
              type="submit"
              disabled={crearMutation.isPending || isSubmitting || sinStock}
              className={`gap-2 bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300`}
            >
              <Save className="h-4 w-4" />
              {crearMutation.isPending ? "Guardando..." : "Guardar Movimiento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={crearMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

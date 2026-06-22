import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  movimientosService,
  productosService,
  monedaService,
  dependenciasService,
  subcategoriasService,
} from "../../services/api";
import { useDependenciasFiltradas } from "../../hooks/useDependenciasFiltradas";
import type {
  MovimientoCreate,
  Productos,
  ProductosCreate,
  ProductoConCantidad,
} from "../../types/index";
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
  Plus,
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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

export interface PrecioExtraForm {
  precio_compra: string;
  precio_venta: string;
  id_moneda: number;
}

interface MovimientoRecepcionFormProps {
  tipoMovimiento: "RECEPCION" | "MERMA" | "DONACION" | "DEVOLUCION";
  onSubmit: (data: MovimientoCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  onPreciosChange?: (precios: PrecioExtraForm[]) => void;
}

export function MovimientoRecepcionForm({
  tipoMovimiento,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onPreciosChange,
}: MovimientoRecepcionFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MovimientoFormData>>({
    fecha: new Date().toISOString().split("T")[0],
    estado: "pendiente",
  });
  const [codigoGenerado, setCodigoGenerado] = useState<string>("");
  const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [showDropdownProducto, setShowDropdownProducto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Productos | null>(null);
  const [selectedItemAnexo, setSelectedItemAnexo] =
    useState<ProductoConCantidad | null>(null);
  const dropdownProductoRef = useRef<HTMLDivElement>(null);

  // Estado para precios adicionales (precio_item_anexo)
  const [showPreciosModal, setShowPreciosModal] = useState(false);
  const [preciosExtra, setPreciosExtra] = useState<
    { precio_compra: string; precio_venta: string; id_moneda: number }[]
  >([]);
  const [currentPrecioForm, setCurrentPrecioForm] = useState({
    precio_compra: "",
    precio_venta: "",
    id_moneda: 0,
  });
  const [editingPrecioIndex, setEditingPrecioIndex] = useState<number | null>(
    null,
  );

  // Elevar precios extra al padre
  useEffect(() => {
    onPreciosChange?.(preciosExtra);
  }, [preciosExtra, onPreciosChange]);

  // Cerrar dropdown de producto al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownProductoRef.current &&
        !dropdownProductoRef.current.contains(event.target as Node)
      ) {
        setShowDropdownProducto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Estado para el modal de nuevo producto
  const [nuevoProducto, setNuevoProducto] = useState<Partial<ProductosCreate>>({
    nombre: "",
    codigo: "",
    descripcion: "",
    id_subcategoria: 1,
    precio_compra: 0,
    moneda_compra: 1,
    precio_venta: 0,
    moneda_venta: 1,
    precio_minimo: 0,
  });

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

  const createProductoMutation = useMutation({
    mutationFn: (data: ProductosCreate) =>
      productosService.createProducto(data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      toast.success("Producto creado exitosamente");
      setShowNuevoProductoModal(false);
      setProductoSeleccionado(newProduct);
      setFormData((prev) => ({ ...prev, id_producto: newProduct.id_producto }));
      setBusquedaProducto("");
      setNuevoProducto({
        nombre: "",
        codigo: "",
        descripcion: "",
        id_subcategoria: 1,
        precio_compra: 0,
        moneda_compra: 1,
        precio_venta: 0,
        moneda_venta: 1,
        precio_minimo: 0,
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al crear producto");
    },
  });

  const { data: monedas = [], isLoading: isLoadingMonedas } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: dependencias = [], isLoading: isLoadingDependencias } =
    useDependenciasFiltradas();

  const { data: tiposMovimiento = [] } = useQuery({
    queryKey: ["tipos-movimiento"],
    queryFn: () => movimientosService.getTiposMovimiento(),
  });

  // RECEPCION: todos los productos de la tabla
  const { data: todosProductos = [], isLoading: isLoadingTodosProductos } =
    useQuery({
      queryKey: ["productos"],
      queryFn: () => productosService.getProductos(0, 500),
      enabled: tipoMovimiento === "RECEPCION",
    });

  // Salidas: solo productos con stock desde item_anexo
  const { data: productosConStock = [], isLoading: isLoadingProductosStock } =
    useQuery({
      queryKey: ["productos-con-stock-item-anexo"],
      queryFn: () => productosService.getProductosConStockItemAnexo(),
      enabled: tipoMovimiento !== "RECEPCION",
    });

  const { data: subcategorias = [] } = useQuery({
    queryKey: ["subcategorias"],
    queryFn: () => subcategoriasService.getSubcategorias(),
  });

  // Producto seleccionado según el tipo de movimiento
  const selectedProduct =
    tipoMovimiento === "RECEPCION"
      ? todosProductos.find(
          (p) => Number(p.id_producto) === Number(formData.id_producto),
        )
      : selectedItemAnexo;

  // Auto-completar precios y monedas para RECEPCION
  useEffect(() => {
    if (tipoMovimiento === "RECEPCION" && productoSeleccionado) {
      setFormData((prev) => ({
        ...prev,
        precio_compra: productoSeleccionado.precio_compra
          ? Number(productoSeleccionado.precio_compra)
          : undefined,
        moneda_compra: productoSeleccionado.moneda_compra || undefined,
        precio_venta: productoSeleccionado.precio_venta
          ? Number(productoSeleccionado.precio_venta)
          : undefined,
      }));
    }
  }, [productoSeleccionado, tipoMovimiento]);

  // Auto-completar para DONACION/MERMA/DEVOLUCION desde item_anexo
  useEffect(() => {
    if (tipoMovimiento !== "RECEPCION" && selectedItemAnexo) {
      setFormData((prev) => ({
        ...prev,
        id_producto: selectedItemAnexo.id_producto,
        precio_compra: selectedItemAnexo.precio_compra
          ? Number(selectedItemAnexo.precio_compra)
          : undefined,
        moneda_compra: selectedItemAnexo.id_moneda || undefined,
        precio_venta: selectedItemAnexo.precio_venta
          ? Number(selectedItemAnexo.precio_venta)
          : undefined,
      }));
    }
  }, [selectedItemAnexo, tipoMovimiento]);

  // Generar código automáticamente cuando se selecciona el producto
  useEffect(() => {
    if (formData.id_producto && selectedProduct) {
      const anio = new Date().getFullYear();
      const idConvenio = (selectedProduct as any)?.id_convenio || 0;
      const idAnexo = (selectedProduct as any)?.id_anexo || 0;
      const codigo = generarCodigoMovimiento(
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
      if (!formData.moneda_compra) {
        toast.error("Debe seleccionar una moneda");
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
      id_convenio: (selectedProduct as any)?.id_convenio,
      id_anexo: (selectedProduct as any)?.id_anexo,
      // Para RECEPCION incluir precios, para otros movimientos 0
      ...(tipoMovimiento === "RECEPCION"
        ? {
            precio_compra: formData.precio_compra,
            moneda_compra: formData.moneda_compra,
            precio_venta: formData.precio_venta,
            moneda_venta: formData.moneda_compra,
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
  const sinStock = esSalida && !!selectedProduct && (selectedProduct as any).cantidad <= 0;

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
              {tipoMovimiento === "RECEPCION" ? (
                <div>
                  <div className="grid grid-cols-[4fr_1fr_4fr] gap-4 items-start">
                    <div ref={dropdownProductoRef} className="relative">
                      <Label className="text-sm font-semibold mb-1.5 text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        Producto *
                      </Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={
                            productoSeleccionado
                              ? productoSeleccionado.nombre
                              : busquedaProducto
                          }
                          disabled={!!productoSeleccionado}
                          onChange={(e) => {
                            setBusquedaProducto(e.target.value);
                            setShowDropdownProducto(true);
                            setProductoSeleccionado(null);
                            setFormData((prev) => ({
                              ...prev,
                              id_producto: undefined,
                            }));
                          }}
                          onFocus={() => setShowDropdownProducto(true)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                        />
                        {productoSeleccionado && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductoSeleccionado(null);
                              setBusquedaProducto("");
                              setFormData((prev) => ({
                                ...prev,
                                id_producto: undefined,
                                precio_compra: undefined,
                                moneda_compra: undefined,
                                precio_venta: undefined,
                              }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {showDropdownProducto && !productoSeleccionado && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {isLoadingTodosProductos ? (
                            <div className="p-4 text-center text-gray-500">
                              Cargando...
                            </div>
                          ) : todosProductos.filter((p) =>
                              p.nombre
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()),
                            ).length > 0 ? (
                            todosProductos
                              .filter((p) =>
                                p.nombre
                                  .toLowerCase()
                                  .includes(busquedaProducto.toLowerCase()),
                              )
                              .map((p) => (
                                <button
                                  key={p.id_producto}
                                  type="button"
                                  onClick={() => {
                                    setProductoSeleccionado(p);
                                    setShowDropdownProducto(false);
                                    setBusquedaProducto("");
                                    setFormData((prev) => ({
                                      ...prev,
                                      id_producto: p.id_producto,
                                    }));
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-900">
                                      {p.nombre}
                                    </span>
                                    <span className="text-green-600 text-xs font-medium">
                                      {p.precio_compra
                                        ? `Compra: $${Number(p.precio_compra).toFixed(2)}`
                                        : ""}
                                    </span>
                                  </div>
                                  {p.descripcion && (
                                    <span className="text-xs text-gray-400">
                                      {p.descripcion}
                                    </span>
                                  )}
                                </button>
                              ))
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {busquedaProducto
                                ? "No se encontraron resultados"
                                : "Escribe para buscar..."}
                            </div>
                          )}
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
                        placeholder="0"
                      />
                    </div>
                    <div className="pt-7">
                      <button
                        type="button"
                        onClick={() => setShowNuevoProductoModal(true)}
                        className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                        Nuevo Producto
                      </button>
                    </div>
                  </div>
                  {/* Precios para RECEPCION dentro del mismo card */}
                  {mostrarPrecios && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      {/* Tabla Precios Base */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="h-4 w-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">
                            Precios Base
                          </span>
                        </div>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                  Moneda
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                  Precio Compra
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                  Precio Venta
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-green-50/50 transition-colors">
                                <td className="px-4 py-2.5">
                                  <select
                                    value={formData.moneda_compra || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        moneda_compra:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={isLoadingMonedas}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
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
                                </td>
                                <td className="px-4 py-2.5">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={formData.precio_compra || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        precio_compra:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="0.00"
                                    className="w-full focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                  />
                                </td>
                                <td className="px-4 py-2.5">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={formData.precio_venta || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        precio_venta:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="0.00"
                                    className="w-full focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {/* Precios Adicionales */}
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              Precios Adicionales
                            </span>
                            {preciosExtra.length > 0 && (
                              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                                {preciosExtra.length}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPrecioForm({
                                precio_compra: "",
                                precio_venta: "",
                                id_moneda: 0,
                              });
                              setEditingPrecioIndex(null);
                              setShowPreciosModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </button>
                        </div>
                        {preciosExtra.length === 0 && (
                          <p className="text-xs text-gray-400 mt-2 ml-6">
                            Sin precios adicionales
                          </p>
                        )}
                        {preciosExtra.length > 0 && (
                          <div className="mt-4">
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                      Moneda
                                    </th>
                                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                      Precio Compra
                                    </th>
                                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                      Precio Venta
                                    </th>
                                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider w-20">
                                      Acción
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {preciosExtra.map((p, i) => {
                                    const moneda = monedas.find(
                                      (m) => m.id_moneda === p.id_moneda,
                                    );
                                    return (
                                      <tr
                                        key={i}
                                        className="hover:bg-green-50/50 transition-colors group"
                                      >
                                        <td className="px-4 py-2.5">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                            {moneda?.simbolo || "?"}
                                          </span>
                                          <span className="ml-2 text-gray-500 text-xs">
                                            {moneda?.denominacion || ""}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                                          {p.precio_compra
                                            ? Number(p.precio_compra).toFixed(2)
                                            : "-"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-medium text-green-700">
                                          {Number(p.precio_venta).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCurrentPrecioForm(p);
                                                setEditingPrecioIndex(i);
                                                setShowPreciosModal(true);
                                              }}
                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                              title="Editar"
                                            >
                                              <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                              </svg>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPreciosExtra((prev) =>
                                                  prev.filter(
                                                    (_, j) => j !== i,
                                                  ),
                                                )
                                              }
                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                              title="Eliminar"
                                            >
                                              <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-400 text-right">
                              {preciosExtra.length}{" "}
                              {preciosExtra.length === 1
                                ? "precio adicional"
                                : "precios adicionales"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-[4fr_1fr_4fr] gap-4 items-start">
                    <div ref={dropdownProductoRef} className="relative">
                      <Label className="text-sm font-semibold mb-1.5 text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        Producto *
                      </Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar producto del inventario..."
                          value={
                            selectedItemAnexo
                              ? selectedItemAnexo.nombre
                              : busquedaProducto
                          }
                          disabled={!!selectedItemAnexo}
                          onChange={(e) => {
                            setBusquedaProducto(e.target.value);
                            setShowDropdownProducto(true);
                            setSelectedItemAnexo(null);
                            setFormData((prev) => ({
                              ...prev,
                              id_producto: undefined,
                              precio_compra: undefined,
                              moneda_compra: undefined,
                              precio_venta: undefined,
                            }));
                          }}
                          onFocus={() => setShowDropdownProducto(true)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                        />
                        {selectedItemAnexo && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemAnexo(null);
                              setBusquedaProducto("");
                              setFormData((prev) => ({
                                ...prev,
                                id_producto: undefined,
                                precio_compra: undefined,
                                moneda_compra: undefined,
                                precio_venta: undefined,
                              }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {showDropdownProducto && !selectedItemAnexo && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {isLoadingProductosStock ? (
                            <div className="p-4 text-center text-gray-500">
                              Cargando...
                            </div>
                          ) : productosConStock.filter((p) =>
                              p.nombre
                                .toLowerCase()
                                .includes(busquedaProducto.toLowerCase()),
                            ).length > 0 ? (
                            productosConStock
                              .filter((p) =>
                                p.nombre
                                  .toLowerCase()
                                  .includes(busquedaProducto.toLowerCase()),
                              )
                              .map((p, idx) => (
                                <button
                                  key={`${p.id_item_anexo}-${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemAnexo(p);
                                    setShowDropdownProducto(false);
                                    setBusquedaProducto("");
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-900">
                                      {p.nombre}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-gray-500 text-xs">
                                        Stock: {p.cantidad}
                                      </span>
                                      {p.precio_compra && (
                                        <span className="text-green-600 text-xs font-medium">
                                          Compra: $
                                          {Number(p.precio_compra).toFixed(2)}
                                        </span>
                                      )}
                                      {p.precio_venta && (
                                        <span className="text-blue-600 text-xs font-medium">
                                          Venta: $
                                          {Number(p.precio_venta).toFixed(2)}
                                        </span>
                                      )}
                                      <span className="text-gray-400 text-xs">
                                        {p.moneda_simbolo || ""}
                                      </span>
                                    </div>
                                  </div>
                                  {p.descripcion && (
                                    <span className="text-xs text-gray-400">
                                      {p.descripcion}
                                    </span>
                                  )}
                                </button>
                              ))
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {busquedaProducto
                                ? "No se encontraron resultados"
                                : "Escribe para buscar..."}
                            </div>
                          )}
                        </div>
                      )}
                      {sinStock && (
                        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">
                            No hay stock disponible. Solo se permiten
                            recepciones para este producto.
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cantidad *</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedItemAnexo?.cantidad || undefined}
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
                    <div />
                  </div>
                  {/* Precios del item_anexo seleccionado (solo lectura) */}
                  {selectedItemAnexo && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          Precios del Producto
                        </span>
                      </div>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Moneda
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Precio Compra
                              </th>
                              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Precio Venta
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-gray-50/30">
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                  {selectedItemAnexo.moneda_simbolo || "?"}
                                </span>
                                <span className="ml-2 text-gray-500 text-xs">
                                  {selectedItemAnexo.moneda_nombre || ""}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-medium text-gray-700">
                                {selectedItemAnexo.precio_compra
                                  ? `$${Number(selectedItemAnexo.precio_compra).toFixed(2)}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-green-700">
                                $
                                {Number(selectedItemAnexo.precio_venta).toFixed(
                                  2,
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sección de Fecha y Código */}
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
                  <Label className="text-sm font-medium">Observación</Label>
                  <textarea
                    value={formData.observacion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, observacion: e.target.value })
                    }
                    rows={2}
                    className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder={`Describa detalles de la ${tipoMovimiento.toLowerCase()}...`}
                  />
                </div>
              </div>
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

      {/* Modal Nuevo Producto */}
      {showNuevoProductoModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  Nuevo Producto
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNuevoProductoModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nombre *</Label>
                  <Input
                    required
                    className="mt-1"
                    value={nuevoProducto.nombre}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Nombre del producto"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Código</Label>
                  <Input
                    className="mt-1"
                    value={nuevoProducto.codigo}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        codigo: e.target.value,
                      })
                    }
                    placeholder="Código del producto"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Subcategoría *</Label>
                  <select
                    value={nuevoProducto.id_subcategoria}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        id_subcategoria: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    {subcategorias.map((sc) => (
                      <option
                        key={sc.id_subcategoria}
                        value={sc.id_subcategoria}
                      >
                        {sc.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Descripción</Label>
                  <textarea
                    value={nuevoProducto.descripcion}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        descripcion: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="Descripción del producto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Precio Compra *
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={nuevoProducto.precio_compra}
                        onChange={(e) =>
                          setNuevoProducto({
                            ...nuevoProducto,
                            precio_compra: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="flex-1"
                        placeholder="0.00"
                      />
                      <select
                        value={nuevoProducto.moneda_compra}
                        onChange={(e) =>
                          setNuevoProducto({
                            ...nuevoProducto,
                            moneda_compra: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                      >
                        {monedas.map((m) => (
                          <option key={m.id_moneda} value={m.id_moneda}>
                            {m.simbolo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Precio Venta *
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={nuevoProducto.precio_venta}
                        onChange={(e) =>
                          setNuevoProducto({
                            ...nuevoProducto,
                            precio_venta: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="flex-1"
                        placeholder="0.00"
                      />
                      <select
                        value={nuevoProducto.moneda_venta}
                        onChange={(e) =>
                          setNuevoProducto({
                            ...nuevoProducto,
                            moneda_venta: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                      >
                        {monedas.map((m) => (
                          <option key={m.id_moneda} value={m.id_moneda}>
                            {m.simbolo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Precio Mínimo *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="mt-1"
                    value={nuevoProducto.precio_minimo}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        precio_minimo: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNuevoProductoModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={
                    createProductoMutation.isPending || !nuevoProducto.nombre
                  }
                  onClick={() => {
                    if (!nuevoProducto.nombre) {
                      toast.error("El nombre del producto es obligatorio");
                      return;
                    }
                    createProductoMutation.mutate(
                      nuevoProducto as ProductosCreate,
                    );
                  }}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                >
                  <Save className="h-4 w-4" />
                  {createProductoMutation.isPending
                    ? "Guardando..."
                    : "Guardar"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Precios Adicionales */}
      {showPreciosModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingPrecioIndex !== null ? "Editar" : "Agregar"} Precio
                  Adicional
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPreciosModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Moneda *</Label>
                  <select
                    value={currentPrecioForm.id_moneda}
                    onChange={(e) =>
                      setCurrentPrecioForm({
                        ...currentPrecioForm,
                        id_moneda: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    <option value={0}>Seleccionar moneda</option>
                    {monedas.map((m) => (
                      <option key={m.id_moneda} value={m.id_moneda}>
                        {m.simbolo} - {m.denominacion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Precio de Compra
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1"
                    value={currentPrecioForm.precio_compra}
                    onChange={(e) =>
                      setCurrentPrecioForm({
                        ...currentPrecioForm,
                        precio_compra: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Precio de Venta *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="mt-1"
                    value={currentPrecioForm.precio_venta}
                    onChange={(e) =>
                      setCurrentPrecioForm({
                        ...currentPrecioForm,
                        precio_venta: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreciosModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={
                    !currentPrecioForm.id_moneda ||
                    !currentPrecioForm.precio_venta
                  }
                  onClick={() => {
                    if (
                      !currentPrecioForm.id_moneda ||
                      !currentPrecioForm.precio_venta
                    ) {
                      toast.error("Moneda y precio de venta son obligatorios");
                      return;
                    }
                    if (editingPrecioIndex !== null) {
                      setPreciosExtra((prev) =>
                        prev.map((p, i) =>
                          i === editingPrecioIndex ? currentPrecioForm : p,
                        ),
                      );
                    } else {
                      setPreciosExtra((prev) => [...prev, currentPrecioForm]);
                    }
                    setShowPreciosModal(false);
                    setEditingPrecioIndex(null);
                  }}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                >
                  <Save className="h-4 w-4" />
                  {editingPrecioIndex !== null ? "Actualizar" : "Agregar"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

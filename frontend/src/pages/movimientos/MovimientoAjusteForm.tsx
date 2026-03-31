import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  movimientosService,
  productosService,
  dependenciasService,
} from "../../services/api";
import { authService } from "../../services/auth";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "../../components/ui";
import { generarCodigoMovimiento } from "../../utils/codigos";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Package,
  MapPin,
  ClipboardList,
  Search,
  ChevronDown,
  X,
  CheckCircle2,
  ArrowRightLeft,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ProductoConCantidad } from "../../types/index";

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

  const selectedItem = options.find((item) => item[idField] === value);

  const filteredOptions = options.filter((item) => {
    const labelText = getOptionLabel(item).toLowerCase();
    return labelText.includes(searchTerm.toLowerCase());
  });

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

  const renderDropdown = () => {
    if (!isOpen || disabled || !dropdownPosition) return null;
    return createPortal(
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
      </div>,
      document.body,
    );
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
          onClick={() => !disabled && setIsOpen(true)}
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
            className={`h-4 w-4 text-gray-400 mr-3 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {renderDropdown()}
    </div>
  );
}

export function MovimientoAjusteForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const usuario = authService.getUser();
  const dependenciaUsuario = usuario?.dependencia;

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoConCantidad | null>(null);
  const [dependenciaOrigen, setDependenciaOrigen] = useState<{
    id: number;
    nombre: string;
  } | null>(
    dependenciaUsuario
      ? {
          id: dependenciaUsuario.id_dependencia,
          nombre: dependenciaUsuario.nombre,
        }
      : null,
  );
  const [stockOrigen, setStockOrigen] = useState(0);
  const [destinos, setDestinos] = useState<Destino[]>([
    { id: 1, id_dependencia: null, cantidad: 0 },
  ]);
  const [observacion, setObservacion] = useState("");
  const [nextId, setNextId] = useState(2);
  const [codigoGenerado, setCodigoGenerado] = useState("");

  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ["productos-por-dependencia", dependenciaUsuario?.id_dependencia],
    queryFn: () =>
      movimientosService.getProductosPorDependencia(
        dependenciaUsuario!.id_dependencia,
      ),
    enabled: !!dependenciaUsuario?.id_dependencia,
  });

  const { data: dependencias = [], isLoading: isLoadingDependencias } =
    useQuery({
      queryKey: ["dependencias"],
      queryFn: () => dependenciasService.getDependencias(),
    });

  const crearAjusteMutation = useMutation({
    mutationFn: (data: {
      id_producto?: number;
      id_dependencia_origen?: number;
      destinos: { id_dependencia: number; cantidad: number }[];
      observacion?: string;
      codigo?: string;
    }) => movimientosService.crearAjuste(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos-con-stock"] });
      queryClient.invalidateQueries({
        queryKey: ["productos-por-dependencia"],
      });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["movimientos-pendientes"] });
      toast.success("Ajuste creado exitosamente");
      navigate("/movimientos");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al crear ajuste");
    },
  });

  useEffect(() => {
    if (productoSeleccionado) {
      setStockOrigen(productoSeleccionado.cantidad || 0);
    } else {
      setStockOrigen(0);
    }
  }, [productoSeleccionado]);

  useEffect(() => {
    if (productoSeleccionado && dependenciaOrigen) {
      const anio = new Date().getFullYear();
      const idConvenio = productoSeleccionado.id_convenio || 0;
      const idAnexo = productoSeleccionado.id_anexo || 0;
      const codigo = generarCodigoMovimiento(
        "AJU",
        anio,
        idConvenio,
        idAnexo,
        productoSeleccionado.id_producto,
      );
      setCodigoGenerado(codigo);
    } else {
      setCodigoGenerado("");
    }
  }, [productoSeleccionado, dependenciaOrigen]);

  const handleAgregarDestino = () => {
    setDestinos([
      ...destinos,
      { id: nextId, id_dependencia: null, cantidad: 0 },
    ]);
    setNextId(nextId + 1);
  };

  const handleEliminarDestino = (id: number) => {
    if (destinos.length > 1) setDestinos(destinos.filter((d) => d.id !== id));
  };

  const handleDestinoChange = (
    id: number,
    field: "id_dependencia" | "cantidad",
    value: number | null,
  ) => {
    setDestinos(
      destinos.map((d) => (d.id === id ? { ...d, [field]: value ?? 0 } : d)),
    );
  };

  const cantidadTotalDestinos = destinos.reduce(
    (sum, d) => sum + (d.cantidad || 0),
    0,
  );

  const puedeGuardar =
    productoSeleccionado &&
    dependenciaOrigen &&
    stockOrigen > 0 &&
    destinos.every((d) => d.id_dependencia !== null && d.cantidad > 0) &&
    cantidadTotalDestinos > 0 &&
    cantidadTotalDestinos <= stockOrigen &&
    !destinos.some((d) => d.id_dependencia === dependenciaOrigen.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productoSeleccionado || !dependenciaOrigen) {
      toast.error("Debe seleccionar un producto y dependencia de origen");
      return;
    }

    const destinosValidos = destinos
      .filter((d) => d.id_dependencia !== null && d.cantidad > 0)
      .map((d) => ({
        id_dependencia: d.id_dependencia as number,
        cantidad: d.cantidad,
      }));

    if (destinosValidos.length === 0) {
      toast.error("Debe agregar al menos un destino con cantidad");
      return;
    }

    const cantidadTotal = destinosValidos.reduce(
      (sum, d) => sum + d.cantidad,
      0,
    );
    if (cantidadTotal > stockOrigen) {
      toast.error(
        "La cantidad total en destinos no puede exceder el stock en origen",
      );
      return;
    }

    try {
      await crearAjusteMutation.mutateAsync({
        id_producto: productoSeleccionado.id_producto,
        id_dependencia_origen: dependenciaOrigen.id,
        destinos: destinosValidos,
        observacion: observacion || undefined,
        codigo: codigoGenerado,
      });
    } catch (error) {
      console.error("Error al crear ajuste:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg animate-bounce-subtle">
            <ArrowRightLeft className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ajuste</h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Transferencia de productos entre dependencias
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/movimientos")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Producto */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchableSelect
                  label="Seleccionar Producto"
                  required
                  icon={<Package className="h-4 w-4 text-blue-500" />}
                  value={
                    productoSeleccionado
                      ? Number(productoSeleccionado.id_producto)
                      : null
                  }
                  onChange={(value, item) =>
                    setProductoSeleccionado(item as ProductoConCantidad | null)
                  }
                  options={productos}
                  isLoading={isLoadingProductos}
                  placeholder="Buscar producto del inventario..."
                  getOptionLabel={(item) => item.nombre}
                  getOptionValue={(item) => Number(item.id_producto)}
                  getOptionDisplay={(item) => (
                    <div className="flex justify-between items-center">
                      <span>{item.nombre}</span>
                      <span className="text-gray-500 text-xs">
                        Stock: {item.cantidad}
                      </span>
                    </div>
                  )}
                  idField="id_producto"
                />
                <div>
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

          {/* Dependencia de Origen y Stock */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
                Dependencia de Origen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchableSelect
                  label="Seleccionar Dependencia"
                  required
                  icon={<MapPin className="h-4 w-4 text-blue-500" />}
                  value={dependenciaOrigen?.id || null}
                  onChange={(value, item) =>
                    setDependenciaOrigen(
                      item
                        ? { id: item.id_dependencia, nombre: item.nombre }
                        : null,
                    )
                  }
                  options={dependencias}
                  isLoading={isLoadingDependencias}
                  placeholder="Buscar dependencia..."
                  getOptionLabel={(item) => item.nombre}
                  getOptionValue={(item) => item.id_dependencia}
                  idField="id_dependencia"
                />
                <div>
                  <Label className="text-sm font-medium">
                    Stock Disponible
                  </Label>
                  <div className="flex items-center h-[46px] mt-1 px-4 border border-gray-200 rounded-lg bg-gray-50">
                    <span
                      className={`text-lg font-bold ${stockOrigen > 0 ? "text-green-600" : "text-gray-400"}`}
                    >
                      {stockOrigen} unidades
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinos */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowRight className="h-5 w-5 text-green-600" />
                Destinos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {destinos.map((destino) => (
                  <div
                    key={destino.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <SearchableSelect
                        label="Dependencia"
                        required
                        icon={<MapPin className="h-4 w-4 text-green-500" />}
                        value={destino.id_dependencia}
                        onChange={(value) =>
                          handleDestinoChange(
                            destino.id,
                            "id_dependencia",
                            value,
                          )
                        }
                        options={dependencias.filter(
                          (d) =>
                            !dependenciaOrigen ||
                            d.id_dependencia !== dependenciaOrigen.id,
                        )}
                        isLoading={isLoadingDependencias}
                        placeholder="Buscar dependencia..."
                        getOptionLabel={(item) => item.nombre}
                        getOptionValue={(item) => item.id_dependencia}
                        idField="id_dependencia"
                      />
                    </div>
                    <div className="w-40">
                      <Label className="text-sm font-medium">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        max={stockOrigen}
                        value={destino.cantidad || ""}
                        onChange={(e) =>
                          handleDestinoChange(
                            destino.id,
                            "cantidad",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                        className="mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    {destinos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleEliminarDestino(destino.id)}
                        className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                    <span
                      className={
                        cantidadTotalDestinos > stockOrigen
                          ? "text-red-600 font-bold"
                          : "text-green-600"
                      }
                    >
                      {" "}
                      Restante: {stockOrigen - cantidadTotalDestinos}
                    </span>
                  </div>
                </div>
                {cantidadTotalDestinos > stockOrigen && (
                  <p className="text-red-600 text-sm mt-2">
                    La cantidad total en destinos excede el stock disponible en
                    origen
                  </p>
                )}
                {dependenciaOrigen &&
                  destinos.some(
                    (d) => d.id_dependencia === dependenciaOrigen.id,
                  ) && (
                    <p className="text-red-600 text-sm mt-2">
                      No puedes agregar la dependencia origen como destino
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

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
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Describe el motivo del ajuste..."
              />
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button
              type="submit"
              disabled={!puedeGuardar || crearAjusteMutation.isPending}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Save className="h-4 w-4" />
              {crearAjusteMutation.isPending
                ? "Guardando..."
                : "Guardar Ajuste"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/movimientos")}
              disabled={crearAjusteMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

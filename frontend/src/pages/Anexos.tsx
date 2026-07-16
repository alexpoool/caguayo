import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteList } from "../hooks/useInfiniteList";
import { useAuth } from "../context/AuthContext";
import {
  anexosService,
  conveniosService,
  productosService,
  monedaService,
  subcategoriasService,
} from "../services/api";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  ArrowLeft,
  Package,
  X,
  Loader2,
  DollarSign,
  ChevronDown,
  Sparkles,
  HeartHandshake,
  Hash,
  Percent,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  codigo_anexo?: string;
  id_dependencia?: number | null;
  comision?: number;
  dependencia_nombre?: string;
  id_producto?: number | null;
  convenios?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo?: string;
  };
  items_anexo?: {
    id_item_anexo: number;
    id_producto: number;
    entrada: number;
    precio_compra: number;
    precio_venta: number;
    id_moneda: number;
    codigo?: string;
    producto?: { id_producto: number; nombre: string; codigo?: string };
    precios?: { id_moneda: number; precio_venta: number; precio_compra?: number }[];
  }[];
}

interface AnexoProducto {
  id_producto: number;
  entrada: number;
  precio_compra: number;
  precio_venta: number;
  id_moneda: number;
  nombre_producto?: string;
  precios?: { id_moneda: number; precio_venta: number; precio_compra?: number }[];
}

interface PrecioExtraForm {
  precio_compra: string;
  precio_venta: string;
  id_moneda: number;
}

import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
} from "../components/ui";

export function AnexosPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingAnexo, setEditingAnexo] = useState<Anexo | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
  });
  const [anexoDetailModal, setAnexoDetailModal] = useState<{
    isOpen: boolean;
    anexo: Anexo | null;
  }>({ isOpen: false, anexo: null });

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    id_convenio: 0,
    nombre_anexo: "",
    fecha: today,
    comision: 17,
    productos: [] as AnexoProducto[],
  });
  // ── Estado temporal para agregar producto ───────────────────────────────────
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [showDropdownProducto, setShowDropdownProducto] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [precioCompra, setPrecioCompra] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [monedaCompra, setMonedaCompra] = useState(0);
  const [preciosExtra, setPreciosExtra] = useState<PrecioExtraForm[]>([]);
  const dropdownProductoRef = useRef<HTMLDivElement>(null);

  // ── Estado para modales ─────────────────────────────────────────────────────
  const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);
  const [showPreciosModal, setShowPreciosModal] = useState(false);
  const [editingPrecioIndex, setEditingPrecioIndex] = useState<number | null>(null);
  const [currentPrecioForm, setCurrentPrecioForm] = useState<PrecioExtraForm>({
    id_moneda: 0, precio_compra: "", precio_venta: "",
  });
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "", codigo: "", descripcion: "", id_subcategoria: 1,
    precio_compra: 0, moneda_compra: 1, precio_venta: 0, moneda_venta: 1, precio_minimo: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [convenioSearch, setConvenioSearch] = useState("");
  const [convenioDropdownOpen, setConvenioDropdownOpen] = useState(false);
  const convenioRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const initialConvenio = searchParams.get("convenio");
  const [filtroConvenio] = useState<number | null>(
    initialConvenio ? Number(initialConvenio) : null,
  );

  // ── Lista infinita de anexos ───────────────────────────────────────────────
  const {
    items: anexos,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<Anexo>({
    queryKeyBase: "anexos",
    queryFn: (skip, limit, search) =>
      anexosService.getAnexos(filtroConvenio ?? undefined, search || undefined, skip, limit),
    limit: 100,
    extraQueryKeyParams: [filtroConvenio],
  });

  // ── Scroll infinito ────────────────────────────────────────────────────────
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (convenioRef.current && !convenioRef.current.contains(e.target as Node)) {
        setConvenioDropdownOpen(false);
      }
      if (dropdownProductoRef.current && !dropdownProductoRef.current.contains(e.target as Node)) {
        setShowDropdownProducto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: () => conveniosService.getConvenios(),
  });

  const { user } = useAuth();

  const { data: productos = [] } = useQuery({
    queryKey: ["productos"],
    queryFn: () => productosService.getProductos(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: subcategorias = [] } = useQuery({
    queryKey: ["subcategorias"],
    queryFn: () => subcategoriasService.getSubcategorias(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Anexo>) => anexosService.createAnexo(data),
    onSuccess: () => {
      refresh();
      toast.success("Anexo creado");
      setView("list");
      resetForm();
    },
    onError: () => toast.error("Error al crear anexo"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Anexo> }) =>
      anexosService.updateAnexo(id, data),
    onSuccess: () => {
      refresh();
      toast.success("Anexo actualizado");
      setView("list");
      resetForm();
    },
    onError: () => toast.error("Error al actualizar anexo"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => anexosService.deleteAnexo(id),
    onSuccess: () => {
      refresh();
      toast.success("Anexo eliminado");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error("Error al eliminar anexo"),
  });

  const resetTempProduct = () => {
    setProductoSeleccionado(null);
    setBusquedaProducto("");
    setCantidad(1);
    setPrecioCompra(0);
    setPrecioVenta(0);
    setMonedaCompra(0);
    setPreciosExtra([]);
  };

  const resetForm = () => {
    setFormData({
      id_convenio: 0,
      nombre_anexo: "",
      fecha: today,
      comision: 17,
      productos: [],
    });
    resetTempProduct();
    setFormErrors({});
    setEditingAnexo(null);
  };

  const addProductToList = () => {
    if (!productoSeleccionado) {
      toast.error("Seleccione un producto");
      return;
    }
    if (!cantidad || cantidad < 1) {
      toast.error("Ingrese una cantidad válida");
      return;
    }
    if (!monedaCompra) {
      toast.error("Seleccione una moneda");
      return;
    }
    setFormData({
      ...formData,
      productos: [
        ...formData.productos,
        {
          id_producto: productoSeleccionado.id_producto,
          entrada: cantidad,
          precio_compra: Number(precioCompra) || 0,
          precio_venta: Number(precioVenta) || 0,
          id_moneda: monedaCompra,
          nombre_producto: productoSeleccionado.nombre,
          precios: preciosExtra.length > 0
            ? preciosExtra.map((p) => ({
                id_moneda: p.id_moneda,
                precio_venta: parseFloat(p.precio_venta) || 0,
                precio_compra: parseFloat(p.precio_compra) || 0,
              }))
            : undefined,
        },
      ],
    });
    resetTempProduct();
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      productos: formData.productos.filter((_, i) => i !== index),
    });
  };

  const handleNew = () => {
    resetForm();
    setView("form");
  };

  const handleEdit = (anexo: Anexo) => {
    setEditingAnexo(anexo);
    setFormData({
      id_convenio: anexo.id_convenio,
      nombre_anexo: anexo.nombre_anexo,
      fecha: anexo.fecha,
      comision: anexo.comision || 0,
      productos: (anexo.items_anexo || []).map((item) => ({
        id_producto: item.id_producto,
        entrada: item.entrada,
        precio_compra: Number(item.precio_compra),
        precio_venta: Number(item.precio_venta),
        id_moneda: item.id_moneda,
        nombre_producto: item.producto?.nombre,
        precios: (item.precios || []).map((p) => ({
          id_moneda: p.id_moneda,
          precio_venta: Number(p.precio_venta),
          precio_compra: p.precio_compra ? Number(p.precio_compra) : undefined,
        })),
      })),
    });
    setView("form");
  };

  const handleDelete = (anexo: Anexo) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Anexo",
      message: `¿Está seguro de eliminar el anexo "${anexo.nombre_anexo}"?`,
      onConfirm: () => deleteMutation.mutate(anexo.id_anexo),
      type: "danger",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.id_convenio) errors.id_convenio = "Seleccione un convenio";
    if (!formData.nombre_anexo) errors.nombre_anexo = "Ingrese el nombre";
    if (!formData.fecha) errors.fecha = "Ingrese la fecha";
    if (!formData.productos || formData.productos.length === 0)
      errors.productos = "Agregue al menos un producto";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      id_dependencia: user?.dependencia?.id_dependencia,
      items: formData.productos.map((p) => ({
        id_producto: p.id_producto,
        entrada: p.entrada,
        precio_venta: p.precio_venta,
        id_moneda: p.id_moneda,
        precio_compra: p.precio_compra,
        precios: p.precios || [],
      })),
    };

    if (editingAnexo) {
      updateMutation.mutate({ id: editingAnexo.id_anexo, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (view === "form") {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("list")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {editingAnexo ? "Editar" : "Nuevo"} Anexo
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={convenioRef} className="relative">
                  <Label>Convenio *</Label>
                  <Input
                    value={formData.id_convenio
                      ? (convenios.find((c: any) => c.id_convenio === formData.id_convenio)?.nombre_convenio || convenioSearch)
                      : convenioSearch}
                    onChange={(e) => {
                      setConvenioSearch(e.target.value);
                      setFormData({ ...formData, id_convenio: 0 });
                      setConvenioDropdownOpen(true);
                    }}
                    onFocus={() => setConvenioDropdownOpen(true)}
                    placeholder="Buscar convenio..."
                  />
                  {convenioDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-48 overflow-y-auto">
                      {convenios
                        .filter((c: any) =>
                          c.nombre_convenio.toLowerCase().includes(convenioSearch.toLowerCase())
                        )
                        .map((c: any) => (
                          <div
                            key={c.id_convenio}
                            className={`px-3 py-2.5 cursor-pointer text-sm transition-colors hover:bg-teal-50 border-b border-gray-100 last:border-b-0 ${
                              formData.id_convenio === c.id_convenio ? "bg-teal-100 font-semibold text-teal-800" : "text-gray-700"
                            }`}
                            onClick={() => {
                              setFormData({ ...formData, id_convenio: c.id_convenio });
                              setConvenioSearch(c.nombre_convenio);
                              setConvenioDropdownOpen(false);
                            }}
                          >
                            {c.nombre_convenio}
                          </div>
                        ))}
                      {convenios.filter((c: any) =>
                        c.nombre_convenio.toLowerCase().includes(convenioSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados</div>
                      )}
                    </div>
                  )}
                  {formErrors.id_convenio && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.id_convenio}</p>
                  )}
                </div>
                <div>
                  <Label>Nombre del Anexo *</Label>
                  <Input
                    value={formData.nombre_anexo}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre_anexo: e.target.value })
                    }
                    placeholder="Nombre del anexo"
                  />
                  {formErrors.nombre_anexo && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.nombre_anexo}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                  {formErrors.fecha && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>
                  )}
                </div>
                <div>
                  <Label>Comisión (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.comision}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val) || val < 0) {
                        setFormData({ ...formData, comision: 0 });
                      } else if (val > 100) {
                        setFormData({ ...formData, comision: 100 });
                      } else {
                        setFormData({ ...formData, comision: val });
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 shadow-md border-gray-200 border-l-4 border-l-teal-500">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1 bg-teal-100 rounded-lg">
                  <Package className="h-4 w-4 text-teal-600" />
                </div>
                Productos del Anexo *
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              {formErrors.productos && (
                <p className="text-red-500 text-sm mb-3">{formErrors.productos}</p>
              )}

              {/* ── Buscador de productos + cantidad + nuevo producto ── */}
              <div className="grid grid-cols-[4fr_1fr_auto] gap-4 items-start mb-4">
                <div ref={dropdownProductoRef} className="relative">
                  <Label className="text-sm font-semibold mb-1.5 text-gray-700 flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-500" />
                    Producto *
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={productoSeleccionado ? productoSeleccionado.nombre : busquedaProducto}
                      disabled={!!productoSeleccionado}
                      onChange={(e) => {
                        setBusquedaProducto(e.target.value);
                        setShowDropdownProducto(true);
                        setProductoSeleccionado(null);
                      }}
                      onFocus={() => setShowDropdownProducto(true)}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-gray-100"
                    />
                    {productoSeleccionado && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductoSeleccionado(null);
                          setBusquedaProducto("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showDropdownProducto && !productoSeleccionado && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-60 overflow-auto">
                      {productos.filter((p: any) =>
                        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
                      ).length > 0 ? (
                        productos
                          .filter((p: any) =>
                            p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
                          )
                          .map((p: any) => (
                            <button
                              key={p.id_producto}
                              type="button"
                              onClick={() => {
                                setProductoSeleccionado(p);
                                setShowDropdownProducto(false);
                                setBusquedaProducto("");
                                setPrecioCompra(Number(p.precio_compra) || 0);
                                setPrecioVenta(Number(p.precio_venta) || 0);
                                setMonedaCompra(Number(p.moneda_compra) || (monedas[0]?.id_moneda) || 0);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0 group"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{p.nombre}</span>
                                <span className="text-teal-600 text-xs font-semibold">
                                  {p.precio_compra ? `Compra: $${Number(p.precio_compra).toFixed(2)}` : ""}
                                </span>
                              </div>
                              {p.descripcion && (
                                <span className="text-xs text-gray-400 line-clamp-1">{p.descripcion}</span>
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {busquedaProducto ? (
                            <div className="flex flex-col items-center gap-1">
                              <Search className="h-5 w-5 text-gray-300" />
                              <span>No se encontraron resultados</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Escribe para buscar...</span>
                          )}
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
                    className="mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                    value={cantidad || ""}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="pt-7">
                  <button
                    type="button"
                    onClick={() => setShowNuevoProductoModal(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo
                  </button>
                </div>
              </div>

              {/* ── Precios Base ── */}
              {productoSeleccionado && (
                <div className="mb-4 rounded-lg ring-1 ring-teal-200 overflow-hidden bg-gradient-to-r from-teal-50/30 to-white">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-teal-100/50 border-b border-teal-200">
                    <div className="p-0.5 bg-teal-200 rounded">
                      <DollarSign className="h-3.5 w-3.5 text-teal-700" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Precios Base</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Moneda</Label>
                        <select
                          value={monedaCompra || ""}
                          onChange={(e) => setMonedaCompra(parseInt(e.target.value) || 0)}
                          className="w-full mt-1.5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white text-sm"
                        >
                          <option value="">Seleccionar</option>
                          {monedas.map((m: any) => (
                            <option key={m.id_moneda} value={m.id_moneda}>
                              {m.simbolo} - {m.denominacion || m.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Compra</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="mt-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={precioCompra}
                          onChange={(e) => setPrecioCompra(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Venta</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="mt-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={precioVenta}
                          onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Precios Adicionales ── */}
              {productoSeleccionado && (
                <div className="mb-4 rounded-lg ring-1 ring-amber-200 bg-gradient-to-r from-amber-50/30 to-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <div className="p-0.5 bg-amber-200 rounded">
                        <DollarSign className="h-3.5 w-3.5 text-amber-700" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Precios Adicionales</span>
                      {preciosExtra.length > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-full">
                          {preciosExtra.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPrecioForm({ id_moneda: 0, precio_compra: "", precio_venta: "" });
                        setEditingPrecioIndex(null);
                        setShowPreciosModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </button>
                  </div>
                  {preciosExtra.length === 0 && (
                    <p className="text-xs text-gray-400 py-3 px-4">Sin precios adicionales</p>
                  )}
                  {preciosExtra.length > 0 && (
                    <div className="p-3">
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Moneda</th>
                              <th className="text-right px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">P. Compra</th>
                              <th className="text-right px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">P. Venta</th>
                              <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-20">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {preciosExtra.map((p, i) => {
                              const moneda = monedas.find((m: any) => m.id_moneda === p.id_moneda);
                              return (
                                <tr key={i} className="transition-colors hover:bg-amber-50/50 group">
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                                      {moneda?.simbolo || "?"}
                                    </span>
                                    <span className="ml-2 text-gray-500 text-xs">{moneda?.denominacion || ""}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                                    {p.precio_compra ? Number(p.precio_compra).toFixed(2) : "-"}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-teal-700">
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
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPreciosExtra((prev) => prev.filter((_, j) => j !== i))}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Botón Agregar a la tabla ── */}
              {productoSeleccionado && (
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    onClick={addProductToList}
                    className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar a la tabla
                  </Button>
                </div>
              )}

              {/* ── Tabla de productos agregados ── */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-teal-50 to-cyan-50">
                      <TableHead className="text-xs uppercase tracking-wider">Producto</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">Entrada</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">Moneda</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">P. Venta</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">P. Compra</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.productos.length > 0 ? (
                      formData.productos.map((prod, index) => (
                        <TableRow key={index} className="group transition-colors hover:bg-teal-50/40">
                          <TableCell className="font-medium text-gray-800">
                            {prod.nombre_producto || `Producto ${prod.id_producto}`}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                              {prod.entrada}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                              {monedas.find((m: any) => m.id_moneda === prod.id_moneda)?.simbolo || `#${prod.id_moneda}`}
                            </span>
                            {prod.precios && prod.precios.length > 0 && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full">
                                +{prod.precios.length} alt.
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-teal-700">${Number(prod.precio_venta).toFixed(2)}</TableCell>
                          <TableCell className="text-gray-700">${Number(prod.precio_compra).toFixed(2)}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-6 w-6 text-gray-300" />
                            <span className="text-sm">No hay productos agregados</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2 pb-8">
            <Button
              type="submit"
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Save className="h-4 w-4" />
              {editingAnexo ? "Actualizar" : "Crear"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setView("list")}
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* ── Modal Nuevo Producto ── */}
        {showNuevoProductoModal &&
          createPortal(
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Package className="h-5 w-5 text-teal-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Nuevo Producto</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNuevoProductoModal(false)}
                    className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nombre *</Label>
                    <Input
                      required
                      className="mt-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={nuevoProducto.nombre}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                      placeholder="Nombre del producto"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Código</Label>
                    <Input
                      className="mt-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={nuevoProducto.codigo}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, codigo: e.target.value })}
                      placeholder="Código del producto"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subcategoría *</Label>
                    <select
                      value={nuevoProducto.id_subcategoria}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, id_subcategoria: parseInt(e.target.value) || 1 })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                    >
                      {subcategorias.map((sc: any) => (
                        <option key={sc.id_subcategoria} value={sc.id_subcategoria}>{sc.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Descripción</Label>
                    <textarea
                      value={nuevoProducto.descripcion}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                      placeholder="Descripción del producto"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Precio Compra *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number" step="0.01" min="0" required
                          value={nuevoProducto.precio_compra}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_compra: parseFloat(e.target.value) || 0 })}
                          className="flex-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder="0.00"
                        />
                        <select
                          value={nuevoProducto.moneda_compra}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, moneda_compra: parseInt(e.target.value) || 1 })}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        >
                          {monedas.map((m: any) => (
                            <option key={m.id_moneda} value={m.id_moneda}>{m.simbolo}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Precio Venta *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number" step="0.01" min="0" required
                          value={nuevoProducto.precio_venta}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_venta: parseFloat(e.target.value) || 0 })}
                          className="flex-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder="0.00"
                        />
                        <select
                          value={nuevoProducto.moneda_venta}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, moneda_venta: parseInt(e.target.value) || 1 })}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                        >
                          {monedas.map((m: any) => (
                            <option key={m.id_moneda} value={m.id_moneda}>{m.simbolo}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Precio Mínimo *</Label>
                    <Input
                      type="number" step="0.01" min="0" required
                      className="mt-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={nuevoProducto.precio_minimo}
                      onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_minimo: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t bg-gradient-to-r from-gray-50 to-white">
                  <Button type="button" variant="outline" onClick={() => setShowNuevoProductoModal(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!nuevoProducto.nombre}
                    onClick={() => {
                      if (!nuevoProducto.nombre) {
                        toast.error("El nombre del producto es obligatorio");
                        return;
                      }
                      toast.success("Producto creado (simulado)");
                      setShowNuevoProductoModal(false);
                    }}
                    className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* ── Modal Precios Adicionales ── */}
        {showPreciosModal &&
          createPortal(
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingPrecioIndex !== null ? "Editar" : "Agregar"} Precio Adicional
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreciosModal(false)}
                    className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Moneda *</Label>
                    <select
                      value={currentPrecioForm.id_moneda}
                      onChange={(e) => setCurrentPrecioForm({ ...currentPrecioForm, id_moneda: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                    >
                      <option value={0}>Seleccionar moneda</option>
                      {monedas.map((m: any) => (
                        <option key={m.id_moneda} value={m.id_moneda}>
                          {m.simbolo} - {m.denominacion || m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Precio de Compra</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      className="mt-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={currentPrecioForm.precio_compra}
                      onChange={(e) => setCurrentPrecioForm({ ...currentPrecioForm, precio_compra: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Precio de Venta *</Label>
                    <Input
                      type="number" step="0.01" min="0.01" required
                      className="mt-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={currentPrecioForm.precio_venta}
                      onChange={(e) => setCurrentPrecioForm({ ...currentPrecioForm, precio_venta: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t bg-gradient-to-r from-gray-50 to-white">
                  <Button type="button" variant="outline" onClick={() => setShowPreciosModal(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!currentPrecioForm.id_moneda || !currentPrecioForm.precio_venta}
                    onClick={() => {
                      if (!currentPrecioForm.id_moneda || !currentPrecioForm.precio_venta) {
                        toast.error("Moneda y precio de venta son obligatorios");
                        return;
                      }
                      if (editingPrecioIndex !== null) {
                        setPreciosExtra((prev) => prev.map((p, i) => i === editingPrecioIndex ? currentPrecioForm : p));
                      } else {
                        setPreciosExtra((prev) => [...prev, currentPrecioForm]);
                      }
                      setShowPreciosModal(false);
                      setEditingPrecioIndex(null);
                    }}
                    className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-md"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Anexos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de anexos ({anexos.length} registrados)
            </p>
          </div>
        </div>
        <Button
          onClick={handleNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Anexo
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar anexos..."
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
        </div>
      </div>

      <Card className="overflow-hidden shadow-md border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider">Convenio</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Código</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Nombre</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Fecha</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Comisión</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                      <span className="text-sm">Cargando anexos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : anexos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-10 w-10 text-gray-300" />
                      <span className="text-sm font-medium">No hay anexos registrados</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                [...anexos].reverse().map((anexo, index) => (
                  <TableRow
                    key={anexo.id_anexo}
                    className={`cursor-pointer transition-all duration-200 hover:bg-teal-50 hover:shadow-sm ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    }`}
                    onClick={() => setAnexoDetailModal({ isOpen: true, anexo })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {(anexo.convenios?.nombre_convenio || "S")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-700">{anexo.convenios?.nombre_convenio || "Sin convenio"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {anexo.codigo_anexo || "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">{anexo.nombre_anexo}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{anexo.fecha}</TableCell>
                    <TableCell>
                      {anexo.comision ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          {anexo.comision}%
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleEdit(anexo); }}
                          className="text-gray-400 hover:text-green-600 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDelete(anexo); }}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Sentinel para scroll infinito */}
        <div ref={loadMoreRef} className="flex justify-center py-2">
          {isFetchingMore && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando más...</span>
            </div>
          )}
        </div>
      </Card>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {anexoDetailModal.isOpen && anexoDetailModal.anexo && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <Package className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{anexoDetailModal.anexo.nombre_anexo}</h3>
                  <p className="text-xs text-gray-500">{anexoDetailModal.anexo.codigo_anexo || "Sin código"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnexoDetailModal({ isOpen: false, anexo: null })}
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-teal-100 rounded-lg">
                    <HeartHandshake className="h-4 w-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Convenio</p>
                    <p className="text-sm font-medium text-gray-800">{anexoDetailModal.anexo.convenios?.nombre_convenio || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-cyan-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-cyan-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Fecha</p>
                    <p className="text-sm font-medium text-gray-800">{anexoDetailModal.anexo.fecha}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Hash className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Código</p>
                    <p className="text-sm font-medium text-gray-800">{anexoDetailModal.anexo.codigo_anexo || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Percent className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Comisión</p>
                    <p className="text-sm font-medium text-gray-800">{anexoDetailModal.anexo.comision ? `${anexoDetailModal.anexo.comision}%` : '-'}</p>
                  </div>
                </div>
              </div>

              {anexoDetailModal.anexo.items_anexo && anexoDetailModal.anexo.items_anexo.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-500" />
                    Productos
                    <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-bold text-teal-700 bg-teal-100 rounded-full">
                      {anexoDetailModal.anexo.items_anexo.length}
                    </span>
                  </h4>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Producto</th>
                          <th className="px-4 py-2.5 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Cant</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">P. Venta</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">P. Compra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {anexoDetailModal.anexo.items_anexo.map((item, i) => (
                          <tr key={item.id_item_anexo} className={`transition-colors hover:bg-teal-50/50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{item.producto?.nombre || `Producto #${item.id_producto}`}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                                {item.entrada}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-teal-700">${Number(item.precio_venta).toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-700">${Number(item.precio_compra).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Sin productos registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteList } from "../hooks/useInfiniteList";
import {
  anexosService,
  conveniosService,
  dependenciasService,
  productosService,
  monedaService,
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
  anexo_convenio?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo_convenio?: string;
  };
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

  const [formData, setFormData] = useState({
    id_convenio: 0,
    nombre_anexo: "",
    fecha: "",
    id_dependencia: null as number | null | undefined,
    comision: 0,
    productos: [] as AnexoProducto[],
  });
  const [newProduct, setNewProduct] = useState({
    id_producto: 0,
    entrada: 1,
    precios: [] as { id_moneda: number; precio_venta: number; precio_compra?: number }[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      anexosService.getAnexos(undefined, search || undefined, skip, limit),
    limit: 100,
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

  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: () => conveniosService.getConvenios(),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ["dependencias"],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: productos = [] } = useQuery({
    queryKey: ["productos"],
    queryFn: () => productosService.getProductos(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Anexo>) => anexosService.createAnexo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anexos"] });
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
      queryClient.invalidateQueries({ queryKey: ["anexos"] });
      toast.success("Anexo actualizado");
      setView("list");
      resetForm();
    },
    onError: () => toast.error("Error al actualizar anexo"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => anexosService.deleteAnexo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anexos"] });
      toast.success("Anexo eliminado");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error("Error al eliminar anexo"),
  });

  const resetForm = () => {
    setFormData({
      id_convenio: 0,
      nombre_anexo: "",
      fecha: "",
      id_dependencia: undefined,
      comision: 0,
      productos: [],
    });
    setNewProduct({
      id_producto: 0, entrada: 1, precios: [],
    });
    setFormErrors({});
    setEditingAnexo(null);
  };

  const addProduct = () => {
    if (
      !newProduct.id_producto ||
      !newProduct.entrada ||
      newProduct.precios.length === 0
    ) {
      toast.error("Complete todos los campos del producto y agregue al menos un precio");
      return;
    }
    const producto = productos.find(
      (p) => p.id_producto === newProduct.id_producto,
    );
    const main = newProduct.precios[0];
    setFormData({
      ...formData,
      productos: [
        ...formData.productos,
        {
          ...newProduct,
          id_moneda: main.id_moneda,
          precio_venta: main.precio_venta,
          precio_compra: main.precio_compra || 0,
          nombre_producto: producto?.nombre,
          precios: newProduct.precios,
        },
      ],
    });
    setNewProduct({
      id_producto: 0, entrada: 1, precios: [],
    });
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      productos: formData.productos.filter((_, i) => i !== index),
    });
  };

  const addPrecio = () => {
    const available = monedas.find(
      (m: any) => !newProduct.precios.some((p) => p.id_moneda === m.id_moneda)
    );
    if (!available) return;
    setNewProduct({
      ...newProduct,
      precios: [...newProduct.precios, { id_moneda: available.id_moneda, precio_venta: 0, precio_compra: 0 }],
    });
  };

  const updatePrecio = (index: number, field: string, value: any) => {
    const updated = [...newProduct.precios];
    (updated[index] as any)[field] = value;
    setNewProduct({ ...newProduct, precios: updated });
  };

  const removePrecio = (index: number) => {
    setNewProduct({
      ...newProduct,
      precios: newProduct.precios.filter((_, i) => i !== index),
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
      id_dependencia: anexo.id_dependencia ?? null,
      comision: anexo.comision || 0,
      productos: [],
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
      productos: formData.productos.map((p) => ({
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

  const filteredAnexos = anexos.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.nombre_anexo?.toLowerCase().includes(term) ||
      a.codigo_anexo?.toLowerCase().includes(term) ||
      a.anexo_convenio?.nombre_convenio?.toLowerCase().includes(term)
    );
  });

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
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Convenio *</Label>
                <select
                  value={formData.id_convenio || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_convenio: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="">Seleccione un convenio</option>
                  {convenios.map((c) => (
                    <option key={c.id_convenio} value={c.id_convenio}>
                      {c.nombre_convenio}
                    </option>
                  ))}
                </select>
                {formErrors.id_convenio && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.id_convenio}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del Anexo *</Label>
                  <Input
                    value={formData.nombre_anexo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nombre_anexo: e.target.value,
                      })
                    }
                    placeholder="Nombre del anexo"
                  />
                  {formErrors.nombre_anexo && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.nombre_anexo}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                  />
                  {formErrors.fecha && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.fecha}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Dependencia</Label>
                  <select
                    value={formData.id_dependencia ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        id_dependencia: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="">Seleccione dependencia</option>
                    {dependencias.map((d) => (
                      <option key={d.id_dependencia} value={d.id_dependencia}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
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

          <Card className="mb-6 shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-teal-600" />
                Productos del Anexo *
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              {formErrors.productos && (
                <p className="text-red-500 text-sm mb-3">
                  {formErrors.productos}
                </p>
              )}

              <div className="mb-3">
                <div className="grid grid-cols-3 gap-2 mb-1 text-xs font-medium text-gray-500">
                  <div className="px-3 py-1">Producto</div>
                  <div className="px-3 py-1">Entrada</div>
                  <div></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newProduct.id_producto || ""}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        id_producto: parseInt(e.target.value) || 0,
                      })
                    }
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={newProduct.entrada}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        entrada: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Entrada"
                  />
                  <Button type="button" onClick={addProduct} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-600 mb-2">Precios</p>
                {newProduct.precios.length > 0 ? (
                  newProduct.precios.map((alt, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                      <select
                        value={alt.id_moneda || ""}
                        onChange={(e) => updatePrecio(i, 'id_moneda', parseInt(e.target.value) || 0)}
                        className="px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Moneda</option>
                        {monedas
                          .filter((m: any) => !newProduct.precios.some((p) => p.id_moneda === m.id_moneda) || m.id_moneda === alt.id_moneda)
                          .map((m: any) => (
                            <option key={m.id_moneda} value={m.id_moneda}>
                              {m.simbolo || m.nombre}
                            </option>
                          ))}
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        value={alt.precio_venta}
                        onChange={(e) => updatePrecio(i, 'precio_venta', parseFloat(e.target.value) || 0)}
                        placeholder="P. Venta"
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={alt.precio_compra}
                        onChange={(e) => updatePrecio(i, 'precio_compra', parseFloat(e.target.value) || 0)}
                        placeholder="P. Compra"
                        className="text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removePrecio(i)}
                        className="p-1 hover:bg-red-50 rounded self-center"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 mb-2">Agregue al menos un precio</p>
                )}
                {monedas.some(
                  (m: any) => !newProduct.precios.some((p) => p.id_moneda === m.id_moneda)
                ) && (
                  <button
                    type="button"
                    onClick={addPrecio}
                    className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 mt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar precio
                  </button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>P. Venta</TableHead>
                      <TableHead>P. Compra</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.productos.length > 0 ? (
                      formData.productos.map((prod, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {prod.nombre_producto ||
                              `Producto ${prod.id_producto}`}
                          </TableCell>
                          <TableCell>{prod.entrada}</TableCell>
                          <TableCell>
                            {monedas.find((m: any) => m.id_moneda === prod.id_moneda)?.simbolo || `#${prod.id_moneda}`}
                            {prod.precios && prod.precios.length > 0 && (
                              <span className="block text-[10px] text-gray-400">
                                +{prod.precios.length} alt.
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{prod.precio_venta.toFixed(2)}</TableCell>
                          <TableCell>{prod.precio_compra}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="p-1 hover:bg-slate-50 rounded"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-4">
                          No hay productos agregados
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>Convenio</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredAnexos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No hay anexos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnexos.map((anexo) => (
                  <TableRow key={anexo.id_anexo}>
                    <TableCell>
                      {anexo.anexo_convenio?.nombre_convenio || "Sin convenio"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {anexo.codigo_anexo || "-"}
                    </TableCell>
                    <TableCell>{anexo.nombre_anexo}</TableCell>
                    <TableCell>{anexo.fecha}</TableCell>
                    <TableCell>
                      {anexo.comision ? `${anexo.comision}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(anexo)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(anexo)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
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
      </Card>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

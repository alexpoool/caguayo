import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteList } from "../hooks/useInfiniteList";
import {
  conveniosService,
  clientesService,
  configuracionService,
} from "../services/api";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  ArrowLeft,
  ScrollText,
  Eye,
  Loader2,
  X,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

interface ClienteSimple {
  id_cliente: number;
  codigo: string;
  nombre: string;
}

interface TipoConvenio {
  id_tipo_convenio: number;
  nombre: string;
  descripcion?: string;
}

interface Convenio {
  id_convenio: number;
  codigo?: string;
  id_cliente: number;
  nombre_convenio: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio: number;
  cliente?: ClienteSimple;
  tipo_convenio?: TipoConvenio;
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

export function ConveniosPage() {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);
  const [viewingConvenio, setViewingConvenio] = useState<Convenio | null>(null);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    convenio: Convenio | null;
  }>({ isOpen: false, convenio: null });
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
    id_cliente: 0,
    nombre_convenio: "",
    fecha: "",
    vigencia: "",
    id_tipo_convenio: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedor = searchParams.get("proveedor");
  const [filtroProveedor] = useState<number | null>(
    initialProveedor ? Number(initialProveedor) : null,
  );

  // ── Lista infinita de convenios ────────────────────────────────────────────
  const {
    items: convenios,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<Convenio>({
    queryKeyBase: "convenios",
    queryFn: (skip, limit, search) =>
      conveniosService.getConvenios(filtroProveedor ?? undefined, search || undefined, skip, limit),
    limit: 100,
    extraQueryKeyParams: [filtroProveedor],
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

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes", "proveedores"],
    queryFn: () => clientesService.getClientes(0, 10000, "PROVEEDOR,AMBAS"),
  });

  const { data: tiposConvenio = [] } = useQuery({
    queryKey: ["tiposConvenio"],
    queryFn: () => configuracionService.getTiposConvenio(),
  });

  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    const q = clienteSearch.toLowerCase();
    return clientes.filter((c) =>
      c.nombre?.toLowerCase().includes(q) ||
      c.codigo?.toLowerCase().includes(q) ||
      c.nit?.toLowerCase().includes(q)
    );
  }, [clientes, clienteSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node))
        setShowClienteDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Convenio>) =>
      conveniosService.createConvenio(data),
    onSuccess: () => {
      refresh();
      toast.success("Convenio creado");
      setView("list");
      resetForm();
    },
    onError: () => toast.error("Error al crear convenio"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Convenio> }) =>
      conveniosService.updateConvenio(id, data),
    onSuccess: () => {
      refresh();
      toast.success("Convenio actualizado");
      setView("list");
      resetForm();
    },
    onError: () => toast.error("Error al actualizar convenio"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conveniosService.deleteConvenio(id),
    onSuccess: () => {
      refresh();
      toast.success("Convenio eliminado");
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error("Error al eliminar convenio"),
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      nombre_convenio: "",
      fecha: "",
      vigencia: "",
      id_tipo_convenio: 0,
    });
    setFormErrors({});
    setEditingConvenio(null);
  };

  const handleNew = () => {
    resetForm();
    setView("form");
  };

  const handleEdit = (convenio: Convenio) => {
    setEditingConvenio(convenio);
    setFormData({
      id_cliente: convenio.id_cliente,
      nombre_convenio: convenio.nombre_convenio,
      fecha: convenio.fecha,
      vigencia: convenio.vigencia,
      id_tipo_convenio: convenio.id_tipo_convenio,
    });
    setView("form");
  };

  const handleDelete = (convenio: Convenio) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Convenio",
      message: `¿Está seguro de eliminar el convenio "${convenio.nombre_convenio}"?`,
      onConfirm: () => deleteMutation.mutate(convenio.id_convenio),
      type: "danger",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.id_cliente) errors.id_cliente = "Seleccione un cliente";
    if (!formData.id_tipo_convenio)
      errors.id_tipo_convenio = "Seleccione un tipo de convenio";
    if (!formData.nombre_convenio) errors.nombre_convenio = "Ingrese el nombre";
    if (!formData.fecha) errors.fecha = "Ingrese la fecha";
    if (!formData.vigencia) errors.vigencia = "Ingrese la vigencia";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingConvenio) {
      updateMutation.mutate({
        id: editingConvenio.id_convenio,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
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
              <ScrollText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {editingConvenio ? "Editar" : "Nuevo"} Convenio
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6 space-y-4">
              <div ref={clienteRef} className="relative">
                <Label>Cliente *</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={
                      formData.id_cliente
                        ? (clientes.find((c) => c.id_cliente === formData.id_cliente)?.nombre || "")
                        : clienteSearch
                    }
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      if (formData.id_cliente)
                        setFormData({ ...formData, id_cliente: 0 });
                      setShowClienteDropdown(true);
                    }}
                    onFocus={() => setShowClienteDropdown(true)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                {showClienteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClientes.length === 0 ? (
                      <p className="p-3 text-gray-500 text-sm">No se encontraron clientes</p>
                    ) : (
                      filteredClientes.map((c) => (
                        <div
                          key={c.id_cliente}
                          className="px-3 py-2 hover:bg-teal-50 cursor-pointer flex items-center justify-between"
                          onMouseDown={() => {
                            setFormData({ ...formData, id_cliente: c.id_cliente });
                            setClienteSearch("");
                            setShowClienteDropdown(false);
                          }}
                        >
                          <span className="text-sm font-medium">{c.nombre}</span>
                          <span className="text-xs text-gray-400">{c.codigo}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {formErrors.id_cliente && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.id_cliente}
                  </p>
                )}
              </div>

              <div>
                <Label>Tipo de Convenio *</Label>
                <select
                  value={formData.id_tipo_convenio || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_tipo_convenio: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposConvenio.map((tc) => (
                    <option
                      key={tc.id_tipo_convenio}
                      value={tc.id_tipo_convenio}
                    >
                      {tc.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.id_tipo_convenio && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.id_tipo_convenio}
                  </p>
                )}
              </div>

              <div>
                <Label>Nombre del Convenio *</Label>
                <Input
                  value={formData.nombre_convenio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nombre_convenio: e.target.value,
                    })
                  }
                  placeholder="Nombre del contrato/convenio"
                />
                {formErrors.nombre_convenio && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.nombre_convenio}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <Label>Vigencia *</Label>
                  <Input
                    type="date"
                    value={formData.vigencia}
                    onChange={(e) =>
                      setFormData({ ...formData, vigencia: e.target.value })
                    }
                  />
                  {formErrors.vigencia && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.vigencia}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2 pb-8">
            <Button
              type="submit"
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Save className="h-4 w-4" />
              {editingConvenio ? "Actualizar" : "Crear"}
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

  // VISTA: DETALLE
  if (view === "detail" && viewingConvenio) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setView("list");
              setViewingConvenio(null);
            }}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
              <ScrollText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Detalle del Convenio
            </h1>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-5 w-5 text-teal-600" />
              Detalles del Convenio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-md border border-teal-100">
                <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">
                  Código
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.codigo || "N/A"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-100">
                <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
                  Nombre
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.nombre_convenio}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                  Cliente
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.cliente?.nombre || "N/A"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
                <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                  Tipo de Convenio
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.tipo_convenio?.nombre || "N/A"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-md border border-orange-100">
                <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">
                  Fecha
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.fecha}
                </p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-red-50 p-4 rounded-md border border-rose-100">
                <p className="text-xs text-rose-600 uppercase tracking-wider mb-1">
                  Vigencia
                </p>
                <p className="font-bold text-gray-900">
                  {viewingConvenio.vigencia}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingConvenio(viewingConvenio);
              setView("form");
            }}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setView("list");
              setViewingConvenio(null);
            }}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Convenios</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de convenios ({convenios.length} registrados)
            </p>
          </div>
        </div>
        <Button
          onClick={handleNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Convenio
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar convenios..."
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Anexos</TableHead>
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
              ) : convenios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No hay convenios registrados
                  </TableCell>
                </TableRow>
              ) : (
                convenios.map((convenio) => (
                  <TableRow
                    key={convenio.id_convenio}
                    className="cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, convenio })}
                  >
                    <TableCell className="font-medium">
                      {convenio.codigo || "-"}
                    </TableCell>
                    <TableCell>
                      {convenio.cliente?.nombre || "Sin cliente"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {convenio.nombre_convenio}
                    </TableCell>
                    <TableCell>
                      {convenio.tipo_convenio?.nombre || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/compra/anexos?convenio=${convenio.id_convenio}`);
                        }}
                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        Anexos
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(convenio)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(convenio)}
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

      {detailModal.isOpen && detailModal.convenio && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <ScrollText className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{detailModal.convenio.nombre_convenio}</h3>
                  <p className="text-xs text-gray-500">{detailModal.convenio.codigo || "Sin código"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, convenio: null })}
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {new Date(detailModal.convenio.vigencia) < new Date() && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800 text-sm">Vencido</p>
                    <p className="text-sm text-red-700">
                      Este convenio ha excedido su fecha de vigencia. Vigencia original: {detailModal.convenio.vigencia}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-teal-100 rounded-lg">
                    <ScrollText className="h-4 w-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Código</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.codigo || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <ScrollText className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Cliente</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.cliente?.nombre || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <ScrollText className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Nombre</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.nombre_convenio}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <ScrollText className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Tipo de Convenio</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.tipo_convenio?.nombre || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Fecha</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.fecha}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-rose-700" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Vigencia</p>
                    <p className="text-sm font-medium text-gray-800">{detailModal.convenio.vigencia}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

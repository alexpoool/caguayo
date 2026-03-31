import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
} from "../../components/ui";
import {
  contratosService,
  clientesService,
  monedaService,
} from "../../services/api";
import type { Cliente } from "../../types/ventas";
import type { Moneda } from "../../types/moneda";
import type { ContratoWithDetails, ContratoCreate } from "../../types/contrato";
import {
  Plus,
  Save,
  Trash2,
  Edit,
  ArrowLeft,
  Search,
  FileText,
  User,
  DollarSign,
  Calendar,
  Tag,
  X,
  Eye,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

type View = "list" | "form";

export function ContratosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClienteId = searchParams.get("cliente");
  const [view, setView] = useState<View>("list");

  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [tiposContrato, setTiposContrato] = useState<
    { id: number; nombre: string }[]
  >([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCliente, setFiltroCliente] = useState<number | null>(
    initialClienteId ? Number(initialClienteId) : null,
  );
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: ContratoWithDetails | null;
  }>({ isOpen: false, item: null });
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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [clientesRes, monedasRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100),
      ]);
      setClientes(clientesRes);
      setMonedas(monedasRes);
      setEstados([
        { id: 1, nombre: "ACTIVO" },
        { id: 2, nombre: "CANCELADO" },
        { id: 3, nombre: "FINALIZADO" },
        { id: 4, nombre: "PENDIENTE" },
      ]);
      setTiposContrato([
        { id: 1, nombre: "SERVICIO" },
        { id: 2, nombre: "OBRA" },
        { id: 3, nombre: "MANTENIMIENTO" },
        { id: 4, nombre: "ALQUILER" },
        { id: 5, nombre: "COMPRA" },
      ]);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadContratos = async () => {
    try {
      const data = await contratosService.getContratos();
      setContratos(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (view === "list") loadContratos();
  }, [view]);

  const handleSave = async () => {
    try {
      const data: ContratoCreate = {
        nombre: formData.nombre || "",
        id_cliente: Number(formData.id_cliente) || 0,
        id_estado: Number(formData.id_estado) || 1,
        id_tipo_contrato: Number(formData.id_tipo_contrato) || 1,
        id_moneda: Number(formData.id_moneda) || 1,
        fecha: formData.fecha || new Date().toISOString().split("T")[0],
        vigencia: formData.vigencia || new Date().toISOString().split("T")[0],
        proforma: formData.proforma,
        documento_final: formData.documento_final,
      };
      editingId
        ? await contratosService.updateContrato(editingId, data)
        : await contratosService.createContrato(data);
      toast.success(editingId ? "Actualizado" : "Creado");
      setView("list");
      resetForm();
      loadContratos();
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar contrato?",
      message: `¿Está seguro de eliminar el contrato "${nombre}"?`,
      onConfirm: async () => {
        try {
          await contratosService.deleteContrato(id);
          toast.success("Eliminado");
          loadContratos();
        } catch (error: any) {
          toast.error(error.message || "Error");
        }
      },
      type: "danger",
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
  };

  const openForm = (item?: ContratoWithDetails) => {
    if (item) {
      setEditingId(item.id_contrato);
      setFormData({
        nombre: item.nombre,
        proforma: item.proforma,
        id_cliente: item.id_cliente,
        id_estado: item.id_estado,
        fecha: item.fecha,
        vigencia: item.vigencia,
        id_tipo_contrato: item.id_tipo_contrato,
        id_moneda: item.id_moneda,
        documento_final: item.documento_final,
      });
    } else {
      resetForm();
    }
    setView("form");
  };

  const filteredContratos = useMemo(() => {
    let result = contratos;
    if (filtroCliente) {
      result = result.filter((c) => c.id_cliente === filtroCliente);
    }
    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.estado?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return result;
  }, [contratos, filtroCliente, searchTerm]);

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded shadow-lg animate-bounce-subtle">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Contratos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredContratos.length === contratos.length
                ? `Gestión de contratos (${contratos.length} items)`
                : `Mostrando ${filteredContratos.length} de ${contratos.length} contratos`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      <div className="flex gap-2">
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white text-sm"
          value={filtroCliente || ""}
          onChange={(e) => setFiltroCliente(Number(e.target.value) || null)}
        >
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id_cliente} value={c.id_cliente}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar contratos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-rose-50 to-pink-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-rose-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-rose-600" />
                    Cliente
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-rose-600" />
                    Monto
                  </div>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Suplementos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchTerm
                      ? "No se encontraron contratos que coincidan con la búsqueda"
                      : "No hay contratos"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContratos.map((item) => (
                  <TableRow
                    key={item.id_contrato}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, item })}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {item.nombre}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {item.cliente?.nombre || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.estado?.nombre === "ACTIVO"
                            ? "bg-green-100 text-green-800"
                            : item.estado?.nombre === "CANCELADO"
                              ? "bg-red-100 text-red-800"
                              : item.estado?.nombre === "FINALIZADO"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.estado?.nombre || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/ventas/suplementos?contrato=${item.id_contrato}`,
                          )
                        }
                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Suplemento
                      </Button>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(item.id_contrato, item.nombre)
                          }
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
    </div>
  );

  const renderForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded shadow-lg animate-bounce-subtle">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingId ? "Editar Contrato" : "Nuevo Contrato"}
            </h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Complete los datos del contrato
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setView("list");
            resetForm();
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-rose-600" />
            Información del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="mt-1"
                placeholder="Nombre del contrato"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Cliente *</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                value={formData.id_cliente || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_cliente: e.target.value })
                }
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Proforma</Label>
              <Input
                value={formData.proforma || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, proforma: e.target.value })
                }
                className="mt-1"
                placeholder="Número de proforma"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                value={formData.id_estado || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_estado: e.target.value })
                }
              >
                {estados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                value={formData.id_tipo_contrato || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_tipo_contrato: e.target.value })
                }
              >
                {tiposContrato.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Vigencia</Label>
              <Input
                type="date"
                value={formData.vigencia || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, vigencia: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                value={formData.id_moneda || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_moneda: e.target.value })
                }
              >
                <option value="">Seleccionar moneda</option>
                {monedas.map((m) => (
                  <option key={m.id_moneda} value={m.id_moneda}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Documento Final</Label>
              <Input
                value={formData.documento_final || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, documento_final: e.target.value })
                }
                className="mt-1"
                placeholder="Número de documento"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Save className="h-4 w-4" />
              {editingId ? "Actualizar" : "Guardar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setView("list");
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {view === "list" && renderList()}
      {view === "form" && renderForm()}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {detailModal.isOpen &&
        detailModal.item &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-md bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {detailModal.item.nombre}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {detailModal.item.codigo || "Sin código"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setDetailModal({ isOpen: false, item: null })
                    }
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
                      Cliente
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.cliente?.nombre || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
                    <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                      Monto
                    </p>
                    <p className="font-bold text-green-900 text-xl">
                      ${Number(detailModal.item.monto).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Tipo
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.tipo_contrato?.nombre || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Estado
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        detailModal.item.estado?.nombre === "ACTIVO"
                          ? "bg-green-100 text-green-800"
                          : detailModal.item.estado?.nombre === "CANCELADO"
                            ? "bg-red-100 text-red-800"
                            : detailModal.item.estado?.nombre === "FINALIZADO"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {detailModal.item.estado?.nombre || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                      Fecha
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.fecha || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-md border border-orange-100">
                    <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">
                      Vigencia
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.vigencia || "N/A"}
                    </p>
                  </div>
                </div>
                {detailModal.item.proforma && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Proforma
                    </p>
                    <p className="text-gray-700">{detailModal.item.proforma}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setDetailModal({ isOpen: false, item: null })}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

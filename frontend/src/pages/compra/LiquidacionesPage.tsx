import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Check,
  XCircle,
  Filter,
  Eye,
  DollarSign,
  FileText,
  ScrollText,
  Tag,
  Calendar,
  User,
  X,
} from "lucide-react";
import {
  liquidacionService,
  productosEnLiquidacionService,
  type Liquidacion,
  type LiquidacionCreate,
  type ProductosEnLiquidacion,
} from "../../services/api";
import { clientesService, type Cliente } from "../../services/api";
import { anexosService, type Anexo } from "../../services/api";
import { monedaService, type Moneda } from "../../services/api";

type TabType = "todas" | "pendientes" | "liquidadas";

export function LiquidacionesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProveedorId = searchParams.get("proveedor");

  const [activeTab, setActiveTab] = useState<TabType>("todas");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] =
    useState<Liquidacion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: Liquidacion | null;
  }>({ isOpen: false, item: null });

  const [filtroCliente, setFiltroCliente] = useState<number | null>(
    initialProveedorId ? Number(initialProveedorId) : null,
  );
  const [filtroAnexo, setFiltroAnexo] = useState<number | null>(null);

  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [formData, setFormData] = useState<LiquidacionCreate>({
    id_cliente: 0,
    id_convenio: undefined,
    id_anexo: undefined,
    id_moneda: 1,
    devengado: 0,
    tributario: 0,
    comision_bancaria: 0,
    gasto_empresa: 0,
    tipo_pago: "TRANSFERENCIA",
    observaciones: "",
    producto_ids: [],
  });

  const { data: liquidaciones = [], isLoading } = useQuery({
    queryKey: ["liquidaciones", activeTab],
    queryFn: async () => {
      if (activeTab === "pendientes") {
        return liquidacionService.getLiquidacionesPendientes();
      } else if (activeTab === "liquidadas") {
        return liquidacionService.getLiquidacionesLiquidadas();
      }
      return liquidacionService.getLiquidaciones();
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-proveedores"],
    queryFn: async () => {
      const allClientes = await clientesService.getClientes();
      return allClientes.filter(
        (c: Cliente) =>
          c.tipo_relacion === "PROVEEDOR" || c.tipo_relacion === "AMBAS",
      );
    },
  });

  const { data: anexos = [] } = useQuery({
    queryKey: ["anexos"],
    queryFn: () => anexosService.getAnexos(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: productosPendientes = [] } = useQuery({
    queryKey: ["productos-pendientes", filtroCliente, filtroAnexo],
    queryFn: () => {
      if (!filtroCliente) return Promise.resolve([]);
      return liquidacionService.getProductosPendientesByCliente(
        filtroCliente,
        filtroAnexo || undefined,
      );
    },
    enabled: !!filtroCliente,
  });

  const createMutation = useMutation({
    mutationFn: (data: LiquidacionCreate) =>
      liquidacionService.createLiquidacion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] });
      queryClient.invalidateQueries({ queryKey: ["productos-pendientes"] });
      toast.success("Liquidación creada correctamente");
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Error al crear liquidación",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => liquidacionService.deleteLiquidacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] });
      toast.success("Liquidación eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar liquidación");
    },
  });

  const confirmarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      liquidacionService.confirmarLiquidacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] });
      toast.success("Liquidación confirmada");
    },
    onError: () => {
      toast.error("Error al confirmar liquidación");
    },
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      id_convenio: undefined,
      id_anexo: undefined,
      id_moneda: 1,
      devengado: 0,
      tributario: 0,
      comision_bancaria: 0,
      gasto_empresa: 0,
      tipo_pago: "TRANSFERENCIA",
      observaciones: "",
      producto_ids: [],
    });
    setFiltroCliente(null);
    setFiltroAnexo(null);
    setSelectedProductos([]);
  };

  const handleClienteChange = (clienteId: number) => {
    setFiltroCliente(clienteId);
    setFiltroAnexo(null);
    setFormData((prev) => ({
      ...prev,
      id_cliente: clienteId,
      id_anexo: undefined,
      producto_ids: [],
    }));
    setSelectedProductos([]);
  };

  const handleAnexoChange = (anexoId: number | null) => {
    setFiltroAnexo(anexoId);
    setFormData((prev) => ({
      ...prev,
      id_anexo: anexoId || undefined,
      producto_ids: [],
    }));
    setSelectedProductos([]);
  };

  const handleProductoSelect = (productoId: number) => {
    setSelectedProductos((prev) => {
      if (prev.includes(productoId)) {
        return prev.filter((id) => id !== productoId);
      }
      return [...prev, productoId];
    });
    setFormData((prev) => ({
      ...prev,
      producto_ids: prev.producto_ids.includes(productoId)
        ? prev.producto_ids.filter((id) => id !== productoId)
        : [...prev.producto_ids, productoId],
    }));
  };

  const handleSelectAll = () => {
    const allIds = productosPendientes.map(
      (p: ProductosEnLiquidacion) => p.id_producto_en_liquidacion,
    );
    setSelectedProductos(allIds);
    setFormData((prev) => ({ ...prev, producto_ids: allIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData((prev) => ({ ...prev, producto_ids: [] }));
  };

  const calculateImporte = () => {
    return productosPendientes
      .filter((p: ProductosEnLiquidacion) =>
        selectedProductos.includes(p.id_producto_en_liquidacion),
      )
      .reduce((sum: number, p: ProductosEnLiquidacion) => {
        return sum + p.precio * p.cantidad;
      }, 0);
  };

  const calculateNetoPagar = () => {
    const importe = calculateImporte();
    const tributario = Number(formData.tributario) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    const gasto = Number(formData.gasto_empresa) || 0;
    return importe - tributario - comision - gasto;
  };

  const filteredLiquidaciones = liquidaciones.filter((l: Liquidacion) => {
    if (filtroCliente && l.id_cliente !== filtroCliente) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      l.codigo?.toLowerCase().includes(search) ||
      l.cliente?.nombre?.toLowerCase().includes(search)
    );
  });

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || "N/A";
  };

  const getAnexoInfo = (anexoId: number) => {
    const anexo = anexos.find((a: Anexo) => a.id_anexo === anexoId);
    return anexo?.nombre_anexo || "N/A";
  };

  const clienteAnexos = filtroCliente
    ? anexos.filter((a: Anexo) => {
        const anexo = anexos.find((an: Anexo) => an.id_anexo === a.id_anexo);
        return true;
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-lime-500 to-green-600 rounded shadow-lg animate-bounce-subtle">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de liquidaciones a proveedores
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/compra/liquidaciones/crear")}
          className="gap-2 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      <div className="flex gap-4 border-b">
        {(["todas", "pendientes", "liquidadas"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? "text-lime-600 border-b-2 border-lime-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none bg-white text-sm"
          value={filtroCliente || ""}
          onChange={(e) => setFiltroCliente(Number(e.target.value) || null)}
        >
          <option value="">Todos los proveedores</option>
          {clientes.map((c: Cliente) => (
            <option key={c.id_cliente} value={c.id_cliente}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar liquidaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-lime-50 to-green-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-lime-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-lime-600" />
                    Proveedor
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-lime-600" />
                    Anexo
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-lime-600" />
                    Importe
                  </div>
                </TableHead>
                <TableHead>Neto Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-gray-500"
                  >
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredLiquidaciones.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-500"
                  >
                    No hay liquidaciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredLiquidaciones.map((liquidacion: Liquidacion) => (
                  <TableRow
                    key={liquidacion.id_liquidacion}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setDetailModal({ isOpen: true, item: liquidacion })
                    }
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-lime-50 text-lime-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {liquidacion.codigo}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getClienteNombre(liquidacion.id_cliente)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {liquidacion.id_anexo
                        ? getAnexoInfo(liquidacion.id_anexo)
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {liquidacion.importe?.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {liquidacion.neto_pagar?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          liquidacion.liquidada
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {liquidacion.liquidada ? "Liquidada" : "Pendiente"}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLiquidacion(liquidacion);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!liquidacion.liquidada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("¿Confirmar liquidación?")) {
                                confirmarMutation.mutate({
                                  id: liquidacion.id_liquidacion,
                                  data: {
                                    tipo_pago: liquidacion.tipo_pago,
                                    devengado: liquidacion.devengado,
                                    tributario: liquidacion.tributario,
                                    comision_bancaria:
                                      liquidacion.comision_bancaria,
                                    gasto_empresa: liquidacion.gasto_empresa,
                                  },
                                });
                              }
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Eliminar liquidación?")) {
                              deleteMutation.mutate(liquidacion.id_liquidacion);
                            }
                          }}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle>Nueva Liquidación</CardTitle>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label>Proveedor *</Label>
                  <select
                    value={filtroCliente || ""}
                    onChange={(e) =>
                      handleClienteChange(Number(e.target.value))
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {clientes.map((cliente: Cliente) => (
                      <option
                        key={cliente.id_cliente}
                        value={cliente.id_cliente}
                      >
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Anexo</Label>
                  <select
                    value={filtroAnexo || ""}
                    onChange={(e) =>
                      handleAnexoChange(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full p-2 border rounded"
                    disabled={!filtroCliente}
                  >
                    <option value="">Todos los anexos</option>
                    {anexos.map((anexo: Anexo) => (
                      <option key={anexo.id_anexo} value={anexo.id_anexo}>
                        {anexo.nombre_anexo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.id_moneda}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        id_moneda: Number(e.target.value),
                      }))
                    }
                    className="w-full p-2 border rounded"
                  >
                    {monedas.map((moneda: Moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Tipo de Pago</Label>
                  <select
                    value={formData.tipo_pago}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tipo_pago: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {filtroCliente && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-700">
                      Productos Pendientes
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Deseleccionar todos
                      </button>
                    </div>
                  </div>

                  {productosPendientes.length === 0 ? (
                    <p className="text-gray-500 text-sm py-2">
                      No hay productos pendientes para este proveedor
                    </p>
                  ) : (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left"></th>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2 text-right">
                              Precio Venta
                            </th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productosPendientes.map(
                            (prod: ProductosEnLiquidacion) => (
                              <tr
                                key={prod.id_producto_en_liquidacion}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedProductos.includes(
                                      prod.id_producto_en_liquidacion,
                                    )}
                                    onChange={() =>
                                      handleProductoSelect(
                                        prod.id_producto_en_liquidacion,
                                      )
                                    }
                                    className="rounded"
                                  />
                                </td>
                                <td className="px-3 py-2">{prod.codigo}</td>
                                <td className="px-3 py-2">
                                  {prod.producto?.nombre ||
                                    `Producto ${prod.id_producto}`}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {prod.cantidad}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {prod.precio?.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {(
                                    prod.precio * prod.cantidad
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div>
                  <Label>Tributario (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tributario}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tributario: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Comisión Bancaria (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.comision_bancaria}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        comision_bancaria: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Gasto Empresa</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.gasto_empresa}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gasto_empresa: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Devengado (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.devengado}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        devengado: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Importe Total:</span>
                  <span className="text-xl font-bold">
                    {calculateImporte().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Tributario:</span>
                  <span>
                    - {Number(formData.tributario || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Comisión:</span>
                  <span>
                    - {Number(formData.comision_bancaria || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Gasto Empresa:</span>
                  <span>
                    - {Number(formData.gasto_empresa || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-medium">Neto a Pagar:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {calculateNetoPagar().toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <Label>Observaciones</Label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      observaciones: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full p-2 border rounded resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-2 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!formData.id_cliente || selectedProductos.length === 0) {
                    toast.error(
                      "Seleccione un proveedor y al menos un producto",
                    );
                    return;
                  }
                  createMutation.mutate({
                    ...formData,
                    id_cliente: filtroCliente!,
                  });
                }}
                disabled={
                  createMutation.isPending || selectedProductos.length === 0
                }
              >
                {createMutation.isPending ? "Creando..." : "Crear Liquidación"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedLiquidacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-2xl">
            <div className="px-6 py-2 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Detalle de Liquidación</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedLiquidacion(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Código</p>
                  <p className="font-medium">{selectedLiquidacion.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedLiquidacion.liquidada
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedLiquidacion.liquidada ? "Liquidada" : "Pendiente"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Proveedor</p>
                  <p className="font-medium">
                    {getClienteNombre(selectedLiquidacion.id_cliente)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Anexo</p>
                  <p className="font-medium">
                    {selectedLiquidacion.id_anexo
                      ? getAnexoInfo(selectedLiquidacion.id_anexo)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Emisión</p>
                  <p className="font-medium">
                    {new Date(
                      selectedLiquidacion.fecha_emision,
                    ).toLocaleDateString()}
                  </p>
                </div>
                {selectedLiquidacion.fecha_liquidacion && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha Liquidación</p>
                    <p className="font-medium">
                      {new Date(
                        selectedLiquidacion.fecha_liquidacion,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="font-medium mb-3">Montos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Importe:</span>
                    <span>{selectedLiquidacion.importe?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tributario:</span>
                    <span>
                      - {selectedLiquidacion.tributario?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comisión Bancaria:</span>
                    <span>
                      -{" "}
                      {selectedLiquidacion.comision_bancaria?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gasto Empresa:</span>
                    <span>
                      - {selectedLiquidacion.gasto_empresa?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Neto a Pagar:</span>
                    <span className="text-green-600">
                      {selectedLiquidacion.neto_pagar?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLiquidacion.observaciones && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                  <p>{selectedLiquidacion.observaciones}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-2 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedLiquidacion(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal.isOpen &&
        detailModal.item &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-lime-50 to-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-md bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg">
                      <ScrollText className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Liquidación
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
                      Proveedor
                    </p>
                    <p className="font-bold text-gray-900">
                      {getClienteNombre(detailModal.item.id_cliente)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Anexo
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.id_anexo
                        ? getAnexoInfo(detailModal.item.id_anexo)
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
                    <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                      Importe
                    </p>
                    <p className="font-bold text-green-900 text-xl">
                      {detailModal.item.importe?.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-lime-50 to-green-50 p-4 rounded-md border border-lime-100">
                    <p className="text-xs text-lime-600 uppercase tracking-wider mb-1">
                      Neto a Pagar
                    </p>
                    <p className="font-bold text-lime-900 text-xl">
                      {detailModal.item.neto_pagar?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Estado
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${detailModal.item.liquidada ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {detailModal.item.liquidada ? "Liquidada" : "Pendiente"}
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                      Fecha Emisión
                    </p>
                    <p className="font-bold text-gray-900">
                      {new Date(
                        detailModal.item.fecha_emision,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {(detailModal.item.tributario ||
                  detailModal.item.comision_bancaria ||
                  detailModal.item.gasto_empresa) && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Descuentos
                    </p>
                    <div className="space-y-1 text-sm">
                      {detailModal.item.tributario ? (
                        <div className="flex justify-between">
                          <span>Tributario</span>
                          <span className="text-red-600">
                            -{detailModal.item.tributario?.toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                      {detailModal.item.comision_bancaria ? (
                        <div className="flex justify-between">
                          <span>Comisión Bancaria</span>
                          <span className="text-red-600">
                            -
                            {detailModal.item.comision_bancaria?.toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                      {detailModal.item.gasto_empresa ? (
                        <div className="flex justify-between">
                          <span>Gasto Empresa</span>
                          <span className="text-red-600">
                            -{detailModal.item.gasto_empresa?.toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
                {detailModal.item.observaciones && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Observaciones
                    </p>
                    <p className="text-gray-700">
                      {detailModal.item.observaciones}
                    </p>
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

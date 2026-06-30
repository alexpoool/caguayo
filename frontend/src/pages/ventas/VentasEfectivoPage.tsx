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
  ventasEfectivoService,
  productosService,
  dependenciasService,
  monedaService,
  existenciaService,
} from "../../services/api";
import { useDependenciasFiltradas } from "../../hooks/useDependenciasFiltradas";
import { useStock } from "../../hooks/useStock";
import { authHelpers } from "../../lib/api";
import type { Productos } from "../../types";
import type { Dependencia } from "../../types/dependencia";
import type { VentaEfectivoWithDetails } from "../../types/contrato";
import {
  Plus,
  Save,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  Search,
  Wallet,
  DollarSign,
  Calendar,
  Building,
  Tag,
} from "lucide-react";
import { ProductSelector } from "./facturas/components/ProductSelector";
import toast from "react-hot-toast";
import { required, seleccionValida } from "../../utils/validacionFormularios";
import { Decimal } from "decimal.js";
import { mul, add, toNumber, toFixed } from "../../utils/decimal";
import { DEFAULTS } from "../../config/defaults";

type View = "list" | "form";

export function VentasEfectivoPage() {
  const [view, setView] = useState<View>("list");

  const [ventasEfectivo, setVentasEfectivo] = useState<
    VentaEfectivoWithDetails[]
  >([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const { data: dependencias = [], isLoading: isLoadingDependencias } = useDependenciasFiltradas();
  const [monedas, setMonedas] = useState<any[]>([]);
  const user = authHelpers.getUser() ?? {};
  const currentDependenciaId = user.dependencia?.id_dependencia ?? null;
  const { data: stockData = [] } = useStock({ idDependencia: currentDependenciaId });

  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    stockData.forEach((item: any) => map.set(item.id_producto, item.stock));
    return map;
  }, [stockData]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<
    { id_producto: number; cantidad: number; precio_venta: number; id_moneda?: number; precios?: { id_moneda: number; precio_venta: number }[] }[]
  >([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: VentaEfectivoWithDetails | null;
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
      const r1 = await productosService.getProductos(0, 1000);
      const r2 = await monedaService.getMonedas(0, 100);
      setProductos(r1);
      setMonedas(r2);
    } catch (error) {
      console.error("Error en operación:", error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const loadVentasEfectivo = async () => {
    try {
      const data = await ventasEfectivoService.getVentasEfectivo();
      setVentasEfectivo(data);
    } catch (error) {
      console.error("Error en operación:", error instanceof Error ? error.message : "Error desconocido");
    }
  };

  useEffect(() => {
    if (view === "list") loadVentasEfectivo();
  }, [view]);

  const handleSave = async () => {
    const fieldErrors: string[] = [];
    const slipErr = required(formData.slip, 'Slip');
    if (slipErr) fieldErrors.push(slipErr);
    const cajeroErr = required(formData.cajero, 'Cajero');
    if (cajeroErr) fieldErrors.push(cajeroErr);
    const depErr = seleccionValida(formData.id_dependencia, 'Dependencia');
    if (depErr) fieldErrors.push(depErr);
    if (fieldErrors.length > 0) {
      toast.error(fieldErrors.join('\n• '));
      return;
    }
    try {
      const stockErrors = selectedProducts.filter((p) => {
        const stock = stockMap.get(p.id_producto) ?? 0;
        return p.cantidad > stock;
      });
      if (stockErrors.length > 0) {
        const names = stockErrors.map((p) => {
          const pr = productos.find((pr) => pr.id_producto === p.id_producto);
          return pr?.nombre || `ID ${p.id_producto}`;
        });
        toast.error(`Stock insuficiente para: ${names.join(", ")}`);
        return;
      }

      if (!editingId && selectedProducts.length > 0) {
        const idDependencia = formData.id_dependencia;
        const validacion = await existenciaService.validarMultiple(
          selectedProducts.map((p) => ({
            id_producto: p.id_producto,
            cantidad: p.cantidad,
          })),
          idDependencia ? Number(idDependencia) : undefined
        );
        if (!validacion.valido) {
          const erroresMsg = validacion.errores
            .map((e: any) => `• ${e.mensaje}`)
            .join('\n');
          toast.error(`Stock insuficiente:\n${erroresMsg}`);
          return;
        }
      }

      const data = {
        slip: formData.slip || "",
        fecha: formData.fecha || new Date().toISOString().split("T")[0],
        cajero: formData.cajero || "",
        id_dependencia: Number(formData.id_dependencia) || DEFAULTS.DEPENDENCIA_ID,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        items: selectedProducts.map((p) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : DEFAULTS.MONEDA_ID,
          precios: p.precios?.filter(pr => pr.id_moneda !== (formData.id_moneda ? Number(formData.id_moneda) : DEFAULTS.MONEDA_ID)),
        })),
      };
      editingId
        ? await ventasEfectivoService.updateVentaEfectivo(
            editingId,
            data as any,
          )
        : await ventasEfectivoService.createVentaEfectivo(data as any);
      toast.success(editingId ? "Actualizado" : "Creado");
      setView("list");
      resetForm();
      loadVentasEfectivo();
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const handleDelete = async (id: number, slip: string) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar venta?",
      message: `¿Está seguro de eliminar la venta "${slip}"?`,
      onConfirm: async () => {
        try {
          await ventasEfectivoService.deleteVentaEfectivo(id);
          toast.success("Eliminado");
          loadVentasEfectivo();
        } catch (error: any) {
          toast.error(error.message || "Error");
        }
      },
      type: "danger",
    });
  };

  const productosPorMoneda = useMemo(() => {
    const counts: Record<number, number> = {};
    productos.forEach((p) => {
      if (p.moneda_venta) {
        counts[p.moneda_venta] = (counts[p.moneda_venta] || 0) + 1;
      }
    });
    return counts;
  }, [productos]);

  const resetForm = () => {
    setFormData({});
    setSelectedProducts([]);
    setEditingId(null);
    setProductSearch("");
  };

  const openForm = (item?: VentaEfectivoWithDetails) => {
    if (item) {
      setEditingId(item.id_venta_efectivo);
      setFormData({
        slip: item.slip,
        fecha: item.fecha,
        cajero: item.cajero,
        id_dependencia: item.id_dependencia,
        id_moneda: item.id_moneda || "",
      });
      setSelectedProducts(
        item.items?.map((p: any) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta || 0,
          id_moneda: p.id_moneda,
          precios: p.precios || [],
        })) || [],
      );
    } else {
      resetForm();
    }
    setView("form");
  };

  const addProduct = (id: number) => {
    const producto = productos.find((p) => p.id_producto === id);
    const stock = stockMap.get(id) ?? 0;
    if (stock < 1) {
      toast.error(`"${producto?.nombre}" no tiene stock disponible`);
      return;
    }
    if (!selectedProducts.find((p) => p.id_producto === id)) {
      setSelectedProducts([
        ...selectedProducts,
        {
          id_producto: id,
          cantidad: 1,
          precio_venta: producto ? Number(producto.precio_venta) : 0,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        },
      ]);
    }
  };
  const updateCantidad = (id: number, qty: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id_producto === id ? { ...p, cantidad: qty } : p,
      ),
    );
  };
  const updatePrecioVenta = (id: number, precio: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id_producto === id ? { ...p, precio_venta: precio } : p,
      ),
    );
  };
  const removeProduct = (id: number) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id_producto !== id));
  };
  const calcMonto = (): number => {
    const total = selectedProducts.reduce((acc, p) => {
      return add(acc, mul(p.cantidad, p.precio_venta));
    }, new Decimal(0));
    return toNumber(total);
  };

  const productosPorMonedaSeleccionada = useMemo(() => {
    if (!formData.id_moneda) return productos;
    const monedaId = Number(formData.id_moneda);
    return productos.filter((p) => p.moneda_venta === monedaId);
  }, [productos, formData.id_moneda]);

  const productosFiltrados = useMemo(() => {
    if (!productSearch.trim()) return [];
    const search = productSearch.toLowerCase();
    return productosPorMonedaSeleccionada
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(search) &&
          !selectedProducts.some((sp) => sp.id_producto === p.id_producto),
      )
      .slice(0, 10);
  }, [productosPorMonedaSeleccionada, productSearch, selectedProducts]);

  const filteredVentas = useMemo(() => {
    if (!searchTerm) return ventasEfectivo;
    return ventasEfectivo.filter(
      (v) =>
        v.slip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.cajero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.dependencia?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [ventasEfectivo, searchTerm]);

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">
              Ventas en Efectivo
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredVentas.length === ventasEfectivo.length
                ? `Gestión de ventas (${ventasEfectivo.length} items)`
                : `Mostrando ${filteredVentas.length} de ${ventasEfectivo.length} ventas`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar ventas..."
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
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-teal-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-teal-600" />
                    Slip
                  </div>
                </TableHead>
                <TableHead>Cajero</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Monto
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Fecha
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-teal-600" />
                    Dependencia
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVentas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchTerm
                      ? "No se encontraron ventas que coincidan con la búsqueda"
                      : "No hay ventas en efectivo"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVentas.map((item) => (
                  <TableRow
                    key={item.id_venta_efectivo}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, item })}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                        <Tag className="h-3 w-3" />
                        {item.codigo || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {item.slip}
                      </span>
                    </TableCell>
                    <TableCell>{item.cajero || "N/A"}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.monto).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.fecha}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.dependencia?.nombre || "N/A"}
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
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(item.id_venta_efectivo, item.slip)
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
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingId ? "Editar Venta" : "Nueva Venta en Efectivo"}
            </h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Complete los datos de la venta
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
            <Wallet className="h-5 w-5 text-teal-600" />
            Información de la Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Slip *</Label>
              <Input
                value={formData.slip || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, slip: e.target.value })
                }
                className="mt-1"
                placeholder="Número de slip"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                  value={formData.fecha || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, fecha: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, fecha: new Date().toISOString().split('T')[0] })}
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Cajero</Label>
              <Input
                value={formData.cajero || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, cajero: e.target.value })
                }
                className="mt-1"
                placeholder="Nombre del cajero"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Dependencia</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_dependencia || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_dependencia: e.target.value })
                }
              >
                <option value="">{isLoadingDependencias ? 'Cargando...' : 'Seleccionar dependencia'}</option>
                {!isLoadingDependencias && dependencias.map((d) => (
                  <option key={d.id_dependencia} value={d.id_dependencia}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_moneda || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, id_moneda: e.target.value })
                }
              >
                <option value="">Seleccionar moneda</option>
                {monedas.map((m) => {
                  const count = productosPorMoneda[m.id_moneda] || 0;
                  return (
                    <option key={m.id_moneda} value={m.id_moneda}>
                      {m.nombre} ({m.simbolo}) — {count} prod.
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="mt-6">
            <ProductSelector
              selectedProducts={selectedProducts}
              productSearch={productSearch}
              onProductSearchChange={setProductSearch}
              productosFiltrados={productosFiltrados}
              onAddProduct={(id) => {
                addProduct(id);
                setProductSearch("");
              }}
              onUpdateCantidad={updateCantidad}
              onUpdatePrecio={updatePrecioVenta}
              onRemoveProduct={removeProduct}
              productos={productosPorMonedaSeleccionada}
              total={calcMonto()}
              monedas={monedas}
            />
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
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

      {(detailModal.isOpen &&
        detailModal.item) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                      <Wallet className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Venta en Efectivo
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
                      Slip
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.slip || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
                      Cajero
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.cajero || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                      Fecha
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.fecha || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-md border border-orange-100 col-span-2">
                    <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">
                      Dependencia
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.dependencia?.nombre || "N/A"}
                    </p>
                  </div>
                </div>
                {detailModal.item.items &&
                  detailModal.item.items.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-md border">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Productos ({detailModal.item.items.length})
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-1">Código</th>
                            <th className="pb-1">Producto</th>
                            <th className="pb-1 text-right">Cant.</th>
                            <th className="pb-1 text-right">Precio</th>
                            <th className="pb-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {detailModal.item.items.map((p: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1 text-gray-500 font-mono text-xs">
                                {p.codigo || '-'}
                              </td>
                              <td className="py-1 text-gray-700">
                                {p.producto?.nombre || `Producto ${p.id_producto}`}
                              </td>
                              <td className="py-1 text-right text-gray-500">
                                {p.cantidad}
                              </td>
                              <td className="py-1 text-right text-gray-500">
                                ${Number(p.precio_venta || 0).toFixed(2)}
                              </td>
                              <td className="py-1 text-right font-medium">
                                ${toFixed(mul(Number(p.precio_venta || 0), p.cantidad), 2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-medium">
                            <td colSpan={4} className="pt-2 text-right text-gray-600">Total:</td>
                            <td className="pt-2 text-right text-gray-900">
                              ${toFixed(
                                detailModal.item.items.reduce((acc: Decimal, p: any) => add(acc, mul(Number(p.precio_venta || 0), p.cantidad)), new Decimal(0)),
                                2
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
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

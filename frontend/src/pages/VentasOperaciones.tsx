import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui";
import {
  contratosService,
  suplementosService,
  facturasService,
  ventasEfectivoService,
  clientesService,
  monedaService,
  dependenciasService,
  configuracionService,
} from "../services/api";
import { useDependenciasFiltradas } from "../hooks/useDependenciasFiltradas";
import type { Cliente } from "../types/ventas";
import type { Moneda } from "../types/moneda";
import type { Dependencia } from "../types/dependencia";
import type {
  ContratoWithDetails,
  ContratoCreate,
  SuplementoWithDetails,
  FacturaWithDetails,
  VentaEfectivoWithDetails,
} from "../types/contrato";
import {
  Plus,
  Save,
  Trash2,
  Edit,
  FileText,
  Receipt,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { required, esFechaValida, fechaNoAnterior, seleccionValida } from "../utils/validacionFormularios";


type View = "list" | "form";
type TabType = "contratos" | "suplementos" | "facturas" | "efectivo";

export function VentasOperacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<TabType>(() => {
    const t = searchParams.get("tab");
    if (
      t === "contratos" ||
      t === "suplementos" ||
      t === "facturas" ||
      t === "efectivo"
    )
      return t;
    return "contratos";
  });

  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [suplementos, setSuplementos] = useState<SuplementoWithDetails[]>([]);
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [ventasEfectivo, setVentasEfectivo] = useState<
    VentaEfectivoWithDetails[]
  >([]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const { data: depsFiltradas = [], isLoading: isLoadingDeps } = useDependenciasFiltradas();
  const [estados, setEstados] = useState<{ id_estado_contrato: number; nombre: string }[]>([]);
  const [tiposContrato, setTiposContrato] = useState<
    { id: number; nombre: string }[]
  >([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteRef = useRef<HTMLDivElement | null>(null);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nombre.toLowerCase().includes(term));
  }, [clientes, clienteSearch]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (tab === "contratos") loadContratos();
    else if (tab === "suplementos" && selectedContratoId) loadSuplementos();
    else if (tab === "facturas" && selectedContratoId) loadFacturas();
    else if (tab === "efectivo") loadVentasEfectivo();
  }, [tab, selectedContratoId]);

const loadInitialData = async () => {
    try {
      const [clientesRes, monedasRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100),
      ]);
      setClientes(clientesRes);
      setMonedas(monedasRes);
      const estadosData = await configuracionService.getEstadosContrato();
      setEstados(estadosData);
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

  const loadSuplementos = async () => {
    if (!selectedContratoId) return;
    try {
      const data =
        await suplementosService.getSuplementosByContrato(selectedContratoId);
      setSuplementos(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadFacturas = async () => {
    if (!selectedContratoId) return;
    try {
      const data =
        await facturasService.getFacturasByContrato(selectedContratoId);
      setFacturas(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadVentasEfectivo = async () => {
    try {
      const data = await ventasEfectivoService.getVentasEfectivo();
      setVentasEfectivo(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSave = async () => {
    const fieldErrors: string[] = [];
    if (tab === "contratos") {
      const nombreErr = required(formData.nombre, "Nombre");
      if (nombreErr) fieldErrors.push(nombreErr);
      const clienteErr = seleccionValida(formData.id_cliente, "Cliente");
      if (clienteErr) fieldErrors.push(clienteErr);
      const fechaErr = esFechaValida(formData.fecha, "Fecha");
      if (fechaErr) fieldErrors.push(fechaErr);
      const vigenciaErr = esFechaValida(formData.vigencia, "Vigencia");
      if (vigenciaErr) fieldErrors.push(vigenciaErr);
      if (!fechaErr && !vigenciaErr) {
        const vigCompare = fechaNoAnterior(formData.vigencia, formData.fecha, "Vigencia");
        if (vigCompare) fieldErrors.push(vigCompare);
      }
    } else if (tab === "suplementos") {
      if (!selectedContratoId) fieldErrors.push("Debe seleccionar un contrato");
      const nombreErr = required(formData.nombre, "Nombre");
      if (nombreErr) fieldErrors.push(nombreErr);
    } else if (tab === "facturas") {
      if (!selectedContratoId) fieldErrors.push("Debe seleccionar un contrato");
    } else if (tab === "efectivo") {
      const slipErr = required(formData.slip, "Slip");
      if (slipErr) fieldErrors.push(slipErr);
      const cajeroErr = required(formData.cajero, "Cajero");
      if (cajeroErr) fieldErrors.push(cajeroErr);
      const depErr = seleccionValida(formData.id_dependencia, "Dependencia");
      if (depErr) fieldErrors.push(depErr);
    }
    if (fieldErrors.length > 0) {
      toast.error(fieldErrors.join('\n• '));
      return;
    }
    try {
      if (tab === "contratos") {
        const data: ContratoCreate = {
          nombre: formData.nombre || "",
          id_cliente: Number(formData.id_cliente) || 0,
          id_estado: Number(formData.id_estado) || (estados[0]?.id_estado_contrato ?? 0),
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
      } else if (tab === "suplementos") {
        const data = {
          id_contrato: selectedContratoId!,
          nombre: formData.nombre || "",
          fecha: formData.fecha || new Date().toISOString().split("T")[0],
          documento: formData.documento,
        };
        editingId
          ? await suplementosService.updateSuplemento(editingId, data as any)
          : await suplementosService.createSuplemento(data as any);
        toast.success(editingId ? "Actualizado" : "Creado");
      } else if (tab === "facturas") {
        const data = {
          id_contrato: selectedContratoId!,
          fecha: formData.fecha || new Date().toISOString().split("T")[0],
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          pago_actual: Number(formData.pago_actual) || 0,
        };
        editingId
          ? await facturasService.updateFactura(editingId, data as any)
          : await facturasService.createFactura(data as any);
        toast.success(editingId ? "Actualizado" : "Creado");
      } else if (tab === "efectivo") {
        const data = {
          slip: formData.slip || "",
          fecha: formData.fecha || new Date().toISOString().split("T")[0],
          cajero: formData.cajero || "",
          id_dependencia: Number(formData.id_dependencia) || 1,
        };
        editingId
          ? await ventasEfectivoService.updateVentaEfectivo(
              editingId,
              data as any,
            )
          : await ventasEfectivoService.createVentaEfectivo(data as any);
        toast.success(editingId ? "Actualizado" : "Creado");
      }
      setView("list");
      resetForm();
      if (tab === "contratos") loadContratos();
      else if (tab === "suplementos") loadSuplementos();
      else if (tab === "facturas") loadFacturas();
      else loadVentasEfectivo();
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar?")) return;
    try {
      if (tab === "contratos") {
        await contratosService.deleteContrato(id);
        loadContratos();
      } else if (tab === "suplementos") {
        await suplementosService.deleteSuplemento(id);
        loadSuplementos();
      } else if (tab === "facturas") {
        await facturasService.deleteFactura(id);
        loadFacturas();
      } else {
        await ventasEfectivoService.deleteVentaEfectivo(id);
        loadVentasEfectivo();
      }
      toast.success("Eliminado");
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const resetForm = () => {
    setFormData({ fecha: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(
        item.id_contrato ||
          item.id_suplemento ||
          item.id_factura ||
          item.id_venta_efectivo,
      );
      if (tab === "contratos")
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
      else if (tab === "suplementos")
        setFormData({
          nombre: item.nombre,
          id_estado: item.id_estado,
          fecha: item.fecha,
          documento: item.documento,
        });
      else if (tab === "facturas")
        setFormData({
          codigo_factura: item.codigo_factura,
          descripcion: item.descripcion,
          observaciones: item.observaciones,
          fecha: item.fecha,
          pago_actual: item.pago_actual,
        });
      else
        setFormData({
          slip: item.slip,
          fecha: item.fecha,
          id_dependencia: item.id_dependencia,
          cajero: item.cajero,
        });
    } else {
      resetForm();
    }
    setView("form");
  };

  const renderTabs = () => (
    <div className="flex gap-2 mb-6">
      <Button
        variant={tab === "contratos" ? "primary" : "outline"}
        onClick={() => {
          setTab("contratos");
          setSelectedContratoId(null);
          setSearchParams({ tab: "contratos" });
        }}
      >
        <FileText className="w-4 h-4 mr-2" />
        Contratos
      </Button>
      <Button
        variant={tab === "suplementos" ? "primary" : "outline"}
        onClick={() => {
          setTab("suplementos");
          setSearchParams({ tab: "suplementos" });
        }}
        disabled={!selectedContratoId && tab !== "suplementos"}
      >
        <FileText className="w-4 h-4 mr-2" />
        Suplementos
      </Button>
      <Button
        variant={tab === "facturas" ? "primary" : "outline"}
        onClick={() => {
          setTab("facturas");
          setSearchParams({ tab: "facturas" });
        }}
        disabled={!selectedContratoId && tab !== "facturas"}
      >
        <Receipt className="w-4 h-4 mr-2" />
        Facturas
      </Button>
      <Button
        variant={tab === "efectivo" ? "primary" : "outline"}
        onClick={() => {
          setTab("efectivo");
          setSelectedContratoId(null);
          setSearchParams({ tab: "efectivo" });
        }}
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Efectivo
      </Button>
    </div>
  );

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {tab === "contratos"
            ? "Contratos"
            : tab === "suplementos"
              ? "Suplementos"
              : tab === "facturas"
                ? "Facturas"
                : "Ventas en Efectivo"}
        </h2>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      </div>
      {(tab === "contratos"
        ? contratos
        : tab === "suplementos"
          ? suplementos
          : tab === "facturas"
            ? facturas
            : ventasEfectivo
      ).length === 0 ? (
        <p className="text-gray-500">No hay datos.</p>
      ) : (
        <div className="grid gap-4">
          {(tab === "contratos"
            ? contratos
            : tab === "suplementos"
              ? suplementos
              : tab === "facturas"
                ? facturas
                : ventasEfectivo
          ).map((item: any) => (
            <Card
              key={
                item.id_contrato ||
                item.id_suplemento ||
                item.id_factura ||
                item.id_venta_efectivo
              }
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    {tab === "contratos" && (
                      <>
                        <h3 className="font-semibold text-lg">{item.nombre}</h3>
                        <p className="text-sm">
                          Cliente: {item.cliente?.nombre} | Monto: $
                          {Number(item.monto).toFixed(2)} | Estado:{" "}
                          {item.estado?.nombre}
                        </p>
                      </>
                    )}
                    {tab === "suplementos" && (
                      <>
                        <h3 className="font-semibold text-lg">{item.nombre}</h3>
                        <p className="text-sm">
                          Monto: ${Number(item.monto).toFixed(2)} | Estado:{" "}
                          {item.estado?.nombre}
                        </p>
                      </>
                    )}
                    {tab === "facturas" && (
                      <>
                        <h3 className="font-semibold text-lg">
                          {item.codigo_factura}
                        </h3>
                        <p className="text-sm">
                          Monto: ${Number(item.monto).toFixed(2)} | Pago: $
                          {Number(item.pago_actual).toFixed(2)}
                        </p>
                      </>
                    )}
                    {tab === "efectivo" && (
                      <>
                        <h3 className="font-semibold text-lg">
                          Slip: {item.slip}
                        </h3>
                        <p className="text-sm">
                          Cajero: {item.cajero} | Monto: $
                          {Number(item.monto).toFixed(2)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openForm(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDelete(
                          item.id_contrato ||
                            item.id_suplemento ||
                            item.id_factura ||
                            item.id_venta_efectivo,
                        )
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {tab === "contratos" && (
                  <Button
                    variant="ghost"
                    className="mt-2 p-0 text-blue-600"
                    onClick={() => {
                      setSelectedContratoId(item.id_contrato);
                      setTab("suplementos");
                    }}
                  >
                    Ver Suplementos/Facturas
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {editingId ? "Editar" : "Nuevo"}{" "}
          {tab === "contratos"
            ? "Contrato"
            : tab === "suplementos"
              ? "Suplemento"
              : tab === "facturas"
                ? "Factura"
                : "Venta en Efectivo"}
        </h2>
        <Button variant="outline" onClick={() => { setView("list"); resetForm(); }} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            {editingId ? "Editar" : "Nuevo"}{" "}
            {tab === "contratos"
              ? "Contrato"
              : tab === "suplementos"
                ? "Suplemento"
                : tab === "facturas"
                  ? "Factura"
                  : "Venta en Efectivo"}
          </CardTitle>
        </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6">
          {tab === "contratos" && (
            <>
              <div ref={clienteRef} className="relative">
                <Label className="text-sm font-medium">Cliente</Label>
                <Input
                  value={
                    formData.id_cliente
                      ? (clientes.find(c => c.id_cliente === Number(formData.id_cliente))?.nombre || '')
                      : clienteSearch
                  }
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setFormData({ ...formData, id_cliente: '' });
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  placeholder="Buscar cliente..."
                  className="mt-1"
                />
                {showClienteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClientes.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No se encontraron clientes</div>
                    ) : (
                      filteredClientes.map(c => (
                        <button
                          key={c.id_cliente}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 transition-colors"
                          onClick={() => {
                            setFormData({ ...formData, id_cliente: c.id_cliente });
                            setClienteSearch('');
                            setShowClienteDropdown(false);
                          }}
                        >
                          {c.nombre}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Nombre</Label>
                <Input
                  value={formData.nombre || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Proforma</Label>
                <Input
                  value={formData.proforma || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, proforma: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.id_estado || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, id_estado: e.target.value })
                    }
                  >
                    {estados.map((e) => (
                      <option key={e.id_estado_contrato} value={e.id_estado_contrato}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.id_tipo_contrato || ""}
                    onChange={(e: any) =>
                      setFormData({
                        ...formData,
                        id_tipo_contrato: e.target.value,
                      })
                    }
                  >
                    {tiposContrato.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
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
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Moneda</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.id_moneda || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, id_moneda: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
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
                    setFormData({
                      ...formData,
                      documento_final: e.target.value,
                    })
                  }
                />
              </div>
            </>
          )}
          {tab === "suplementos" && (
            <>
              <div>
                <Label className="text-sm font-medium">Nombre</Label>
                <Input
                  value={formData.nombre || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, fecha: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Documento</Label>
                <Input
                  value={formData.documento || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, documento: e.target.value })
                  }
                />
              </div>
            </>
          )}
          {tab === "facturas" && (
            <>
              <div>
                <Label className="text-sm font-medium">Descripción</Label>
                <Input
                  value={formData.descripcion || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Observaciones</Label>
                <Input
                  value={formData.observaciones || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Pago Actual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pago_actual || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, pago_actual: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
          {tab === "efectivo" && (
            <>
              <div>
                <Label className="text-sm font-medium">Slip</Label>
                <Input
                  value={formData.slip || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, slip: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cajero</Label>
                  <Input
                    value={formData.cajero || ""}
                    onChange={(e: any) =>
                      setFormData({ ...formData, cajero: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Dependencia</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.id_dependencia || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, id_dependencia: e.target.value })
                  }
                >
                  <option value="">{isLoadingDeps ? 'Cargando...' : 'Seleccionar'}</option>
                  {!isLoadingDeps && depsFiltradas.map((d) => (
                    <option key={d.id_dependencia} value={d.id_dependencia}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex gap-2 mt-8 pt-6 border-t">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
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
        </div>
      </CardContent>
    </Card>
    </>
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Ventas - Operaciones</h1>
      {renderTabs()}
      {view === "list" && renderList()}
      {view === "form" && renderForm()}
    </div>
  );
}

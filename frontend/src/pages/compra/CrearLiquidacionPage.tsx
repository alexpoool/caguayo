import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import {
  clientesService,
  anexosService,
  monedaService,
  liquidacionService,
} from "../../services/api";
import type {
  Cliente,
  Anexo,
  Moneda,
  LiquidacionCreate,
} from "../../services/api";
import { Plus, Save, ArrowLeft, CheckCircle, Package } from "lucide-react";
import toast from "react-hot-toast";

export function CrearLiquidacionPage() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [itemsAnexo, setItemsAnexo] = useState<any[]>([]);

  const [filtroCliente, setFiltroCliente] = useState<number | null>(null);
  const [filtroAnexo, setFiltroAnexo] = useState<number | null>(null);
  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);

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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (filtroCliente) {
      loadItemsAnexo();
    } else {
      setItemsAnexo([]);
    }
  }, [filtroCliente, filtroAnexo]);

  const loadInitialData = async () => {
    try {
      const [clientesData, anexosData, monedasData] = await Promise.all([
        clientesService.getClientes(0, 1000),
        anexosService.getAnexos(undefined, undefined, 0, 1000),
        monedaService.getMonedas(),
      ]);

      setClientes(clientesData);
      setAnexos(anexosData);
      setMonedas(monedasData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const anexosFiltrados = useMemo(() => {
    if (!filtroCliente) return anexos;
    // Filtrar anexos cuyo convenio pertenezca al cliente seleccionado
    return anexos.filter((a) => {
      const convenio = (a as any).convenios;
      return convenio && convenio.id_cliente === filtroCliente;
    });
  }, [anexos, filtroCliente]);

  const loadItemsAnexo = async () => {
    if (!filtroCliente) return;

    setIsLoadingProductos(true);
    try {
      const data = await liquidacionService.getItemsAnexoConEstado(
        filtroCliente,
        filtroAnexo || undefined,
      );
      setItemsAnexo(data);
      setSelectedProductos([]);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setIsLoadingProductos(false);
    }
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
    const vendidos = itemsAnexo.filter(
      (item: any) =>
        item.estado === "VENDIDO" && item.id_producto_en_liquidacion,
    );
    const allIds = vendidos.map((item: any) => item.id_producto_en_liquidacion);
    setSelectedProductos(allIds);
    setFormData((prev) => ({ ...prev, producto_ids: allIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData((prev) => ({ ...prev, producto_ids: [] }));
  };

  const calculateImporte = () => {
    return itemsAnexo
      .filter(
        (item: any) =>
          item.estado === "VENDIDO" &&
          selectedProductos.includes(item.id_producto_en_liquidacion),
      )
      .reduce((sum: number, item: any) => {
        return sum + item.precio_venta * item.cantidad;
      }, 0);
  };

  const calculateNetoPagar = () => {
    const importe = calculateImporte();
    const tributario = Number(formData.tributario) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    const gasto = Number(formData.gasto_empresa) || 0;
    return importe - tributario - comision - gasto;
  };

  const handleSave = async () => {
    if (!filtroCliente) {
      toast.error("Seleccione un proveedor");
      return;
    }

    if (selectedProductos.length === 0) {
      toast.error("Seleccione al menos un producto");
      return;
    }

    setIsLoading(true);
    try {
      const dataToSend = {
        ...formData,
        id_cliente: filtroCliente,
        producto_ids: selectedProductos,
      };

      await liquidacionService.createLiquidacion(dataToSend);
      toast.success("Liquidación creada correctamente");
      navigate("/compra/liquidaciones");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(
        error?.response?.data?.detail || "Error al crear liquidación",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || "";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/compra/liquidaciones")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Liquidaciones
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Proveedor *</Label>
              <select
                className="w-full p-2 border rounded"
                value={filtroCliente || ""}
                onChange={(e: any) =>
                  handleClienteChange(Number(e.target.value))
                }
              >
                <option value="">Seleccionar proveedor</option>
                {clientes.map((cliente: Cliente) => (
                  <option key={cliente.id_cliente} value={cliente.id_cliente}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Anexo</Label>
              <select
                className="w-full p-2 border rounded"
                value={filtroAnexo || ""}
                onChange={(e: any) =>
                  handleAnexoChange(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                disabled={!filtroCliente}
              >
                <option value="">Todos los anexos</option>
                {anexosFiltrados.map((anexo: Anexo) => (
                  <option key={anexo.id_anexo} value={anexo.id_anexo}>
                    {anexo.nombre_anexo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Moneda *</Label>
              <select
                className="w-full p-2 border rounded"
                value={formData.id_moneda}
                onChange={(e: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    id_moneda: Number(e.target.value),
                  }))
                }
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
                className="w-full p-2 border rounded"
                value={formData.tipo_pago}
                onChange={(e: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo_pago: e.target.value,
                  }))
                }
              >
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          {filtroCliente && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base">Productos Pendientes</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>

              {isLoadingProductos ? (
                <p className="text-gray-500 py-2">Cargando productos...</p>
              ) : itemsAnexo.length === 0 ? (
                <p className="text-gray-500 py-2">
                  No hay productos en los anexos de este proveedor
                </p>
              ) : (
                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left">Anexo</th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2 text-right">Precio Venta</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {itemsAnexo.map((item: any) => {
                        const isVendido = item.estado === "VENDIDO";
                        const isLiquidado = item.estado === "LIQUIDADO";
                        const isSelected =
                          isVendido &&
                          item.id_producto_en_liquidacion &&
                          selectedProductos.includes(
                            item.id_producto_en_liquidacion,
                          );
                        return (
                          <tr
                            key={item.id_item_anexo}
                            className={`hover:bg-gray-50 ${!isVendido ? "opacity-60" : ""}`}
                          >
                            <td className="px-3 py-2">
                              {isVendido && item.id_producto_en_liquidacion ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleProductoSelect(
                                      item.id_producto_en_liquidacion,
                                    )
                                  }
                                  className="rounded"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.nombre_anexo}
                            </td>
                            <td className="px-3 py-2">
                              {item.producto_nombre ||
                                `Producto ${item.id_producto}`}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {item.cantidad}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ${Number(item.precio_venta).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              ${(item.precio_venta * item.cantidad).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isLiquidado
                                    ? "bg-green-100 text-green-800"
                                    : isVendido
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-50 text-gray-600"
                                }`}
                              >
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4 mt-6">
            <div>
              <Label>Tributario (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tributario}
                onChange={(e: any) =>
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
                onChange={(e: any) =>
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
                onChange={(e: any) =>
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
                onChange={(e: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    devengado: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Importe Total:</span>
              <span className="text-xl font-bold">
                {calculateImporte().toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Tributario:</span>
              <span>- {Number(formData.tributario || 0).toLocaleString()}</span>
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

          <div className="mt-6">
            <Label>Observaciones</Label>
            <textarea
              value={formData.observaciones}
              onChange={(e: any) =>
                setFormData((prev) => ({
                  ...prev,
                  observaciones: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Guardando..." : "Guardar Liquidación"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/compra/liquidaciones")}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

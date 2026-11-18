import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { CasosUsoInventario } from '../application/casos-uso';
import type { RecepcionStock } from '../domain/inventario';
import { Button, Input, MobileRecordCard } from "@/shared/ui/components";
import { coincideBusqueda, normalizarBusqueda } from "@/shared/ui/utils/busqueda";
import {
  ArrowLeft,
  Search,
  Package,
  Building,
  Truck,
  FileText,
  Hash,
} from "lucide-react";

export function RecepcionesPage({
  casosUso,
}: {
  casosUso: CasosUsoInventario;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const { data: recepciones = [], isLoading } = useQuery({
    queryKey: ["recepciones-stock"],
    queryFn: () => casosUso.listarRecepcionesStock(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const filteredRecepciones = useMemo(() => {
    const termino = normalizarBusqueda(deferredSearchTerm).trim();
    if (!termino) return recepciones;
    return recepciones.filter(
      (r: RecepcionStock) =>
        coincideBusqueda(r.nombre_producto, termino) ||
        coincideBusqueda(r.proveedor_nombre, termino) ||
        coincideBusqueda(r.nombre_dependencia, termino) ||
        coincideBusqueda(r.convenio_nombre, termino) ||
        coincideBusqueda(r.anexo_nombre, termino) ||
        coincideBusqueda(r.codigo, termino),
    );
  }, [recepciones, deferredSearchTerm]);

  const handleSelectRecepcion = (recepcion: RecepcionStock) => {
    const returnTo = location.state?.returnTo || "/movimientos/ajuste";
    navigate(returnTo, {
      state: {
        recepcionSeleccionada: recepcion,
        from: "/movimientos/seleccionar-recepcion",
      },
    });
  };

  const handleGoBack = () => {
    const returnTo = location.state?.returnTo || "/movimientos/ajuste";
    navigate(returnTo);
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-800">
              Seleccionar Recepción
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Elige una recepción para crear un ajuste
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por código, producto, proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 text-lg"
          />
        </div>
      </div>

      {/* Listado móvil: tarjetas en lugar de la tabla ancha */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-12 text-gray-500">
            <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
            Cargando recepciones...
          </div>
        ) : filteredRecepciones.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
            {searchTerm
              ? "No se encontraron recepciones"
              : "No hay recepciones disponibles"}
          </div>
        ) : (
          filteredRecepciones.map((recepcion: RecepcionStock) => (
            <MobileRecordCard
              key={recepcion.id_movimiento}
              title={recepcion.nombre_producto}
              subtitle={recepcion.codigo || `Movimiento #${recepcion.id_movimiento}`}
              icon={<Package className="h-4 w-4" />}
              badges={
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                  {recepcion.cantidad}
                </span>
              }
              fields={[
                {
                  label: "Proveedor",
                  value: recepcion.proveedor_nombre || "Sin proveedor",
                },
                {
                  label: "Dependencia",
                  value: recepcion.nombre_dependencia,
                },
                {
                  label: "Convenio / Anexo",
                  value:
                    [recepcion.convenio_nombre, recepcion.anexo_nombre]
                      .filter(Boolean)
                      .join(" · ") || "-",
                },
              ]}
              onOpen={() => handleSelectRecepcion(recepcion)}
              openLabel={`Seleccionar recepción de ${recepcion.nombre_producto}`}
              actions={
                <Button size="sm" onClick={() => handleSelectRecepcion(recepcion)}>
                  Seleccionar
                </Button>
              }
            />
          ))
        )}
      </div>

      {/* Tabla de Recepciones (desde md) */}
      <div className="hidden overflow-hidden rounded-md bg-white shadow-md md:block">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Código
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Producto
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Cantidad
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Proveedor
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Convenio / Anexo
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Dependencia
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                      Cargando recepciones...
                    </div>
                  </td>
                </tr>
              ) : filteredRecepciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "No se encontraron recepciones"
                      : "No hay recepciones disponibles"}
                  </td>
                </tr>
              ) : (
                filteredRecepciones.map((recepcion: RecepcionStock) => (
                  <tr
                    key={recepcion.id_movimiento}
                    className="hover:bg-brand-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRecepcion(recepcion)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {recepcion.codigo || recepcion.id_movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-brand-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {recepcion.nombre_producto}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                        {recepcion.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {recepcion.proveedor_nombre || "Sin proveedor"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        {recepcion.convenio_nombre && (
                          <span className="text-sm text-gray-900">
                            {recepcion.convenio_nombre}
                          </span>
                        )}
                        {recepcion.anexo_nombre && (
                          <span className="text-xs text-gray-500">
                            {recepcion.anexo_nombre} ({recepcion.anexo_numero})
                          </span>
                        )}
                        {!recepcion.convenio_nombre &&
                          !recepcion.anexo_nombre && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {recepcion.nombre_dependencia}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Search,
  ScrollText,
  DollarSign,
  CreditCard,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  CreateButton,
} from "../../../../components/ui";
import { ClienteDetailModal } from "../modals/ClienteDetailModal";
import type { Cliente, TipoEntidad } from "../../../../types/ventas";
import type { FiltroTipoPersona } from "../../hooks/useClientesLogic";

export interface ClientesListProps {
  clientes: Cliente[];
  totalClientes: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroTipo: FiltroTipoPersona;
  setFiltroTipo: (filtro: FiltroTipoPersona) => void;
  isProveedorView: boolean;
  onNew: () => void;
  handleEdit: (cliente: Cliente) => void;
  handleDelete: (cliente: Cliente) => void;
  loadMoreRef?: RefObject<HTMLDivElement>;
  isFetchingMore?: boolean;
  isLoading?: boolean;
  tiposEntidad?: TipoEntidad[];
}

export function ClientesList({
  clientes,
  totalClientes,
  searchTerm,
  setSearchTerm,
  filtroTipo,
  setFiltroTipo,
  isProveedorView,
  onNew,
  handleEdit,
  handleDelete,
  loadMoreRef,
  isFetchingMore,
  isLoading,
  tiposEntidad = [],
}: ClientesListProps) {
  const navigate = useNavigate();
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    cliente: Cliente | null;
  }>({
    isOpen: false,
    cliente: null,
  });

  // Para personas jurídicas se muestra el tipo de entidad (empresa, cooperativa,
  // etc.) en lugar de la etiqueta genérica "JURIDICA".
  const getTipoLabel = (cliente: Cliente): string => {
    if (cliente.tipo_persona === "JURIDICA") {
      const idTipoEntidad = cliente.cliente_juridica?.id_tipo_entidad;
      const tipoEntidad = tiposEntidad.find(
        (t) => t.id_tipo_entidad === idTipoEntidad,
      );
      if (tipoEntidad?.nombre) return tipoEntidad.nombre;
    }
    return cliente.tipo_persona || "NATURAL";
  };

  const hayFiltros = searchTerm.trim() !== "" || filtroTipo !== "TODOS";

  const limpiarFiltros = () => {
    setSearchTerm("");
    setFiltroTipo("TODOS");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-brand-500 to-brand-600 rounded shadow-lg animate-bounce-subtle">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">
              {isProveedorView ? "Proveedores" : "Clientes"}
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {clientes.length === totalClientes
                ? `Gestión de ${isProveedorView ? "proveedores" : "clientes"} (${totalClientes} items)`
                : `Mostrando ${clientes.length} de ${totalClientes} ${isProveedorView ? "proveedores" : "clientes"}`}
            </p>
          </div>
        </div>
        <CreateButton
          label={isProveedorView ? "Nuevo Proveedor" : "Nuevo Cliente"}
          onClick={onNew}
          className="shadow-lg hover:shadow-xl"
        />
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Filtros
              </span>
            </div>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={`Buscar ${isProveedorView ? "proveedores" : "clientes"} por nombre, código o NIT/CI...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 border-gray-200 bg-gray-50 pl-10 pr-10 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="relative w-full md:w-64">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
              <Select
                value={filtroTipo}
                onChange={(e) =>
                  setFiltroTipo(e.target.value as FiltroTipoPersona)
                }
                aria-label="Filtrar por tipo de persona"
                title="Filtrar por tipo de persona"
                className="h-10 cursor-pointer appearance-none !border-gray-200 bg-gray-50 !pl-9 !pr-9 text-sm font-medium text-gray-700 hover:!border-brand-300 focus:bg-white"
              >
                <option value="TODOS">Todos los tipos</option>
                <optgroup label="Tipo de persona">
                  <option value="NATURAL">Creador</option>
                  <option value="TCP">TCP</option>
                  <option value="JURIDICA">Entidades</option>
                </optgroup>
                {tiposEntidad.length > 0 && (
                  <optgroup label="Tipo de entidades">
                    {tiposEntidad.map((tipo) => (
                      <option
                        key={tipo.id_tipo_entidad}
                        value={`ENTIDAD:${tipo.id_tipo_entidad}`}
                      >
                        {tipo.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-brand-50 to-brand-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cuentas</TableHead>
                <TableHead>
                  {isProveedorView ? "Convenios" : "Contratos"}
                </TableHead>
                {isProveedorView && <TableHead>Liquidaciones</TableHead>}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={isProveedorView ? 7 : 6}
                    className="text-center py-12 text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                      Cargando {isProveedorView ? "proveedores" : "clientes"}...
                    </div>
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isProveedorView ? 7 : 6}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchTerm || filtroTipo !== "TODOS"
                      ? `No se encontraron ${isProveedorView ? "proveedores" : "clientes"} que coincidan con la búsqueda`
                      : isProveedorView
                        ? "No hay proveedores registrados"
                        : "No hay clientes registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow
                    key={cliente.id_cliente}
                    className={`transition-colors cursor-pointer border-l-4 ${
                      cliente.valido === false
                        ? "bg-amber-50/70 border-l-amber-500 hover:bg-amber-100/70"
                        : "border-l-transparent hover:bg-gray-50/50"
                    }`}
                    onClick={() => setDetailModal({ isOpen: true, cliente })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                          <User className="h-4 w-4" />
                        </div>
                        {cliente.valido === false && (
                          <span
                            title={cliente.razon || undefined}
                            className="text-amber-500 shrink-0 cursor-help"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        )}
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {cliente.nombre || "(Sin nombre)"}
                          </span>
                          {cliente.valido === false && (
                            <span className="text-xs text-amber-700">
                              CI/NIT: {cliente.nit}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {cliente.codigo || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cliente.tipo_persona === "NATURAL"
                            ? "bg-brand-100 text-brand-800"
                            : cliente.tipo_persona === "JURIDICA"
                              ? "bg-brand-100 text-brand-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {getTipoLabel(cliente)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            isProveedorView
                              ? `/compra/cuentas?proveedor=${cliente.id_cliente}`
                              : `/ventas/cuentas?cliente=${cliente.id_cliente}`,
                          )
                        }
                        className="gap-1 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Cuentas
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isProveedorView
                            ? navigate(
                                `/compra/convenios?proveedor=${cliente.id_cliente}`,
                              )
                            : navigate(
                                `/ventas/contratos?cliente=${cliente.id_cliente}`,
                              )
                        }
                        className={`gap-1 ${
                          isProveedorView
                            ? "text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            : "text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        {isProveedorView ? "Convenio" : "Contrato"}
                      </Button>
                    </TableCell>
                    {isProveedorView && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/compra/liquidaciones?proveedor=${cliente.id_cliente}`,
                            )
                          }
                          className="gap-1 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Liquidación
                        </Button>
                      </TableCell>
                    )}
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cliente)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cliente)}
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
        {/* Elemento para scroll infinito */}
        {loadMoreRef && (
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {isFetchingMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Cargando más clientes...</span>
              </div>
            )}
          </div>
        )}
      </Card>

      <ClienteDetailModal
        isOpen={detailModal.isOpen}
        cliente={detailModal.cliente}
        onClose={() => setDetailModal({ isOpen: false, cliente: null })}
        tiposEntidad={tiposEntidad}
      />
    </div>
  );
}

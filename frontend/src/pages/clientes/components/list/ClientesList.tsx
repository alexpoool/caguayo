import { useState, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Plus,
  Search,
  ScrollText,
  DollarSign,
  CreditCard,
  Edit,
  Trash2,
  Loader2,
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
} from "../../../../components/ui";
import { ClienteDetailModal } from "../modals/ClienteDetailModal";
import type { Cliente, TipoEntidad } from "../../../../types/ventas";

export interface ClientesListProps {
  filteredClientes: Cliente[];
  totalClientes: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isProveedorView: boolean;
  onNew: () => void;
  handleEdit: (cliente: Cliente) => void;
  handleDelete: (cliente: Cliente) => void;
  loadMoreRef?: RefObject<HTMLDivElement>;
  isFetchingMore?: boolean;
  tiposEntidad?: TipoEntidad[];
}

export function ClientesList({
  filteredClientes,
  totalClientes,
  searchTerm,
  setSearchTerm,
  isProveedorView,
  onNew,
  handleEdit,
  handleDelete,
  loadMoreRef,
  isFetchingMore,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">
              {isProveedorView ? "Proveedores" : "Clientes"}
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredClientes.length === totalClientes
                ? `Gestión de clientes (${totalClientes} items)`
                : `Mostrando ${filteredClientes.length} de ${totalClientes} clientes`}
            </p>
          </div>
        </div>
        <Button
          onClick={onNew}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          {isProveedorView ? "Nuevo Proveedor" : "Nuevo Cliente"}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de clientes */}
      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
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
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isProveedorView ? 7 : 6}
                    className="text-center py-12 text-gray-500"
                  >
                    {isProveedorView
                      ? "No hay proveedores registrados"
                      : "No hay clientes registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow
                    key={cliente.id_cliente}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, cliente })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {cliente.nombre || "(Sin nombre)"}
                          </span>

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
                            ? "bg-blue-100 text-blue-800"
                            : cliente.tipo_persona === "JURIDICA"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {cliente.tipo_persona || "NATURAL"}
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
                        className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
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
                            ? "text-sky-600 border-sky-200 hover:bg-sky-50 hover:text-sky-700"
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
                              `/compra/productos-liquidacion?proveedor=${cliente.id_cliente}`,
                            )
                          }
                          className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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

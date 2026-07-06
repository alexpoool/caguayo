import { useMemo } from "react";
import {
  Plus,
  Layers,
  Tag,
  FileText,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
} from "../../components/ui";
import type {
  SuplementoWithDetails,
  ContratoWithDetails,
} from "../../types/contrato";
import React from "react";

interface SuplementosListProps {
  suplementos: SuplementoWithDetails[];
  isLoading: boolean;
  isFetchingMore: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  setSelectedContratoId: (id: number | null) => void;
  openForm: (item?: SuplementoWithDetails) => void;
  handleDelete: (id: number, nombre: string) => void;
}

export const SuplementosList: React.FC<SuplementosListProps> = ({
  suplementos,
  isLoading,
  isFetchingMore,
  isError,
  error,
  hasMore,
  loadMore,
  loadMoreRef,
  searchTerm,
  setSearchTerm,
  contratos,
  selectedContratoId,
  setSelectedContratoId,
  openForm,
  handleDelete,
}) => {
  const filteredSuplementos = useMemo(() => {
    if (!searchTerm) return suplementos;
    const term = searchTerm.toLowerCase();
    return suplementos.filter(
      (s) =>
        s.codigo?.toLowerCase().includes(term) ||
        s.nombre?.toLowerCase().includes(term)
    );
  }, [suplementos, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Suplementos</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Gestión de suplementos por contrato
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            value={selectedContratoId || ""}
            onChange={(e: any) =>
              setSelectedContratoId(Number(e.target.value) || null)
            }
          >
            <option value="">Seleccionar Contrato</option>
            {contratos.map((c) => (
              <option key={c.id_contrato} value={c.id_contrato}>
                {c.nombre}
              </option>
            ))}
          </select>
          <Button
            onClick={() => openForm()}
            disabled={!selectedContratoId}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
          >
            <Plus className="h-4 w-4" />
            Nuevo Suplemento
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {!selectedContratoId ? (
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    Seleccione un contrato para ver sus suplementos.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
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
                      <FileText className="h-4 w-4 text-teal-600" />
                      Nombre
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-teal-600" />
                      Monto
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        Cargando suplementos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-red-500"
                    >
                      Error al cargar suplementos:{" "}
                      {(error as Error)?.message || "Error desconocido"}
                    </TableCell>
                  </TableRow>
                ) : filteredSuplementos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-gray-500"
                    >
                      {searchTerm
                        ? "No se encontraron suplementos que coincidan con la búsqueda"
                        : "No hay suplementos para este contrato"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuplementos.map((item) => (
                    <TableRow
                      key={item.id_suplemento}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => openForm(item)}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                          <Tag className="h-3 w-3" />
                          {item.codigo || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          {item.nombre}
                        </span>
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
                      <TableCell className="text-gray-500">
                        {item.fecha}
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
                              handleDelete(item.id_suplemento, item.nombre)
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
          {/* Sentinel para infinite scroll */}
          {!isLoading && filteredSuplementos.length > 0 && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-3 border-t border-gray-100"
            >
              {isFetchingMore ? (
                <span className="text-sm text-teal-600 flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Cargando más...
                </span>
              ) : hasMore ? (
                <span className="text-sm text-gray-400">
                  Desplázate para cargar más
                </span>
              ) : (
                <span className="text-sm text-gray-400">
                  — Fin de los resultados —
                </span>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

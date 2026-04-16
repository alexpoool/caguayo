import {
  Layers,
  Tag,
  FileText,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Button,
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
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  setSelectedContratoId: (id: number | null) => void;
  openForm: (item?: SuplementoWithDetails) => void;
  handleDelete: (id: number, nombre: string) => void;
}

export const SuplementosList: React.FC<SuplementosListProps> = ({
  suplementos,
  contratos,
  selectedContratoId,
  setSelectedContratoId,
  openForm,
  handleDelete,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded shadow-lg animate-bounce-subtle">
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
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
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
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
        >
          Nuevo Suplemento
        </Button>
      </div>
    </div>
    {!selectedContratoId ? (
      <p className="text-gray-500 text-center py-12">
        Seleccione un contrato para ver sus suplementos.
      </p>
    ) : (
      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-amber-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    Monto
                  </div>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    Fecha
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suplementos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    No hay suplementos para este contrato
                  </TableCell>
                </TableRow>
              ) : (
                suplementos.map((item) => (
                  <TableRow
                    key={item.id_suplemento}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => openForm(item)}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded text-sm font-mono font-medium">
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
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
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
      </Card>
    )}
  </div>
);

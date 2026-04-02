import React from "react";
import { createPortal } from "react-dom";
import { User, X } from "lucide-react";
import type { Cliente } from "../../../../types/ventas";

interface ClienteDetailModalProps {
  isOpen: boolean;
  cliente: Cliente | null;
  onClose: () => void;
}

export const ClienteDetailModal: React.FC<ClienteDetailModalProps> = ({
  isOpen,
  cliente,
  onClose,
}) => {
  if (!isOpen || !cliente) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {cliente.nombre || "(Sin nombre)"}
                </h3>
                <p className="text-sm text-gray-500">
                  Cliente #{cliente.numero_cliente || cliente.id_cliente}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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
                Cédula/RIF
              </p>
              <p className="font-bold text-gray-900">
                {cliente.cedula_rif || "-"}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
              <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                Tipo Persona
              </p>
              <p className="font-bold text-gray-900">
                {cliente.tipo_persona || "NATURAL"}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
              <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                Teléfono
              </p>
              <p className="font-bold text-gray-900">
                {cliente.telefono || "-"}
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-md border border-orange-100">
              <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="font-bold text-gray-900 text-sm break-all">
                {cliente.email || "-"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Tipo Relación
              </p>
              <p className="font-bold text-gray-900">
                {cliente.tipo_relacion || "-"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Estado
              </p>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  cliente.estado === "ACTIVO"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {cliente.estado || "ACTIVO"}
              </span>
            </div>
          </div>
          {cliente.direccion && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Dirección
              </p>
              <p className="text-gray-700">{cliente.direccion}</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

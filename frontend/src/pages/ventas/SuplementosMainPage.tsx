import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ConfirmModal } from "../../components/ui";
import { suplementosService, contratosService } from "../../services/api";
import type {
  ContratoWithDetails,
  SuplementoWithDetails,
} from "../../types/contrato";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { SuplementosList } from "./SuplementosList";
import { SuplementosForm } from "./SuplementosForm";

export function SuplementosMainPage() {
  const [searchParams] = useSearchParams();
  const initialContratoId = searchParams.get("contrato");

  const [view, setView] = useState<"list" | "form">("list");
  const [suplementos, setSuplementos] = useState<SuplementoWithDetails[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(
    initialContratoId ? Number(initialContratoId) : null,
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: SuplementoWithDetails | null;
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
      const [contratosRes] = await Promise.all([
        contratosService.getContratos(0, 1000),
      ]);
      setContratos(contratosRes);
      setEstados([
        { id: 1, nombre: "ACTIVO" },
        { id: 2, nombre: "CANCELADO" },
        { id: 3, nombre: "FINALIZADO" },
        { id: 4, nombre: "PENDIENTE" },
      ]);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadSuplementos = async () => {
    try {
      if (selectedContratoId) {
        const data =
          await suplementosService.getSuplementosByContrato(selectedContratoId);
        setSuplementos(data);
      } else {
        const data = await suplementosService.getSuplementos();
        setSuplementos(data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (view === "list") loadSuplementos();
  }, [view, selectedContratoId]);

  const handleSave = async () => {
    try {
      const data = {
        id_contrato: selectedContratoId,
        nombre: formData.nombre || "",
        id_estado: Number(formData.id_estado) || 1,
        fecha: formData.fecha || new Date().toISOString().split("T")[0],
        documento: formData.documento,
      };
      editingId
        ? await suplementosService.updateSuplemento(editingId, data as any)
        : await suplementosService.createSuplemento(data as any);
      toast.success(editingId ? "Actualizado" : "Creado");
      setView("list");
      resetForm();
      loadSuplementos();
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar suplemento?",
      message: `¿Está seguro de eliminar el suplemento "${nombre}"?`,
      onConfirm: async () => {
        try {
          await suplementosService.deleteSuplemento(id);
          toast.success("Eliminado");
          loadSuplementos();
        } catch (error: any) {
          toast.error(error.message || "Error");
        }
      },
      type: "danger",
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
  };

  const openForm = (item?: SuplementoWithDetails) => {
    if (item) {
      setEditingId(item.id_suplemento);
      setFormData({
        nombre: item.nombre,
        id_estado: item.id_estado,
        fecha: item.fecha,
        documento: item.documento,
      });
    } else {
      resetForm();
    }
    setView("form");
  };

  return (
    <div className="p-6">
      {view === "list" && (
        <SuplementosList
          suplementos={suplementos}
          contratos={contratos}
          selectedContratoId={selectedContratoId}
          setSelectedContratoId={setSelectedContratoId}
          openForm={openForm}
          handleDelete={handleDelete}
        />
      )}
      {view === "form" && (
        <SuplementosForm
          formData={formData}
          setFormData={setFormData}
          estados={estados}
          editingId={editingId}
          handleSave={handleSave}
          setView={setView}
          resetForm={resetForm}
        />
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
      {detailModal.isOpen &&
        detailModal.item &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg" />
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {detailModal.item.nombre}
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
                    X
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
                      Estado
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        detailModal.item.estado?.nombre === "ACTIVO"
                          ? "bg-green-100 text-green-800"
                          : detailModal.item.estado?.nombre === "CANCELADO"
                            ? "bg-red-100 text-red-800"
                            : detailModal.item.estado?.nombre === "FINALIZADO"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {detailModal.item.estado?.nombre || "N/A"}
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                      Fecha
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.fecha || "N/A"}
                    </p>
                  </div>
                  {detailModal.item.documento && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        Documento
                      </p>
                      <p className="text-gray-700">
                        {detailModal.item.documento}
                      </p>
                    </div>
                  )}
                </div>
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

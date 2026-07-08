import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import type { ContratoWithDetails, SuplementoWithDetails } from "../../types/contrato";
import { Layers, Save, ArrowLeft } from "lucide-react";

interface SuplementosFormProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  contratos: ContratoWithDetails[];
  selectedContratoId: number | null;
  setSelectedContratoId: (id: number | null) => void;
  estados: { id_estado_contrato: number; nombre: string }[];
  editingId: number | null;
  handleSave: () => void;
  setView: (view: "list" | "form") => void;
  resetForm: () => void;
}

export const SuplementosForm: React.FC<SuplementosFormProps> = ({
  formData,
  setFormData,
  contratos,
  selectedContratoId,
  setSelectedContratoId,
  estados,
  editingId,
  handleSave,
  setView,
  resetForm,
}) => {
  const [contratoSearch, setContratoSearch] = useState("");
  const [showContratoDropdown, setShowContratoDropdown] = useState(false);
  const contratoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contratoRef.current && !contratoRef.current.contains(e.target as Node)) {
        setShowContratoDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredContratos = useMemo(() => {
    if (!contratoSearch) return contratos;
    const term = contratoSearch.toLowerCase();
    return contratos.filter((c) => c.nombre.toLowerCase().includes(term));
  }, [contratos, contratoSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? "Editar Suplemento" : "Nuevo Suplemento"}
            </h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Complete los datos del suplemento
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
            <Layers className="h-5 w-5 text-teal-600" />
            Información del Suplemento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="mt-1"
                placeholder="Nombre del suplemento"
              />
            </div>
            <div ref={contratoRef}>
              <Label className="text-sm font-medium">Contrato *</Label>
              {selectedContratoId && editingId ? (
                <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {contratos.find((c) => c.id_contrato === Number(selectedContratoId))?.nombre || `Contrato #${selectedContratoId}`}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input
                    value={selectedContratoId ? (contratos.find((c) => c.id_contrato === selectedContratoId)?.nombre || "") : contratoSearch}
                    onChange={(e: any) => {
                      setContratoSearch(e.target.value);
                      setSelectedContratoId(null);
                      setShowContratoDropdown(true);
                    }}
                    onFocus={() => setShowContratoDropdown(true)}
                    placeholder="Buscar contrato..."
                  />
                  {showContratoDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredContratos.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No se encontraron contratos</div>
                      ) : (
                        filteredContratos.map((c) => (
                          <button
                            key={c.id_contrato}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 transition-colors"
                            onClick={() => {
                              setSelectedContratoId(c.id_contrato);
                              setContratoSearch("");
                              setShowContratoDropdown(false);
                            }}
                          >
                            {c.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Monto</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.monto ?? ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, monto: e.target.value })
                }
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
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
                  onClick={() => setFormData({ ...formData, fecha: new Date().toISOString().split("T")[0] })}
                  className="mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Documento</Label>
              <Input
                value={formData.documento || ""}
                onChange={(e: any) =>
                  setFormData({ ...formData, documento: e.target.value })
                }
                className="mt-1"
                placeholder="Número de documento"
              />
            </div>
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
};

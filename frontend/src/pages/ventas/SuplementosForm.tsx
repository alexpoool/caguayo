import React from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import type { SuplementoWithDetails } from "../../types/contrato";
import { Layers, Save, ArrowLeft } from "lucide-react";

interface SuplementosFormProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  estados: { id: number; nombre: string }[];
  editingId: number | null;
  handleSave: () => void;
  setView: (view: "list" | "form") => void;
  resetForm: () => void;
}

export const SuplementosForm: React.FC<SuplementosFormProps> = ({
  formData,
  setFormData,
  estados,
  editingId,
  handleSave,
  setView,
  resetForm,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded shadow-lg animate-bounce-subtle">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
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
          <Layers className="h-5 w-5 text-amber-600" />
          Información del Suplemento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
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
          <div>
            <Label className="text-sm font-medium">Estado</Label>
            <select
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              value={formData.id_estado || ""}
              onChange={(e: any) =>
                setFormData({ ...formData, id_estado: e.target.value })
              }
            >
              {estados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium">Fecha</Label>
            <Input
              type="date"
              value={formData.fecha || ""}
              onChange={(e: any) =>
                setFormData({ ...formData, fecha: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
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
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
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

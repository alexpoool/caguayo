import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowLeft,
  Search,
  Building,
  CreditCard,
  User,
  Banknote,
  Hash,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Landmark,
  Globe,
  Type,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
} from "../components/ui";
import { dependenciasService } from "../services/administracion";
import { monedaService } from "../services/api";
import type { CuentaDependencia, CuentaDependenciaCreate, CuentaDependenciaUpdate } from "../types/cuenta";

export function CuentasPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "form">("list");
  const [editingCuenta, setEditingCuenta] = useState<CuentaDependencia | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const [formData, setFormData] = useState<CuentaDependenciaCreate>({
    id_dependencia: 0,
    id_moneda: undefined,
    titular: "",
    banco: "",
    sucursal: undefined,
    numero_cuenta: "",
    direccion: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: cuentas = [], isLoading, isError, error } = useQuery({
    queryKey: ["cuentas_dependencia", searchTerm],
    queryFn: () => dependenciasService.getCuentasDependencia(searchTerm || undefined),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ["dependencias", "todas"],
    queryFn: () => dependenciasService.getDependencias(true),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const createMutation = useMutation({
    mutationFn: dependenciasService.createCuentaDependencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas_dependencia"] });
      toast.success("Cuenta creada correctamente");
      setView("list");
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al crear cuenta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CuentaDependenciaUpdate }) =>
      dependenciasService.updateCuentaDependencia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas_dependencia"] });
      toast.success("Cuenta actualizada correctamente");
      setView("list");
      setEditingCuenta(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al actualizar cuenta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dependenciasService.deleteCuentaDependencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas_dependencia"] });
      toast.success("Cuenta eliminada correctamente");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al eliminar cuenta");
    },
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.id_dependencia || formData.id_dependencia === 0) {
      errors.id_dependencia = "La dependencia es requerida";
    }
    if (!formData.titular || formData.titular.trim().length < 1) {
      errors.titular = "El titular es requerido";
    }
    if (!formData.banco || formData.banco.trim().length < 1) {
      errors.banco = "El banco es requerido";
    }
    if (!formData.numero_cuenta || formData.numero_cuenta.trim().length < 1) {
      errors.numero_cuenta = "El número de cuenta es requerido";
    }
    if (!formData.direccion || formData.direccion.trim().length < 1) {
      errors.direccion = "La dirección es requerida";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor corrija los errores del formulario");
      return;
    }

    const data = {
      ...formData,
      titular: formData.titular.trim(),
      banco: formData.banco.trim(),
      numero_cuenta: formData.numero_cuenta.trim(),
      direccion: formData.direccion.trim(),
    };

    if (editingCuenta && editingCuenta.id_cuenta) {
      updateMutation.mutate({ id: editingCuenta.id_cuenta, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const resetForm = () => {
    setFormData({
      id_dependencia: 0,
      id_moneda: undefined,
      titular: "",
      banco: "",
      sucursal: undefined,
      numero_cuenta: "",
      direccion: "",
    });
    setFormErrors({});
  };

  const handleEdit = (cuenta: CuentaDependencia) => {
    setEditingCuenta(cuenta);
    setFormData({
      id_dependencia: cuenta.id_dependencia,
      id_moneda: cuenta.id_moneda,
      titular: cuenta.titular,
      banco: cuenta.banco,
      sucursal: cuenta.sucursal,
      numero_cuenta: cuenta.numero_cuenta,
      direccion: cuenta.direccion,
    });
    setView("form");
  };

  const handleEliminar = (cuenta: CuentaDependencia) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar cuenta?",
      message: `¿Está seguro que desea eliminar la cuenta "${cuenta.titular}" - ${cuenta.banco}? Esta acción no se puede deshacer.`,
      onConfirm: () => cuenta.id_cuenta && deleteMutation.mutate(cuenta.id_cuenta),
      type: "danger",
    });
  };

  const getMonedaNombre = (cuenta: CuentaDependencia) => {
    if (cuenta.moneda) return `${cuenta.moneda.nombre} (${cuenta.moneda.simbolo})`;
    return "-";
  };

  if (view === "form") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded shadow-lg animate-bounce-subtle">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-baseline">
              <h1 className="text-xl font-bold text-gray-900">
                {editingCuenta ? "Editar Cuenta" : "Nueva Cuenta"}
              </h1>
              <p className="text-sm text-gray-500 ml-3">
                {editingCuenta
                  ? "Actualice la información de la cuenta"
                  : "Complete los datos para crear una nueva cuenta bancaria"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-emerald-500 animate-pulse" />
            <Button
              variant="secondary"
              onClick={() => {
                setView("list");
                setEditingCuenta(null);
                resetForm();
              }}
              className="gap-2 hover:scale-105 transition-transform"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la lista
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                Información de la Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Building className="h-5 w-5 text-blue-500" />
                  Dependencia *
                </Label>
                <select
                  className={`w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${formErrors.id_dependencia ? "border-red-500" : "border-gray-300"}`}
                  value={formData.id_dependencia || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, id_dependencia: parseInt(e.target.value) || 0 })
                  }
                >
                  <option value="">Seleccione una dependencia</option>
                  {dependencias.map((dep) => (
                    <option key={dep.id_dependencia} value={dep.id_dependencia}>
                      {dep.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.id_dependencia && (
                  <p className="text-red-500 text-sm">{formErrors.id_dependencia}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Banknote className="h-5 w-5 text-purple-500" />
                  Moneda
                </Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  value={formData.id_moneda || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, id_moneda: parseInt(e.target.value) || undefined })
                  }
                >
                  <option value="">Seleccione una moneda</option>
                  {monedas.map((m) => (
                    <option key={m.id_moneda} value={m.id_moneda}>
                      {m.nombre} ({m.simbolo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <User className="h-5 w-5 text-green-500" />
                  Titular *
                </Label>
                <Input
                  type="text"
                  value={formData.titular}
                  onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                  className={`mt-1 ${formErrors.titular ? "border-red-500" : ""}`}
                  placeholder="Nombre del titular"
                />
                {formErrors.titular && (
                  <p className="text-red-500 text-sm">{formErrors.titular}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Landmark className="h-5 w-5 text-orange-500" />
                  Banco *
                </Label>
                <Input
                  type="text"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className={`mt-1 ${formErrors.banco ? "border-red-500" : ""}`}
                  placeholder="Nombre del banco"
                />
                {formErrors.banco && (
                  <p className="text-red-500 text-sm">{formErrors.banco}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Hash className="h-5 w-5 text-cyan-500" />
                  Número de Cuenta *
                </Label>
                <Input
                  type="text"
                  value={formData.numero_cuenta}
                  onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                  className={`mt-1 ${formErrors.numero_cuenta ? "border-red-500" : ""}`}
                  placeholder="Número de cuenta"
                />
                {formErrors.numero_cuenta && (
                  <p className="text-red-500 text-sm">{formErrors.numero_cuenta}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Type className="h-5 w-5 text-gray-500" />
                  Sucursal
                </Label>
                <Input
                  type="number"
                  value={formData.sucursal || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sucursal: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1"
                  placeholder="Número de sucursal (opcional)"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  Dirección *
                </Label>
                <Input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className={`mt-1 ${formErrors.direccion ? "border-red-500" : ""}`}
                  placeholder="Dirección de la cuenta"
                />
                {formErrors.direccion && (
                  <p className="text-red-500 text-sm">{formErrors.direccion}</p>
                )}
              </div>

              <div className="flex gap-4 md:col-span-2 pt-4 border-t">
                <Button
                  type="submit"
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingCuenta
                      ? "Actualizar"
                      : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setView("list");
                    setEditingCuenta(null);
                    resetForm();
                  }}
                  className="gap-2 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="p-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full animate-pulse">
          <Wallet className="h-12 w-12 text-emerald-600 animate-spin" />
        </div>
        <div className="text-gray-600 font-medium">Cargando cuentas...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-50 border border-red-200 rounded-md p-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-bold text-lg mb-2 text-red-700">Error al cargar cuentas</p>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : "Error desconocido"}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["cuentas_dependencia"] })}
            className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded shadow-lg animate-bounce-subtle">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Cuentas</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Cuentas bancarias de dependencias
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingCuenta(null);
            setView("form");
          }}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por titular o dependencia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
              <TableRow>
                <TableHead className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-600" />
                  ID
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    Titular
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-orange-500" />
                    Banco
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-cyan-500" />
                    Núm. Cuenta
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-purple-500" />
                    Moneda
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    Dependencia
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <Wallet className="h-12 w-12 text-gray-300" />
                      </div>
                      <p className="text-lg font-medium mb-2">No se encontraron cuentas</p>
                      <p className="text-sm mb-4">Comience creando una nueva cuenta bancaria</p>
                      <Button
                        onClick={() => setView("form")}
                        className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Crear Cuenta
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cuentas.map((cuenta) => (
                  <TableRow
                    key={cuenta.id_cuenta}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm font-medium">
                        <Hash className="h-3 w-3" />#{cuenta.id_cuenta}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{cuenta.titular}</TableCell>
                    <TableCell>{cuenta.banco}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{cuenta.numero_cuenta}</span>
                    </TableCell>
                    <TableCell>{getMonedaNombre(cuenta)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        <Building className="h-3 w-3" />
                        {cuenta.dependencia_nombre || `#${cuenta.id_dependencia}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cuenta)}
                          className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminar(cuenta)}
                          className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}

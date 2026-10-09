import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Tag,
  FolderTree,
  Truck,
  Briefcase,
  Coins,
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Sparkles,
  FileCheck,
  FileText,
  ScrollText,
  ToggleLeft,
  Package,
  BuildingIcon,
  Wallet,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Palette,
  Database,
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
  DateInput,
} from "../components/ui";
import {
  configuracionService,
  dependenciasService,
} from "../services/administracion";
import {
  categoriasService,
  subcategoriasService,
  monedaService,
  tipoEntidadService,
  dj08Service,
} from "../services/api";
import { MigracionLegacy } from "./migracion/MigracionLegacy";
import type {
  ActividadEconomicaInput,
  TributoInput,
} from "../types/dj08";
import type {
  EspecialidadCreate,
  EspecialidadUpdate,
} from "../types/index";


type ConfigSubTabType =
  | "tipo-contrato"
  | "estado-contrato"
  | "categorias"
  | "subcategorias"
  | "tipo-proveedores"
  | "tipo-convenios"
  | "tipo-dependencia"
  | "tipo-cuenta"
  | "tipo-entidad"
  | "dj08-actividades"
  | "dj08-tributos"
  | "especialidades"
  | "migracion";

const configSubTabs: { id: ConfigSubTabType; label: string }[] = [
  { id: "tipo-contrato", label: "Tipos de Contrato" },
  { id: "estado-contrato", label: "Estados de Contrato" },
  { id: "categorias", label: "Categorías" },
  { id: "subcategorias", label: "Subcategorías" },
  { id: "tipo-proveedores", label: "Tipos de Proveedores" },
  { id: "tipo-convenios", label: "Tipos de Convenio" },
  { id: "tipo-dependencia", label: "Tipos de Dependencia" },
  { id: "tipo-entidad", label: "Tipos de Entidad" },
  { id: "dj08-actividades", label: "Actividades Económicas" },
  { id: "dj08-tributos", label: "Tributos" },
  { id: "especialidades", label: "Especialidades" },
  { id: "migracion", label: "Migración" },
];

/** 1234.5 -> "1.234,50" (montos de los catálogos DJ-08). */
const fmtMonto = (valor: unknown) =>
  Number(valor || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** "2025-01-31" -> "31/01/2025". */
const fmtFechaCorta = (iso?: string) =>
  iso ? iso.split("-").reverse().join("/") : "-";

interface ConfigCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  count: number;
  onClick: () => void;
  color: string;
}

function ConfigCard({
  title,
  icon,
  description,
  count,
  onClick,
  color,
}: ConfigCardProps) {
  const colorClasses: Record<string, string> = {
    "bg-blue-500": "from-blue-500 to-blue-600",
    "bg-green-500": "from-green-500 to-emerald-600",
    "bg-purple-500": "from-purple-500 to-purple-600",
    "bg-orange-500": "from-orange-500 to-orange-600",
    "bg-red-500": "from-red-500 to-red-600",
    "bg-teal-500": "from-teal-500 to-teal-600",
    "bg-indigo-500": "from-indigo-500 to-indigo-600",
    "bg-cyan-500": "from-cyan-500 to-cyan-600",
  };

  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] group overflow-hidden"
      onClick={onClick}
    >
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]}`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div
            className={`p-4 rounded-md bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            {icon}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-gray-800">{count}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Elementos
            </span>
          </div>
        </div>
        <h3 className="mt-5 font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-blue-500 transition-colors">
          <span>Configurar</span>
          <Plus className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Gestión de configuración</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const [activeConfigSubTab, setActiveConfigSubTab] =
    useState<ConfigSubTabType>("tipo-contrato");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: string | null;
    item: any | null;
  }>({ isOpen: false, type: null, item: null });
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({ isOpen: false, item: null });

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = tabsRef.current;
    if (!el) return;
    const amount = 180;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const {
    data: tiposContrato = [],
    isLoading: loadingTiposContrato,
    refetch: refetchTiposContrato,
  } = useQuery({
    queryKey: ["tiposContrato"],
    queryFn: () => configuracionService.getTiposContrato(),
  });

  const {
    data: estadosContrato = [],
    isLoading: loadingEstadosContrato,
    refetch: refetchEstadosContrato,
  } = useQuery({
    queryKey: ["estadosContrato"],
    queryFn: () => configuracionService.getEstadosContrato(),
  });

  const {
    data: categorias = [],
    isLoading: loadingCategorias,
    refetch: refetchCategorias,
  } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => categoriasService.getCategorias(),
  });

  const {
    data: subcategorias = [],
    isLoading: loadingSubcategorias,
    refetch: refetchSubcategorias,
  } = useQuery({
    queryKey: ["subcategorias"],
    queryFn: () => subcategoriasService.getSubcategorias(),
  });

  const {
    data: tiposProveedor = [],
    isLoading: loadingTiposProveedor,
    refetch: refetchTiposProveedor,
  } = useQuery({
    queryKey: ["tiposProveedor"],
    queryFn: () => configuracionService.getTiposProveedor(),
  });

  const {
    data: tiposConvenio = [],
    isLoading: loadingTiposConvenio,
    refetch: refetchTiposConvenio,
  } = useQuery({
    queryKey: ["tiposConvenio"],
    queryFn: () => configuracionService.getTiposConvenio(),
  });

  const {
    data: especialidades = [],
    isLoading: loadingEspecialidades,
    refetch: refetchEspecialidades,
  } = useQuery({
    queryKey: ["especialidades"],
    queryFn: () => configuracionService.getEspecialidades(false),
  });

  const {
    data: tiposDependencia = [],
    isLoading: loadingTiposDependencia,
    refetch: refetchTiposDependencia,
  } = useQuery({
    queryKey: ["tiposDependencia"],
    queryFn: () => dependenciasService.getTiposDependencia(),
  });

const {
    data: tiposCuenta = [],
    isLoading: loadingTiposCuenta,
    refetch: refetchTiposCuenta,
  } = useQuery({
    queryKey: ["tiposCuenta"],
    queryFn: () => Promise.resolve([]),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: tiposEntidad = [],
    isLoading: loadingTiposEntidad,
    refetch: refetchTiposEntidad,
  } = useQuery({
    queryKey: ["tiposEntidad"],
    queryFn: () => tipoEntidadService.getTiposEntidad(),
  });

  const {
    data: dj08Actividades = [],
    isLoading: loadingDj08Actividades,
    refetch: refetchDj08Actividades,
  } = useQuery({
    queryKey: ["dj08Actividades"],
    queryFn: () => dj08Service.listarActividades(),
  });

  const {
    data: dj08Tributos = [],
    isLoading: loadingDj08Tributos,
    refetch: refetchDj08Tributos,
  } = useQuery({
    queryKey: ["dj08Tributos"],
    queryFn: () => dj08Service.listarTributos(),
  });

  const isAnyLoading =
    loadingTiposContrato ||
    loadingEstadosContrato ||
    loadingCategorias ||
    loadingSubcategorias ||
    loadingTiposProveedor ||
    loadingTiposConvenio ||
    loadingTiposDependencia ||
    loadingTiposCuenta ||
    loadingTiposEntidad ||
    loadingDj08Actividades ||
    loadingDj08Tributos ||
    loadingEspecialidades;

  // Mutations para tipos de contrato
  const createTipoContrato = useMutation({
    mutationFn: configuracionService.createTipoContrato,
    onSuccess: () => {
      console.log("Tipo contrato creado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposContrato"] });
      refetchTiposContrato();
      toast.success("Tipo de contrato creado");
      closeModal();
    },
  });

  const updateTipoContrato = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoContrato(id, data),
    onSuccess: () => {
      console.log("Tipo contrato actualizado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposContrato"] });
      refetchTiposContrato();
      toast.success("Tipo de contrato actualizado");
      closeModal();
    },
  });

  const deleteTipoContrato = useMutation({
    mutationFn: configuracionService.deleteTipoContrato,
    onSuccess: () => {
      console.log("Tipo contrato eliminado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposContrato"] });
      refetchTiposContrato();
      toast.success("Tipo de contrato eliminado");
    },
  });

  // Mutations para estados de contrato
  const createEstadoContrato = useMutation({
    mutationFn: configuracionService.createEstadoContrato,
    onSuccess: () => {
      console.log("Estado contrato creado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["estadosContrato"] });
      refetchEstadosContrato();
      toast.success("Estado de contrato creado");
      closeModal();
    },
  });

  const updateEstadoContrato = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateEstadoContrato(id, data),
    onSuccess: () => {
      console.log("Estado contrato actualizado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["estadosContrato"] });
      refetchEstadosContrato();
      toast.success("Estado de contrato actualizado");
      closeModal();
    },
  });

  const deleteEstadoContrato = useMutation({
    mutationFn: configuracionService.deleteEstadoContrato,
    onSuccess: () => {
      console.log("Estado contrato eliminado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["estadosContrato"] });
      refetchEstadosContrato();
      toast.success("Estado de contrato eliminado");
    },
  });

  // Mutations para especialidades
  //
  // "delete" desactiva en vez de borrar: una especialidad puede estar enlazada
  // a artistas y el enlace tiene que sobrevivir. Se trae onError porque el
  // backend responde 409 con un mensaje claro si el nombre ya existe, y sin
  // esto el usuario no vería nada.
  const createEspecialidad = useMutation({
    mutationFn: (data: EspecialidadCreate) =>
      configuracionService.createEspecialidad(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
      refetchEspecialidades();
      toast.success("Especialidad creada");
      closeModal();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo crear"),
  });

  const updateEspecialidad = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EspecialidadUpdate }) =>
      configuracionService.updateEspecialidad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
      refetchEspecialidades();
      toast.success("Especialidad actualizada");
      closeModal();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar"),
  });

  const desactivarEspecialidad = useMutation({
    mutationFn: (id: number) =>
      configuracionService.desactivarEspecialidad(id),
    onSuccess: (esp) => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
      refetchEspecialidades();
      toast.success(
        esp.artistas > 0
          ? `Especialidad desactivada. Los ${esp.artistas} artistas que la tienen la conservan.`
          : "Especialidad desactivada"
      );
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo desactivar"),
  });

  const reactivarEspecialidad = useMutation({
    mutationFn: (id: number) =>
      configuracionService.reactivarEspecialidad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
      refetchEspecialidades();
      toast.success("Especialidad reactivada");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo reactivar"),
  });

  // Mutations para tipos de proveedor
  const createTipoProveedor = useMutation({
    mutationFn: configuracionService.createTipoProveedor,
    onSuccess: () => {
      console.log("Tipo proveedor creado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposProveedor"] });
      refetchTiposProveedor();
      toast.success("Tipo de proveedor creado");
      closeModal();
    },
  });

  const updateTipoProveedor = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoProveedor(id, data),
    onSuccess: () => {
      console.log("Tipo proveedor actualizado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposProveedor"] });
      refetchTiposProveedor();
      toast.success("Tipo de proveedor actualizado");
      closeModal();
    },
  });

  const deleteTipoProveedor = useMutation({
    mutationFn: configuracionService.deleteTipoProveedor,
    onSuccess: () => {
      console.log("Tipo proveedor eliminado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposProveedor"] });
      refetchTiposProveedor();
      toast.success("Tipo de proveedor eliminado");
    },
  });

  // Mutations para tipos de convenio
  const createTipoConvenio = useMutation({
    mutationFn: configuracionService.createTipoConvenio,
    onSuccess: () => {
      console.log("Tipo convenio creado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposConvenio"] });
      refetchTiposConvenio();
      toast.success("Tipo de convenio creado");
      closeModal();
    },
  });

  const updateTipoConvenio = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      configuracionService.updateTipoConvenio(id, data),
    onSuccess: () => {
      console.log("Tipo convenio actualizado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposConvenio"] });
      refetchTiposConvenio();
      toast.success("Tipo de convenio actualizado");
      closeModal();
    },
  });

  const deleteTipoConvenio = useMutation({
    mutationFn: configuracionService.deleteTipoConvenio,
    onSuccess: () => {
      console.log("Tipo convenio eliminado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposConvenio"] });
      refetchTiposConvenio();
      toast.success("Tipo de convenio eliminado");
    },
  });

  // Mutations para tipos de dependencia
  const createTipoDependencia = useMutation({
    mutationFn: dependenciasService.createTipoDependencia,
    onSuccess: () => {
      console.log("Tipo dependencia creado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposDependencia"] });
      refetchTiposDependencia();
      toast.success("Tipo de dependencia creado");
      closeModal();
    },
  });

  const updateTipoDependencia = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      dependenciasService.updateTipoDependencia(id, data),
    onSuccess: () => {
      console.log("Tipo dependencia actualizado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposDependencia"] });
      refetchTiposDependencia();
      toast.success("Tipo de dependencia actualizado");
      closeModal();
    },
  });

  const deleteTipoDependencia = useMutation({
    mutationFn: dependenciasService.deleteTipoDependencia,
    onSuccess: () => {
      console.log("Tipo dependencia eliminado, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["tiposDependencia"] });
      refetchTiposDependencia();
      toast.success("Tipo de dependencia eliminado");
    },
  });

  // Mutations para tipos de cuenta
  const createTipoCuenta = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      toast.success("Tipo de cuenta creado");
      closeModal();
    },
  });

  const updateTipoCuenta = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      toast.success("Tipo de cuenta actualizado");
      closeModal();
    },
  });

  const deleteTipoCuenta = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      toast.success("Tipo de cuenta eliminado");
    },
  });

  // Mutations para tipos de entidad
  const createTipoEntidad = useMutation({
    mutationFn: tipoEntidadService.createTipoEntidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiposEntidad"] });
      refetchTiposEntidad();
      toast.success("Tipo de entidad creado");
      closeModal();
    },
  });

  const updateTipoEntidad = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      tipoEntidadService.updateTipoEntidad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiposEntidad"] });
      refetchTiposEntidad();
      toast.success("Tipo de entidad actualizado");
      closeModal();
    },
  });

  const deleteTipoEntidad = useMutation({
    mutationFn: tipoEntidadService.deleteTipoEntidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiposEntidad"] });
      refetchTiposEntidad();
      toast.success("Tipo de entidad eliminado");
    },
  });

  // Mutations para categorías
  const createCategoria = useMutation({
    mutationFn: categoriasService.createCategoria,
    onSuccess: () => {
      console.log("Categoría creada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      refetchCategorias();
      toast.success("Categoría creada");
      closeModal();
    },
  });

  const updateCategoria = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      categoriasService.updateCategoria(id, data),
    onSuccess: () => {
      console.log("Categoría actualizada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      refetchCategorias();
      toast.success("Categoría actualizada");
      closeModal();
    },
  });

  const deleteCategoria = useMutation({
    mutationFn: categoriasService.deleteCategoria,
    onSuccess: () => {
      console.log("Categoría eliminada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      refetchCategorias();
      toast.success("Categoría eliminada");
    },
  });

  // Mutations para subcategorías
  const createSubcategoria = useMutation({
    mutationFn: subcategoriasService.createSubcategoria,
    onSuccess: () => {
      console.log("Subcategoría creada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      refetchSubcategorias();
      toast.success("Subcategoría creada");
      closeModal();
    },
  });

  const updateSubcategoria = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      subcategoriasService.updateSubcategoria(id, data),
    onSuccess: () => {
      console.log("Subcategoría actualizada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      refetchSubcategorias();
      toast.success("Subcategoría actualizada");
      closeModal();
    },
  });

  const deleteSubcategoria = useMutation({
    mutationFn: subcategoriasService.deleteSubcategoria,
    onSuccess: () => {
      console.log("Subcategoría eliminada, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      refetchSubcategorias();
      toast.success("Subcategoría eliminada");
    },
  });

  // Mutations para los catálogos de la DJ-08
  const createDj08Actividad = useMutation({
    mutationFn: dj08Service.crearActividad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Actividades"] });
      refetchDj08Actividades();
      toast.success("Actividad económica creada");
      closeModal();
    },
  });

  const updateDj08Actividad = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActividadEconomicaInput }) =>
      dj08Service.actualizarActividad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Actividades"] });
      refetchDj08Actividades();
      toast.success("Actividad económica actualizada");
      closeModal();
    },
  });

  const deleteDj08Actividad = useMutation({
    mutationFn: dj08Service.eliminarActividad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Actividades"] });
      refetchDj08Actividades();
      toast.success("Actividad económica eliminada");
    },
  });

  const createDj08Tributo = useMutation({
    mutationFn: dj08Service.crearTributo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Tributos"] });
      refetchDj08Tributos();
      toast.success("Tributo creado");
      closeModal();
    },
  });

  const updateDj08Tributo = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TributoInput }) =>
      dj08Service.actualizarTributo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Tributos"] });
      refetchDj08Tributos();
      toast.success("Tributo actualizado");
      closeModal();
    },
  });

  const deleteDj08Tributo = useMutation({
    mutationFn: dj08Service.eliminarTributo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dj08Tributos"] });
      refetchDj08Tributos();
      toast.success("Tributo eliminado");
    },
  });

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setEditingItem(item || null);
    if (type === "subcategorias" && !item) {
      setFormData({ nombre: "", descripcion: "", id_categoria: "" });
    } else if (type === "subcategorias" && item) {
      setFormData({ ...item });
    } else if (type === "dj08-actividades" && !item) {
      setFormData({
        codigo: "",
        nombre: "",
        fecha_inicio: "",
        fecha_fin: "",
        ingresos: "",
        gastos: "",
        orden: 0,
      });
    } else if (type === "dj08-tributos" && !item) {
      setFormData({ nombre: "", importe: "" });
    } else {
      setFormData(item || { nombre: "", descripcion: "" });
    }

    // Refetch data when opening modal to ensure fresh data
    switch (type) {
      case "tipo-contrato":
        refetchTiposContrato();
        break;
      case "estado-contrato":
        refetchEstadosContrato();
        break;
      case "categorias":
        refetchCategorias();
        break;
      case "subcategorias":
        refetchSubcategorias();
        break;
      case "tipo-proveedores":
        refetchTiposProveedor();
        break;
      case "tipo-convenios":
        refetchTiposConvenio();
        break;
      case "tipo-dependencia":
        refetchTiposDependencia();
        break;
      case "tipo-cuenta":
        refetchTiposCuenta();
        break;
      case "tipo-entidad":
        refetchTiposEntidad();
        break;
      case "dj08-actividades":
        refetchDj08Actividades();
        break;
      case "dj08-tributos":
        refetchDj08Tributos();
        break;
      case "especialidades":
        refetchEspecialidades();
        break;
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      toast.error("El nombre es requerido");
      return;
    }

    switch (modalType) {
      case "tipo-contrato":
        if (editingItem) {
          updateTipoContrato.mutate({
            id: editingItem.id_tipo_contrato,
            data: formData,
          });
        } else {
          createTipoContrato.mutate(formData);
        }
        break;
      case "estado-contrato":
        if (editingItem) {
          updateEstadoContrato.mutate({
            id: editingItem.id_estado_contrato,
            data: formData,
          });
        } else {
          createEstadoContrato.mutate(formData);
        }
        break;
      case "categorias":
        if (editingItem) {
          updateCategoria.mutate({
            id: editingItem.id_categoria,
            data: formData,
          });
        } else {
          createCategoria.mutate(formData);
        }
        break;
      case "subcategorias":
        if (!formData.id_categoria) {
          toast.error("Debe seleccionar una categoría");
          return;
        }
        const subcategoriaData = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          id_categoria: parseInt(formData.id_categoria),
        };
        if (editingItem) {
          updateSubcategoria.mutate({
            id: editingItem.id_subcategoria,
            data: subcategoriaData,
          });
        } else {
          createSubcategoria.mutate(subcategoriaData);
        }
        break;
      case "tipo-proveedores":
        if (editingItem) {
          updateTipoProveedor.mutate({
            id: editingItem.id_tipo_proveedor,
            data: formData,
          });
        } else {
          createTipoProveedor.mutate(formData);
        }
        break;
      case "tipo-convenios":
        if (editingItem) {
          updateTipoConvenio.mutate({
            id: editingItem.id_tipo_convenio,
            data: formData,
          });
        } else {
          createTipoConvenio.mutate(formData);
        }
        break;
      case "tipo-dependencia":
        if (editingItem) {
          updateTipoDependencia.mutate({
            id: editingItem.id_tipo_dependencia,
            data: formData,
          });
        } else {
          createTipoDependencia.mutate(formData);
        }
        break;
      case "tipo-entidad":
        if (editingItem) {
          updateTipoEntidad.mutate({
            id: editingItem.id_tipo_entidad,
            data: formData,
          });
        } else {
          createTipoEntidad.mutate(formData);
        }
        break;
      case "dj08-actividades": {
        if (!formData.codigo?.trim()) {
          toast.error("El código es requerido");
          return;
        }
        if (!formData.fecha_inicio || !formData.fecha_fin) {
          toast.error("Las fechas Desde y Hasta son requeridas");
          return;
        }
        if (formData.fecha_fin < formData.fecha_inicio) {
          toast.error("La fecha Hasta no puede ser anterior a Desde");
          return;
        }
        const actividadData: ActividadEconomicaInput = {
          codigo: formData.codigo,
          nombre: formData.nombre,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin,
          ingresos: parseFloat(formData.ingresos) || 0,
          gastos: parseFloat(formData.gastos) || 0,
          orden: parseInt(formData.orden, 10) || 0,
        };
        if (editingItem) {
          updateDj08Actividad.mutate({
            id: editingItem.id_actividad,
            data: actividadData,
          });
        } else {
          createDj08Actividad.mutate(actividadData);
        }
        break;
      }
      case "dj08-tributos": {
        const tributoData: TributoInput = {
          nombre: formData.nombre,
          importe: parseFloat(formData.importe) || 0,
        };
        if (editingItem) {
          updateDj08Tributo.mutate({
            id: editingItem.id_tributo,
            data: tributoData,
          });
        } else {
          createDj08Tributo.mutate(tributoData);
        }
        break;
      }
      case "especialidades": {
        const data: EspecialidadUpdate = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
        };
        if (editingItem) {
          // Editar una desactivada la vuelve a estar disponible: si el usuario
          // la está corrigiendo es que la quiere de vuelta.
          updateEspecialidad.mutate({
            id: editingItem.id_especialidad,
            data: { ...data, activo: true },
          });
        } else {
          createEspecialidad.mutate(data as EspecialidadCreate);
        }
        break;
      }
    }
  };

  const handleDelete = (type: string, item: any) => {
    setConfirmDelete({ isOpen: true, type, item });
  };

  const executeDelete = () => {
    const { type, item } = confirmDelete;
    if (!type || !item) return;
    switch (type) {
      case "tipo-contrato":
        deleteTipoContrato.mutate(item.id_tipo_contrato);
        break;
      case "estado-contrato":
        deleteEstadoContrato.mutate(item.id_estado_contrato);
        break;
      case "categorias":
        deleteCategoria.mutate(item.id_categoria);
        break;
      case "subcategorias":
        deleteSubcategoria.mutate(item.id_subcategoria);
        break;
      case "tipo-proveedores":
        deleteTipoProveedor.mutate(item.id_tipo_proveedor);
        break;
      case "tipo-convenios":
        deleteTipoConvenio.mutate(item.id_tipo_convenio);
        break;
      case "tipo-dependencia":
        deleteTipoDependencia.mutate(item.id_tipo_dependencia);
        break;
      case "tipo-cuenta":
        break;
      case "tipo-entidad":
        deleteTipoEntidad.mutate(item.id_tipo_entidad);
        break;
      case "dj08-actividades":
        deleteDj08Actividad.mutate(item.id_actividad);
        break;
      case "dj08-tributos":
        deleteDj08Tributo.mutate(item.id_tributo);
        break;
      case "especialidades":
        // desactivar, no borrar: el enlace de los artistas se conserva
        desactivarEspecialidad.mutate(item.id_especialidad);
        break;
    }
    setConfirmDelete({ isOpen: false, type: null, item: null });
  };

  const configCards = [
    {
      title: "Tipos de Contrato",
      icon: <ScrollText className="h-8 w-8" />,
      description: "Gestión de tipos de contratos",
      count: tiposContrato.length,
      color: "bg-blue-500",
      type: "tipo-contrato",
    },
    {
      title: "Estados de Contrato",
      icon: <ToggleLeft className="h-8 w-8" />,
      description: "Estados posibles de contratos",
      count: estadosContrato.length,
      color: "bg-green-500",
      type: "estado-contrato",
    },
    {
      title: "Categorías",
      icon: <FolderTree className="h-8 w-8" />,
      description: "Categorías de productos",
      count: categorias.length,
      color: "bg-purple-500",
      type: "categorias",
    },
    {
      title: "Subcategorías",
      icon: <Tag className="h-8 w-8" />,
      description: "Subcategorías de productos",
      count: subcategorias.length,
      color: "bg-orange-500",
      type: "subcategorias",
    },
    {
      title: "Tipos de Proveedores",
      icon: <Truck className="h-8 w-8" />,
      description: "Clasificación de proveedores",
      count: tiposProveedor.length,
      color: "bg-red-500",
      type: "tipo-proveedores",
    },
    {
      title: "Tipos de Convenio",
      icon: <FileText className="h-8 w-8" />,
      description: "Tipos de convenios comerciales",
      count: tiposConvenio.length,
      color: "bg-teal-500",
      type: "tipo-convenios",
    },
    {
      title: "Tipos de Dependencia",
      icon: <BuildingIcon className="h-8 w-8" />,
      description: "Clasificación de dependencias",
      count: tiposDependencia.length,
      color: "bg-indigo-500",
      type: "tipo-dependencia",
    },
    {
      title: "Tipos de Cuenta",
      icon: <Wallet className="h-8 w-8" />,
      description: "Tipos de cuentas bancarias (CUP, MLC, USD)",
      count: tiposCuenta.length,
      color: "bg-cyan-500",
      type: "tipo-cuenta",
    },
    {
      title: "Tipos de Entidad",
      icon: <BuildingIcon className="h-8 w-8" />,
      description: "Tipos de entidad para personas jurídicas",
      count: tiposEntidad.length,
      color: "bg-rose-500",
      type: "tipo-entidad",
    },
    {
      title: "Actividades Económicas",
      icon: <Briefcase className="h-8 w-8" />,
      description: "Catálogo DJ-08: ingresos y gastos por actividad",
      count: dj08Actividades.length,
      color: "bg-amber-500",
      type: "dj08-actividades",
    },
    {
      title: "Tributos",
      icon: <Coins className="h-8 w-8" />,
      description: "Catálogo DJ-08: tributos pagados (Sección F)",
      count: dj08Tributos.length,
      color: "bg-cyan-500",
      type: "dj08-tributos",
    },
  ];

  const getItems = () => {
    switch (activeConfigSubTab) {
      case "tipo-contrato":
        return tiposContrato;
      case "estado-contrato":
        return estadosContrato;
      case "categorias":
        return categorias;
      case "subcategorias":
        return subcategorias;
      case "tipo-proveedores":
        return tiposProveedor;
      case "tipo-convenios":
        return tiposConvenio;
      case "tipo-dependencia":
        return tiposDependencia;
      case "tipo-cuenta":
        return tiposCuenta;
      case "tipo-entidad":
        return tiposEntidad;
      case "dj08-actividades":
        return dj08Actividades;
      case "dj08-tributos":
        return dj08Tributos;
      case "especialidades":
        return especialidades;
      default:
        return [];
    }
  };

  const getItemId = (item: any) => {
    switch (activeConfigSubTab) {
      case "tipo-contrato":
        return item.id_tipo_contrato;
      case "estado-contrato":
        return item.id_estado_contrato;
      case "categorias":
        return item.id_categoria;
      case "subcategorias":
        return item.id_subcategoria;
      case "tipo-proveedores":
        return item.id_tipo_proveedor;
      case "tipo-convenios":
        return item.id_tipo_convenio;
      case "tipo-dependencia":
        return item.id_tipo_dependencia;
      case "tipo-cuenta":
        return item.id_tipo_cuenta;
      case "tipo-entidad":
        return item.id_tipo_entidad;
      case "dj08-actividades":
        return item.id_actividad;
      case "dj08-tributos":
        return item.id_tributo;
      case "especialidades":
        return item.id_especialidad;
      default:
        return item.id;
    }
  };

  const isSubcategoria = activeConfigSubTab === "subcategorias";
  const isEspecialidades = activeConfigSubTab === "especialidades";
  const isMigracion = activeConfigSubTab === "migracion";
  const isDj08Catalogo =
    activeConfigSubTab === "dj08-actividades" ||
    activeConfigSubTab === "dj08-tributos";

  const getFormTitle = () => {
    if (editingItem) return "Editar Elemento";
    switch (modalType) {
      case "tipo-contrato":
        return "Nuevo Tipo de Contrato";
      case "estado-contrato":
        return "Nuevo Estado de Contrato";
      case "categorias":
        return "Nueva Categoría";
      case "subcategorias":
        return "Nueva Subcategoría";
      case "tipo-proveedores":
        return "Nuevo Tipo de Proveedor";
      case "tipo-convenios":
        return "Nuevo Tipo de Convenio";
      case "tipo-dependencia":
        return "Nuevo Tipo de Dependencia";
      case "tipo-cuenta":
        return "Nuevo Tipo de Cuenta";
      case "tipo-entidad":
        return "Nuevo Tipo de Entidad";
      case "dj08-actividades":
        return "Nueva Actividad Económica";
      case "dj08-tributos":
        return "Nuevo Tributo";
      case "especialidades":
        return "Nueva Especialidad";
      default:
        return "Nuevo Elemento";
    }
  };

  const getFormIcon = (size: "sm" | "lg" = "sm") => {
    const className = size === "lg" ? "h-8 w-8" : "h-5 w-5";
    switch (modalType) {
      case "tipo-contrato":
        return <ScrollText className={`${className} text-blue-600`} />;
      case "estado-contrato":
        return <ToggleLeft className={`${className} text-green-600`} />;
      case "categorias":
        return <FolderTree className={`${className} text-purple-600`} />;
      case "subcategorias":
        return <Tag className={`${className} text-orange-600`} />;
      case "tipo-proveedores":
        return <Truck className={`${className} text-red-600`} />;
      case "tipo-convenios":
        return <FileText className={`${className} text-teal-600`} />;
      case "tipo-dependencia":
        return <BuildingIcon className={`${className} text-indigo-600`} />;
      case "tipo-cuenta":
        return <Wallet className={`${className} text-cyan-600`} />;
      case "tipo-entidad":
        return <BuildingIcon className={`${className} text-rose-600`} />;
      case "dj08-actividades":
        return <Briefcase className={`${className} text-amber-600`} />;
      case "dj08-tributos":
        return <Coins className={`${className} text-cyan-600`} />;
      case "especialidades":
        return <Palette className={`${className} text-fuchsia-600`} />;
      default:
        return <Plus className={`${className} text-gray-600`} />;
    }
  };

  const getModalGradient = () => {
    switch (modalType) {
      case "tipo-contrato":
        return "from-blue-50 to-indigo-50";
      case "estado-contrato":
        return "from-green-50 to-emerald-50";
      case "categorias":
        return "from-purple-50 to-pink-50";
      case "subcategorias":
        return "from-orange-50 to-amber-50";
      case "tipo-proveedores":
        return "from-red-50 to-rose-50";
      case "tipo-convenios":
        return "from-teal-50 to-cyan-50";
      case "tipo-dependencia":
        return "from-indigo-50 to-blue-50";
      case "tipo-cuenta":
        return "from-cyan-50 to-sky-50";
      case "tipo-entidad":
        return "from-rose-50 to-pink-50";
      case "dj08-actividades":
        return "from-amber-50 to-orange-50";
      case "dj08-tributos":
        return "from-cyan-50 to-teal-50";
      default:
        return "from-gray-50 to-gray-100";
    }
  };

  const getTableHeaderGradient = () => {
    switch (modalType) {
      case "tipo-contrato":
        return "bg-gradient-to-r from-blue-50 to-indigo-50";
      case "estado-contrato":
        return "bg-gradient-to-r from-green-50 to-emerald-50";
      case "categorias":
        return "bg-gradient-to-r from-purple-50 to-pink-50";
      case "subcategorias":
        return "bg-gradient-to-r from-orange-50 to-amber-50";
      case "tipo-proveedores":
        return "bg-gradient-to-r from-red-50 to-rose-50";
      case "tipo-convenios":
        return "bg-gradient-to-r from-teal-50 to-cyan-50";
      case "tipo-dependencia":
        return "bg-gradient-to-r from-indigo-50 to-blue-50";
      case "tipo-cuenta":
        return "bg-gradient-to-r from-cyan-50 to-sky-50";
      case "tipo-entidad":
        return "bg-gradient-to-r from-rose-50 to-pink-50";
      case "dj08-actividades":
        return "bg-gradient-to-r from-amber-50 to-orange-50";
      case "dj08-tributos":
        return "bg-gradient-to-r from-cyan-50 to-teal-50";
      case "especialidades":
        return "bg-gradient-to-r from-fuchsia-50 to-purple-50";
      default:
        return "bg-gray-50";
    }
  };

  const getButtonGradient = () => {
    switch (modalType) {
      case "tipo-contrato":
        return "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800";
      case "estado-contrato":
        return "from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800";
      case "categorias":
        return "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800";
      case "subcategorias":
        return "from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800";
      case "tipo-proveedores":
        return "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800";
      case "tipo-convenios":
        return "from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800";
      case "tipo-dependencia":
        return "from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800";
      case "tipo-cuenta":
        return "from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800";
      case "tipo-entidad":
        return "from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800";
      case "dj08-actividades":
        return "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700";
      case "dj08-tributos":
        return "from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700";
      case "especialidades":
        return "from-fuchsia-600 to-purple-700 hover:from-fuchsia-700 hover:to-purple-800";
      default:
        return "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800";
    }
  };

  const getListHeaderGradient = () => {
    switch (activeConfigSubTab) {
      case "tipo-contrato":
        return "bg-gradient-to-r from-blue-50 to-indigo-50";
      case "estado-contrato":
        return "bg-gradient-to-r from-green-50 to-emerald-50";
      case "categorias":
        return "bg-gradient-to-r from-purple-50 to-pink-50";
      case "subcategorias":
        return "bg-gradient-to-r from-orange-50 to-amber-50";
      case "tipo-proveedores":
        return "bg-gradient-to-r from-red-50 to-rose-50";
      case "tipo-convenios":
        return "bg-gradient-to-r from-teal-50 to-cyan-50";
      case "tipo-dependencia":
        return "bg-gradient-to-r from-indigo-50 to-blue-50";
      case "tipo-cuenta":
        return "bg-gradient-to-r from-cyan-50 to-sky-50";
      case "tipo-entidad":
        return "bg-gradient-to-r from-rose-50 to-pink-50";
      case "dj08-actividades":
        return "bg-gradient-to-r from-amber-50 to-orange-50";
      case "dj08-tributos":
        return "bg-gradient-to-r from-cyan-50 to-teal-50";
      case "especialidades":
        return "bg-gradient-to-r from-fuchsia-50 to-purple-50";
      default:
        return "bg-gray-50";
    }
  };

  const getListBadgeColors = () => {
    switch (activeConfigSubTab) {
      case "tipo-contrato":
        return { bg: "bg-blue-100", text: "text-blue-700" };
      case "estado-contrato":
        return { bg: "bg-green-100", text: "text-green-700" };
      case "categorias":
        return { bg: "bg-purple-100", text: "text-purple-700" };
      case "subcategorias":
        return { bg: "bg-orange-100", text: "text-orange-700" };
      case "tipo-proveedores":
        return { bg: "bg-red-100", text: "text-red-700" };
      case "tipo-convenios":
        return { bg: "bg-teal-100", text: "text-teal-700" };
      case "tipo-dependencia":
        return { bg: "bg-indigo-100", text: "text-indigo-700" };
      case "tipo-cuenta":
        return { bg: "bg-cyan-100", text: "text-cyan-700" };
      case "tipo-entidad":
        return { bg: "bg-rose-100", text: "text-rose-700" };
      case "dj08-actividades":
        return { bg: "bg-amber-100", text: "text-amber-700" };
      case "dj08-tributos":
        return { bg: "bg-cyan-100", text: "text-cyan-700" };
      case "especialidades":
        return { bg: "bg-fuchsia-100", text: "text-fuchsia-700" };
      default:
        return { bg: "bg-slate-50", text: "text-gray-700" };
    }
  };

  const getListIconColor = () => {
    switch (activeConfigSubTab) {
      case "tipo-contrato":
        return "text-blue-600";
      case "estado-contrato":
        return "text-green-600";
      case "categorias":
        return "text-purple-600";
      case "subcategorias":
        return "text-orange-600";
      case "tipo-proveedores":
        return "text-red-600";
      case "tipo-convenios":
        return "text-teal-600";
      case "tipo-dependencia":
        return "text-indigo-600";
      case "tipo-cuenta":
        return "text-cyan-600";
      case "tipo-entidad":
        return "text-rose-600";
      case "dj08-actividades":
        return "text-amber-600";
      case "dj08-tributos":
        return "text-cyan-600";
      case "especialidades":
        return "text-fuchsia-600";
      default:
        return "text-gray-600";
    }
  };

  const renderModalContent = () => {
    const items = getItems();

    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Formulario */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getFormIcon("sm")}
              {getFormTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Nombre *</Label>
                  <Input
                    placeholder="Nombre del elemento"
                    value={formData.nombre || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {activeConfigSubTab === "dj08-actividades" && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Código *</Label>
                    <Input
                      placeholder="Ej: 0002"
                      value={formData.codigo || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, codigo: e.target.value })
                      }
                      className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
                {isSubcategoria && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Categoría *</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.id_categoria || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_categoria: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccione una categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id_categoria} value={cat.id_categoria}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {activeConfigSubTab === "dj08-actividades" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Desde *</Label>
                    <DateInput
                      value={formData.fecha_inicio || ""}
                      onChange={(iso) =>
                        setFormData({ ...formData, fecha_inicio: iso })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Hasta *</Label>
                    <DateInput
                      value={formData.fecha_fin || ""}
                      onChange={(iso) =>
                        setFormData({ ...formData, fecha_fin: iso })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Ingresos obtenidos</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.ingresos ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ingresos: e.target.value })
                      }
                      className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Gastos deducibles</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.gastos ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, gastos: e.target.value })
                      }
                      className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeConfigSubTab === "dj08-tributos" && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Importe total pagado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.importe ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, importe: e.target.value })
                    }
                    className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {!isDj08Catalogo && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Descripción</Label>
                  <Input
                    placeholder="Descripción opcional"
                    value={formData.descripcion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    className="mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  type="submit"
                  className={`gap-2 bg-gradient-to-r ${getButtonGradient()} text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300`}
                >
                  <Save className="h-4 w-4" />
                  {editingItem ? "Actualizar" : "Agregar"}
                </Button>
                {editingItem && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingItem(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabla (oculta para catálogos DJ-08: la lista se ve en la vista principal) */}
        {!isDj08Catalogo && (
        <div className="rounded-md border border-gray-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className={getTableHeaderGradient()}>
              <TableRow>
                <TableHead className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  ID
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-gray-600" />
                    Nombre
                  </div>
                </TableHead>
                {isSubcategoria && (
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-gray-600" />
                      Categoría
                    </div>
                  </TableHead>
                )}
                {isEspecialidades && (
                  <>
                    <TableHead>Artistas</TableHead>
                    <TableHead>Estado</TableHead>
                  </>
                )}
                {!isDj08Catalogo && (
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      Descripción
                    </div>
                  </TableHead>
                )}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow
                  key={getItemId(item)}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-gray-700 rounded text-sm font-medium">
                      <Package className="h-3 w-3" />#{getItemId(item)}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{item.nombre}</TableCell>
                  {isSubcategoria && (
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        <FolderTree className="h-3 w-3" />
                        {item.categoria?.nombre || "-"}
                      </span>
                    </TableCell>
                  )}
                  {isEspecialidades && (
                    <>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-gray-700 rounded text-sm">
                          {item.artistas ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 rounded text-sm ${
                            item.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {item.activo ? "Activa" : "Desactivada"}
                        </span>
                      </TableCell>
                    </>
                  )}
                  {!isDj08Catalogo && (
                    <TableCell>{item.descripcion || "-"}</TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setFormData(item);
                        }}
                        className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isEspecialidades && !item.activo ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reactivar"
                          onClick={() =>
                            reactivarEspecialidad.mutate(item.id_especialidad)
                          }
                          className="text-green-600 hover:bg-green-50 hover:scale-110 transition-all"
                        >
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            isEspecialidades ? "Desactivar" : "Eliminar"
                          }
                          onClick={() => handleDelete(modalType!, item)}
                          className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell                      colSpan={isSubcategoria ? 5 : isEspecialidades ? 6 : 4}
                      className="text-center py-12"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">
                        No hay elementos registrados
                      </p>
                      <p className="text-sm mt-1">
                        Agregue elementos usando el formulario superior
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>
    );
  };

  const renderConfigListView = () => {
    // La sub-pestaña Importar no es un catálogo más: no tiene tabla, buscador,
    // botón "Nuevo" ni modal de edición. Devolviendo aquí antes de todo eso, no
    // hay que añadir una condición en cada uno.
    if (isMigracion) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-gray-900">Migración</h2>
          </div>
          <p className="text-sm text-gray-500">
            Migra el legacy completo. Sólo inserta: nunca borra ni actualiza.
          </p>
          <MigracionLegacy />
        </div>
      );
    }

    const currentItems = getItems();
    const filteredItems = currentItems.filter(
      (item: any) =>
        item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    const currentSubTab = configSubTabs.find(
      (t) => t.id === activeConfigSubTab,
    );

    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Header de la sección */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                activeConfigSubTab === "tipo-contrato"
                  ? "bg-blue-100"
                  : activeConfigSubTab === "estado-contrato"
                    ? "bg-green-100"
                    : activeConfigSubTab === "categorias"
                      ? "bg-purple-100"
                      : activeConfigSubTab === "subcategorias"
                        ? "bg-orange-100"
                        : activeConfigSubTab === "tipo-proveedores"
                          ? "bg-red-100"
                          : activeConfigSubTab === "tipo-convenios"
                            ? "bg-teal-100"
                            : activeConfigSubTab === "tipo-dependencia"
                              ? "bg-indigo-100"                            : activeConfigSubTab === "tipo-cuenta"
                              ? "bg-cyan-100"
                              : activeConfigSubTab === "dj08-actividades"
                                ? "bg-amber-100"
                                : activeConfigSubTab === "dj08-tributos"
                                  ? "bg-cyan-100"
                                  : "bg-rose-100"
              }`}
            >
              {activeConfigSubTab === "tipo-contrato" && (
                <ScrollText className="w-5 h-5 text-blue-600" />
              )}
              {activeConfigSubTab === "estado-contrato" && (
                <ToggleLeft className="w-5 h-5 text-green-600" />
              )}
              {activeConfigSubTab === "categorias" && (
                <FolderTree className="w-5 h-5 text-purple-600" />
              )}
              {activeConfigSubTab === "subcategorias" && (
                <Tag className="w-5 h-5 text-orange-600" />
              )}
              {activeConfigSubTab === "tipo-proveedores" && (
                <Truck className="w-5 h-5 text-red-600" />
              )}
              {activeConfigSubTab === "tipo-convenios" && (
                <FileText className="w-5 h-5 text-teal-600" />
              )}
              {activeConfigSubTab === "tipo-dependencia" && (
                <BuildingIcon className="w-5 h-5 text-indigo-600" />
              )}
              {activeConfigSubTab === "tipo-cuenta" && (
                <Wallet className="w-5 h-5 text-cyan-600" />
              )}
              {activeConfigSubTab === "tipo-entidad" && (
                <BuildingIcon className="w-5 h-5 text-rose-600" />
              )}
              {activeConfigSubTab === "dj08-actividades" && (
                <Briefcase className="w-5 h-5 text-amber-600" />
              )}
              {activeConfigSubTab === "dj08-tributos" && (
                <Coins className="w-5 h-5 text-cyan-600" />
              )}
              {activeConfigSubTab === "especialidades" && (
                <Palette className="w-5 h-5 text-fuchsia-600" />
              )}
              {isMigracion && <Database className="w-5 h-5 text-slate-600" />}
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {currentSubTab?.label}
            </h2>
            {isAnyLoading ? (
              <span className="text-sm text-blue-500">Cargando...</span>
            ) : (
              <span className="text-sm text-gray-500">
                ({filteredItems.length} elementos)
              </span>
            )}
          </div>
          <Button onClick={() => openModal(activeConfigSubTab)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        </div>

        {/* Buscador */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabla */}
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={getListHeaderGradient()}>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Package className={`h-4 w-4 ${getListIconColor()}`} />
                        ID
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <FileCheck
                          className={`h-4 w-4 ${getListIconColor()}`}
                        />
                        Nombre
                      </div>
                    </TableHead>
                    {activeConfigSubTab === "dj08-actividades" && (
                      <>
                        <TableHead>Código</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Gastos</TableHead>
                      </>
                    )}
                    {activeConfigSubTab === "dj08-tributos" && (
                      <TableHead className="text-right">Importe</TableHead>
                    )}
                    {activeConfigSubTab === "subcategorias" && (
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FolderTree
                            className={`h-4 w-4 ${getListIconColor()}`}
                          />
                          Categoría
                        </div>
                      </TableHead>
                    )}
                    {!isDj08Catalogo && (
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${getListIconColor()}`} />
                          Descripción
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          activeConfigSubTab === "subcategorias"
                            ? 5
                            : activeConfigSubTab === "especialidades"
                              ? 6
                              : activeConfigSubTab === "dj08-actividades"
                                ? 7
                                : 4
                        }
                        className="text-center py-12"
                      >
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <AlertCircle className="h-12 w-12 text-gray-300" />
                          </div>
                          <p className="text-lg font-medium mb-2">
                            No hay elementos registrados
                          </p>
                          <p className="text-sm">
                            Agregue elementos usando el botón "Nuevo"
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item: any) => (
                      <TableRow
                        key={getItemId(item)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setDetailModal({ isOpen: true, item })}
                      >
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 ${getListBadgeColors().bg} ${getListBadgeColors().text} rounded text-sm font-medium`}
                          >
                            <Package className="h-3 w-3" />#{getItemId(item)}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.nombre}
                        </TableCell>
                        {activeConfigSubTab === "dj08-actividades" && (
                          <>
                            <TableCell>{item.codigo}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {fmtFechaCorta(item.fecha_inicio)} — {" "}
                              {fmtFechaCorta(item.fecha_fin)}
                            </TableCell>
                            <TableCell className="text-right">
                              {fmtMonto(item.ingresos)}
                            </TableCell>
                            <TableCell className="text-right">
                              {fmtMonto(item.gastos)}
                            </TableCell>
                          </>
                        )}
                        {activeConfigSubTab === "dj08-tributos" && (
                          <TableCell className="text-right">
                            {fmtMonto(item.importe)}
                          </TableCell>
                        )}
                        {activeConfigSubTab === "subcategorias" && (
                          <TableCell>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                              <FolderTree className="h-3 w-3" />
                              {item.categoria?.nombre || "-"}
                            </span>
                          </TableCell>
                        )}
                        {!isDj08Catalogo && (
                          <TableCell className="text-gray-500">
                            {item.descripcion || "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingItem(item);
                                setFormData(item);
                                setModalType(activeConfigSubTab);
                              }}
                              className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDelete(activeConfigSubTab, item)
                              }
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
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={!!modalType}
          onClose={closeModal}
          title={currentSubTab?.label || ""}
        >
          {renderModalContent()}
        </Modal>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded shadow-lg">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Administración</h1>
            <p className="text-gray-500 text-sm">Gestión del sistema</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs de configuración */}
      <div className="relative flex items-center border-b bg-white rounded-t-lg">
        {/* Arrow left */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs("left")}
            className="absolute left-0 z-10 flex items-center justify-center w-8 h-full bg-gradient-to-r from-white via-white/90 to-transparent hover:bg-gray-50 transition-colors"
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
        )}

        {/* Tabs container */}
        <div
          ref={tabsRef}
          className="flex gap-1 overflow-x-auto hide-scrollbar px-2 pt-2 flex-1"
        >
          {configSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveConfigSubTab(tab.id);
                setSearchTerm("");
              }}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeConfigSubTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Arrow right */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs("right")}
            className="absolute right-0 z-10 flex items-center justify-center w-8 h-full bg-gradient-to-l from-white via-white/90 to-transparent hover:bg-gray-50 transition-colors"
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Vista de lista */}
      <div className="bg-white rounded-b-lg rounded-tr-lg p-6 border border-t-0">
        {renderConfigListView()}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-md bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg">
                    <Trash2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Confirmar Eliminación
                    </h3>
                    <p className="text-sm text-gray-500 ml-3 hidden sm:block">
                      Esta acción no se puede deshacer
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600">
                  ¿Está seguro de que desea eliminar este elemento?
                </p>
                {confirmDelete.item?.nombre && (
                  <p className="mt-2 text-sm font-medium text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                    {confirmDelete.item.nombre}
                  </p>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmDelete({ isOpen: false, type: null, item: null })
                  }
                >
                  Cancelar
                </Button>
                <Button
                  onClick={executeDelete}
                  className="gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Detail Modal */}
      {detailModal.isOpen &&
        detailModal.item &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-md bg-gradient-to-br ${getButtonGradient()} text-white shadow-lg`}
                    >
                      {getFormIcon("lg")}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {detailModal.item.nombre}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {configSubTabs.find((t) => t.id === activeConfigSubTab)
                          ?.label || "Detalle"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setDetailModal({ isOpen: false, item: null })
                    }
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
                      ID
                    </p>
                    <p className="font-bold text-gray-900">
                      #{getItemId(detailModal.item)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
                    <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                      Nombre
                    </p>
                    <p className="font-bold text-gray-900">
                      {detailModal.item.nombre}
                    </p>
                  </div>
                </div>
                {activeConfigSubTab === "dj08-actividades" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-md border border-amber-100">
                      <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">
                        Código
                      </p>
                      <p className="font-bold text-gray-900">
                        {detailModal.item.codigo || "-"}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-100">
                      <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">
                        Período
                      </p>
                      <p className="font-bold text-gray-900 text-sm">
                        {fmtFechaCorta(detailModal.item.fecha_inicio)} — {" "}
                        {fmtFechaCorta(detailModal.item.fecha_fin)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-md border border-green-100">
                      <p className="text-xs text-green-600 uppercase tracking-wider mb-1">
                        Ingresos
                      </p>
                      <p className="font-bold text-gray-900">
                        {fmtMonto(detailModal.item.ingresos)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-md border border-cyan-100">
                      <p className="text-xs text-cyan-600 uppercase tracking-wider mb-1">
                        Gastos
                      </p>
                      <p className="font-bold text-gray-900">
                        {fmtMonto(detailModal.item.gastos)}
                      </p>
                    </div>
                  </div>
                )}
                {activeConfigSubTab === "dj08-tributos" && (
                  <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-md border border-cyan-100">
                    <p className="text-xs text-cyan-600 uppercase tracking-wider mb-1">
                      Importe total pagado
                    </p>
                    <p className="font-bold text-gray-900">
                      {fmtMonto(detailModal.item.importe)}
                    </p>
                  </div>
                )}
                {activeConfigSubTab === "subcategorias" &&
                  detailModal.item.categoria && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-md border border-purple-100">
                      <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">
                        Categoría
                      </p>
                      <p className="font-bold text-gray-900">
                        {detailModal.item.categoria.nombre}
                      </p>
                    </div>
                  )}
                {!isDj08Catalogo && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Descripción
                    </p>
                    <p className="text-gray-700">
                      {detailModal.item.descripcion || "Sin descripción"}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDetailModal({ isOpen: false, item: null })}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    setEditingItem(detailModal.item);
                    setFormData(detailModal.item);
                    setModalType(activeConfigSubTab);
                    setDetailModal({ isOpen: false, item: null });
                  }}
                  className={`gap-2 bg-gradient-to-r ${getButtonGradient()} text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300`}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

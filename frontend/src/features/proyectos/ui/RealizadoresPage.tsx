import { useState, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/shared/ui/hooks/useDebounce";
import type { CasosUsoProyectos } from '../application/casos-uso';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Label,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
  ModalOverlay,
  FormModal,
  CreateButton,
  IconButton,
  MobileRecordCard,
} from "@/shared/ui/components";
import { ClienteFormContainer as ClienteForm } from '@/app/container/terceros-cliente-form';

import type {
  PersonaEtapa,
  PersonaEtapaCreate,
  Etapa,
  SolicitudServicio,
  PersonaLiquidacion,
} from "../domain/proyectos";
import type {
  Cliente,
  ClienteNatural,
  TipoEntidad,
} from "../domain/proyectos";
import type { Moneda } from "../domain/proyectos";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Search,
  Users,
  X,
  DollarSign,
  Eye,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCifra } from "@/utils/decimal";
import { mapConcurrent } from "@/utils/async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMonedaContratoDeEtapa } from "./hooks/useMonedaContrato";

type View = "list" | "form";

const REALIZADOR_FORM_ID = "realizador-form";

interface PersonaEtapaWithDetails extends PersonaEtapa {
  persona?: ClienteNatural;
  moneda?: Moneda;
}

interface ClienteConDetalles extends Cliente {
  primer_apellido?: string;
  segundo_apellido?: string;
  carnet_identidad?: string;
}

export function RealizadoresPage({ casosUso }: { casosUso: CasosUsoProyectos }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const etapaParam = searchParams.get("etapa");
  const [view, setView] = useState<View>("list");

  const [personasEtapa, setPersonasEtapa] = useState<PersonaEtapaWithDetails[]>(
    [],
  );
  // Datos completos solo de realizadores ya vinculados; el selector usa búsqueda remota.
  const [todosClientes, setTodosClientes] = useState<Cliente[]>([]);
  const [tiposEntidad, setTiposEntidad] = useState<TipoEntidad[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<PersonaLiquidacion[]>([]);
  const [currentEtapa, setCurrentEtapa] = useState<Etapa | null>(null);

  const [etapasSolicitud, setEtapasSolicitud] = useState<Etapa[]>([]);
  const [busquedaPersona, setBusquedaPersona] = useState("");
  const [personaSeleccionada, setPersonaSeleccionada] = useState<
    Cliente | ClienteConDetalles | null
  >(null);
  const [busquedaSolicitud, setBusquedaSolicitud] = useState("");
  const busquedaPersonaDebounced = useDebounce(busquedaPersona, 300);
  const busquedaSolicitudDebounced = useDebounce(busquedaSolicitud, 300);
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    useState<SolicitudServicio | null>(null);
  const [showDropdownPersona, setShowDropdownPersona] = useState(false);
  const [showDropdownSolicitud, setShowDropdownSolicitud] = useState(false);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const dropdownPersonaRef = useRef<HTMLDivElement>(null);
  const dropdownSolicitudRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingItem, setEditingItem] = useState<PersonaEtapaWithDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDebounce(searchTerm, 300);

  // Moneda del contrato de la etapa: fija, no se puede cambiar
  const { data: monedaContrato } = useMonedaContratoDeEtapa(casosUso, 
    formData.id_etapa
      ? Number(formData.id_etapa)
      : etapaParam
        ? Number(etapaParam)
        : null,
  );
  useEffect(() => {
    if (monedaContrato) {
      setFormData((prev) => ({ ...prev, id_moneda: monedaContrato }));
    }
  }, [monedaContrato]);

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: PersonaEtapaWithDetails | null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: clientesBusqueda = [] } = useQuery({
    queryKey: ["realizadores", "clientes", busquedaPersonaDebounced],
    queryFn: () => casosUso.getClientes(0, 50, undefined, busquedaPersonaDebounced || undefined),
  });
  const { data: solicitudes = [] } = useQuery({
    queryKey: ["realizadores", "solicitudes", busquedaSolicitudDebounced],
    queryFn: () => casosUso.getSolicitudes(0, 50, undefined, {
      search: busquedaSolicitudDebounced || undefined,
    }),
  });

  const personasPorId = useMemo(
    () => new Map(todosClientes.map((cliente) => [cliente.id_cliente, cliente])),
    [todosClientes],
  );
  const todosClientesPorId = useMemo(
    () => new Map(todosClientes.map((p) => [p.id_cliente, p])),
    [todosClientes],
  );
  const tiposEntidadPorId = useMemo(
    () => new Map(tiposEntidad.map((t) => [t.id_tipo_entidad, t])),
    [tiposEntidad],
  );
  const monedasPorId = useMemo(
    () => new Map(monedas.map((m) => [m.id_moneda, m])),
    [monedas],
  );
  const etapasPorId = useMemo(
    () => new Map(etapas.map((e) => [e.id_etapa, e])),
    [etapas],
  );

  const getTipoPersona = (idPersona: number): string => {
    const tipo = personasPorId.get(idPersona)?.tipo_persona;
    if (tipo === "TCP") return "tcp";
    if (tipo === "JURIDICA") return "juridica";
    return "natural";
  };

  const getLabelTipo = (idPersona: number): string => {
    const tipo = getTipoPersona(idPersona);
    if (tipo === "juridica") {
      const juridica = personasPorId.get(idPersona);
      const idTipoEntidad = juridica?.cliente_juridica?.id_tipo_entidad;
      const tipoEntidad = idTipoEntidad
        ? tiposEntidadPorId.get(idTipoEntidad)
        : undefined;
      if (tipoEntidad?.nombre) return tipoEntidad.nombre;
    }
    const labels: Record<string, string> = {
      natural: "Natural",
      tcp: "TCP",
      juridica: "Jurídica",
    };
    return labels[tipo] || "Natural";
  };

  const getClienteById = (idPersona: number): Cliente | undefined =>
    personasPorId.get(idPersona);

  const loadInitialData = async () => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["realizadores", "datos-iniciales", etapaParam || "todas"],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const [monedas, tiposEntidad, currentEtapa] = await Promise.all([
            casosUso.getMonedas(0, 100),
            casosUso.getTiposEntidad(),
            etapaParam ? casosUso.getEtapa(Number(etapaParam)) : Promise.resolve(null),
          ]);
          const liquidaciones: PersonaLiquidacion[] = [];
          let total: number | null = null;
          let skip = 0;
          while (total === null || skip < total) {
            const pagina = await casosUso.getLiquidaciones(skip, 100, (n) => { total = n; });
            if (!pagina.length) break;
            liquidaciones.push(...pagina);
            skip += pagina.length;
            if (total === null && pagina.length < 100) break;
          }
          return { monedas, tiposEntidad, currentEtapa, liquidaciones };
        },
      });
      setMonedas(data.monedas);
      setTiposEntidad(data.tiposEntidad);
      setCurrentEtapa(data.currentEtapa);
      setLiquidaciones(data.liquidaciones);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadPersonas = async (force = false) => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["realizadores", "listado", etapaParam || "todas"],
        staleTime: force ? 0 : 5 * 60 * 1000,
        queryFn: async () => {
          let allPersonas: PersonaEtapaWithDetails[] = [];
          let etapasData: Etapa[] = [];
          if (etapaParam) {
            const personas = await casosUso.getPersonasByEtapa(Number(etapaParam));
            allPersonas = personas.map((p) => ({ ...p }));
          } else {
            const todasSolicitudes: SolicitudServicio[] = [];
            let totalSolicitudes: number | null = null;
            let skipSolicitudes = 0;
            while (totalSolicitudes === null || skipSolicitudes < totalSolicitudes) {
              const pagina = await casosUso.getSolicitudes(skipSolicitudes, 100, (total) => { totalSolicitudes = total; });
              if (!pagina.length) break;
              todasSolicitudes.push(...pagina);
              skipSolicitudes += pagina.length;
              if (totalSolicitudes === null && pagina.length < 100) break;
            }
            const etapasPorSolicitud = await mapConcurrent(
              todasSolicitudes, 8,
              (solicitud) => casosUso.getEtapasBySolicitud(solicitud.id_solicitud_servicio).catch(() => []),
            );
            etapasData = etapasPorSolicitud.flat();
            const results = await mapConcurrent(etapasData, 12,
              (etapa) => casosUso.getPersonasByEtapa(etapa.id_etapa).catch(() => []),
            );
            allPersonas = results.flat().map((persona) => ({ ...persona }));
          }
          const ids = [...new Set(allPersonas.map((persona) => persona.id_persona))];
          const detalles = await mapConcurrent(ids, 8, (id) => casosUso.getCliente(id).catch(() => null));
          return {
            personas: allPersonas,
            etapas: etapasData,
            clientes: detalles.filter((cliente): cliente is Cliente => !!cliente),
          };
        },
      });
      setPersonasEtapa(data.personas);
      setEtapas(data.etapas);
      setTodosClientes(data.clientes);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (view === "list") loadPersonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const etapaId = Number(formData.id_etapa) || (etapaParam ? Number(etapaParam) : 0);
      const personaId = Number(formData.id_persona) || 0;
      const cobro = formData.cobro ? Number(formData.cobro) : 0;
      const monedaId = monedaContrato ?? (formData.id_moneda ? Number(formData.id_moneda) : undefined);

      if (editingItem) {
        if (!monedaId) throw new Error("No se pudo determinar la moneda del realizador.");
        const pagado = totalesPagado.get(`${editingItem.id_etapa}-${editingItem.id_persona}`) || 0;
        await casosUso.updatePersonaEtapa(
          editingItem.id_etapa,
          editingItem.id_persona,
          editingItem.id_moneda || monedaId,
          { id_persona: personaId, cobro, por_cobrar: Math.max(0, cobro - pagado) },
        );
        toast.success("Realizador actualizado");
      } else {
        const data: PersonaEtapaCreate = {
          id_etapa: etapaId,
          id_persona: personaId,
          cobro,
          id_moneda: monedaId,
        };
        await casosUso.createPersonaEtapa(data);
        toast.success("Creado");
      }
      setView("list");
      resetForm();
      await loadPersonas(true);
    } catch (error: any) {
      toast.error(error.message || "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    etapaId: number,
    personaId: number,
    nombre: string,
  ) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar realizador?",
      message: `¿Está seguro de eliminar a "${nombre}" de esta etapa?`,
      onConfirm: async () => {
        try {
          await casosUso.deletePersonaEtapa(etapaId, personaId);
          toast.success("Eliminado");
          loadPersonas(true);
        } catch (error: any) {
          toast.error(error.message || "Error");
        }
      },
      type: "danger",
    });
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({});
    setPersonaSeleccionada(null);
    setBusquedaPersona("");
    setSolicitudSeleccionada(null);
    setBusquedaSolicitud("");
    setEtapasSolicitud([]);
    setShowDropdownPersona(false);
    setShowDropdownSolicitud(false);
  };

  const openEditForm = (item: PersonaEtapaWithDetails) => {
    const cliente = todosClientesPorId.get(item.id_persona) || null;
    setEditingItem(item);
    setPersonaSeleccionada(cliente);
    setBusquedaPersona(getPersonaName(item.id_persona));
    setFormData({
      id_etapa: item.id_etapa,
      id_persona: item.id_persona,
      cobro: String(item.cobro ?? 0),
      id_moneda: item.id_moneda || "",
    });
    setView("form");
  };

  const openForm = () => {
    resetForm();
    if (etapaParam) {
      setFormData({
        id_etapa: Number(etapaParam),
        id_moneda: monedaContrato || currentEtapa?.id_moneda || "",
      });
    }
    setView("form");
  };

  const componerNombre = (
    ...partes: Array<string | null | undefined>
  ): string =>
    partes
      .filter((parte): parte is string => !!parte && parte.trim() !== "")
      .join(" ");

  const getPersonaName = (id: number): string => {
    const cliente = personasPorId.get(id);
    if (!cliente) return `Persona #${id}`;
    const detalle = cliente.cliente_natural || cliente.cliente_tcp;
    const nombre = detalle
      ? componerNombre(detalle.nombre, detalle.primer_apellido, detalle.segundo_apellido)
      : "";
    if (nombre) return nombre;
    return cliente.nombre ||
      (cliente.cliente_juridica?.codigo_reup
        ? `Entidad ${cliente.cliente_juridica.codigo_reup}`
        : `Persona #${id}`);
  };

  const getPersonaCI = (id: number) => {
    const cliente = personasPorId.get(id);
    return cliente?.cliente_natural?.carnet_identidad ||
      cliente?.cliente_tcp?.carnet_identidad || "N/A";
  };

  const getMonedaSymbol = (id?: number) => {
    if (!id) return "";
    return monedasPorId.get(id)?.simbolo || "";
  };

  const getMonedaDenominacion = (id?: number) => {
    if (!id) return "";
    return monedasPorId.get(id)?.denominacion || "";
  };

  const getSolicitudByEtapa = (idEtapa: number): number | undefined => {
    return (
      etapasPorId.get(idEtapa)?.id_solicitud_servicio ??
      currentEtapa?.id_solicitud_servicio
    );
  };

  const filteredPersonas = useMemo(() => {
    const uniqueMap = new Map<number, PersonaEtapaWithDetails>();
    personasEtapa.forEach((p) => {
      if (!uniqueMap.has(p.id_persona)) {
        uniqueMap.set(p.id_persona, p);
      }
    });
    const uniquePersonas = Array.from(uniqueMap.values());

    if (!searchTerm) return uniquePersonas;
    return uniquePersonas.filter(
      (p) =>
        getPersonaName(p.id_persona)
          .toLowerCase()
          .includes(deferredSearchTerm.toLowerCase()) ||
        getPersonaCI(p.id_persona)
          .toLowerCase()
          .includes(deferredSearchTerm.toLowerCase()),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personasEtapa, deferredSearchTerm, todosClientes]);

  const totalesPagado = useMemo(() => {
    const map = new Map<string, number>();
    liquidaciones.forEach((l) => {
      if (l.confirmado && l.id_persona != null && l.id_etapa != null) {
        const key = `${l.id_etapa}-${l.id_persona}`;
        map.set(key, (map.get(key) || 0) + (Number(l.importe) || 0));
      }
    });
    return map;
  }, [liquidaciones]);

  const personasFiltradas = clientesBusqueda;
  const solicitudesFiltradas = solicitudes;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownPersonaRef.current &&
        !dropdownPersonaRef.current.contains(e.target as Node)
      ) {
        setShowDropdownPersona(false);
      }
      if (
        dropdownSolicitudRef.current &&
        !dropdownSolicitudRef.current.contains(e.target as Node)
      ) {
        setShowDropdownSolicitud(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSeleccionarPersona = (c: Cliente | ClienteConDetalles) => {
    setTodosClientes((prev) => [c as Cliente, ...prev.filter((item) => item.id_cliente !== c.id_cliente)]);
    setPersonaSeleccionada(c);
    const nat = c.cliente_natural;
    const tcp = (c as any).cliente_tcp;
    const nombreCompleto = nat
      ? `${nat.nombre || ""} ${nat.primer_apellido || ""} ${nat.segundo_apellido || ""}`.trim()
      : tcp
        ? `${tcp.nombre || ""} ${tcp.primer_apellido || ""} ${tcp.segundo_apellido || ""}`.trim()
        : c.nombre || "";
    setBusquedaPersona(nombreCompleto);
    setShowDropdownPersona(false);
    setFormData((prev) => ({ ...prev, id_persona: c.id_cliente }));
  };

  const handleSeleccionarSolicitud = async (s: SolicitudServicio) => {
    setSolicitudSeleccionada(s);
    setBusquedaSolicitud(s.numero || s.codigo_solicitud || "");
    setShowDropdownSolicitud(false);
    setFormData((prev) => ({ ...prev, id_etapa: "" }));
    setEtapasSolicitud([]);
    try {
      const etapas = await casosUso.getEtapasBySolicitud(
        s.id_solicitud_servicio,
      );
      setEtapasSolicitud(etapas);
    } catch {
      setEtapasSolicitud([]);
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {etapaParam && (
            <Button
              variant="outline"
              onClick={() => navigate('/proyectos/etapas')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-3 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Realizadores</h1>
            <p className="text-gray-500 mt-1">
              {currentEtapa
                ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}`
                : "Gestión de realizadores"}
              {` · ${filteredPersonas.length} persona(s)`}
            </p>
          </div>
        </div>
        <CreateButton label="Nuevo Realizador" onClick={() => openForm()} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPersonas.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
            {searchTerm
              ? "No se encontraron realizadores que coincidan con la búsqueda"
              : "No hay realizadores registrados"}
          </div>
        ) : (
          filteredPersonas.map((item) => {
            const pagado = totalesPagado.get(`${item.id_etapa}-${item.id_persona}`) || 0;
            const saldo = Number(item.cobro || 0) - Number(pagado);
            return (
              <MobileRecordCard
                key={`${item.id_etapa}-${item.id_persona}`}
                title={getPersonaName(item.id_persona)}
                subtitle={getLabelTipo(item.id_persona)}
                icon={<Users className="h-4 w-4" />}
                badges={
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getTipoPersona(item.id_persona) === "natural"
                      ? "bg-brand-100 text-brand-800"
                      : getTipoPersona(item.id_persona) === "tcp"
                        ? "bg-brand-100 text-brand-800"
                        : "bg-green-100 text-green-800"
                  }`}>
                    {getLabelTipo(item.id_persona)}
                  </span>
                }
                fields={[
                  { label: 'Cobro', value: `${getMonedaSymbol(item.id_moneda)} ${formatCifra(item.cobro)}` },
                  { label: 'Pagado', value: `${getMonedaSymbol(item.id_moneda)} ${formatCifra(pagado)}` },
                  { label: 'Por pagar', value: <span className={saldo > 0 ? 'text-red-600' : 'text-green-600'}>{getMonedaSymbol(item.id_moneda)} {formatCifra(saldo)}</span> },
                ]}
                onOpen={() => setDetailModal({ isOpen: true, item })}
                openLabel={`Ver detalle del realizador ${getPersonaName(item.id_persona)}`}
                actions={
                  <>
                    <IconButton
                      label="Editar realizador"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => openEditForm(item)}
                    />
                    <IconButton
                      label="Ver liquidaciones"
                      icon={<DollarSign className="h-4 w-4" />}
                      onClick={() => navigate(`/proyectos/liquidaciones?solicitud=${getSolicitudByEtapa(item.id_etapa) || ""}&etapa=${item.id_etapa}&persona=${item.id_persona}`)}
                    />
                    <IconButton
                      label="Eliminar realizador"
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                      onClick={() => handleDelete(item.id_etapa, item.id_persona, getPersonaName(item.id_persona))}
                    />
                  </>
                }
              />
            );
          })
        )}
      </div>

      <Card className="hidden overflow-hidden shadow-sm border-gray-200 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-brand-50 to-brand-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-brand-600" />
                    Cobro
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-brand-600" />
                    Pagado
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    Por pagar
                  </div>
                </TableHead>
                <TableHead>Liquidaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-500"
                  >
                    {searchTerm
                      ? "No se encontraron realizadores que coincidan con la búsqueda"
                      : "No hay realizadores registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonas.map((item) => {
                  return (
                    <TableRow
                      key={`${item.id_etapa}-${item.id_persona}`}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setDetailModal({ isOpen: true, item })}
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          {getPersonaName(item.id_persona)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getTipoPersona(item.id_persona) === "natural"
                              ? "bg-brand-100 text-brand-800"
                              : getTipoPersona(item.id_persona) === "tcp"
                                ? "bg-brand-100 text-brand-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {getLabelTipo(item.id_persona)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {getMonedaSymbol(item.id_moneda)}{" "}
                        {formatCifra(item.cobro)}
                        {item.asignada_por_migracion && (
                          <span
                            className="inline-flex items-center ml-1.5 align-middle text-amber-500 cursor-help"
                            title={
                              item.motivo_asignacion ||
                              "La etapa de esta persona fue asignada por la migración del legacy."
                            }
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-brand-700">
                        {getMonedaSymbol(item.id_moneda)}{" "}
                        {formatCifra(
                          totalesPagado.get(
                            `${item.id_etapa}-${item.id_persona}`,
                          ) || 0,
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(() => {
                          const pagado =
                            totalesPagado.get(
                              `${item.id_etapa}-${item.id_persona}`,
                            ) || 0;
                          const saldo =
                            Number(item.cobro || 0) - Number(pagado);
                          return (
                            <span
                              className={
                                saldo > 0 ? "text-red-600" : "text-green-600"
                              }
                            >
                              {getMonedaSymbol(item.id_moneda)}{" "}
                              {formatCifra(saldo)}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/proyectos/liquidaciones?solicitud=${getSolicitudByEtapa(item.id_etapa) || ""}&etapa=${item.id_etapa}&persona=${item.id_persona}`,
                            )
                          }
                          className="gap-1 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Liquidaciones
                        </Button>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(item)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                            title="Editar realizador"
                            aria-label="Editar realizador"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(
                                item.id_etapa,
                                item.id_persona,
                                getPersonaName(item.id_persona),
                              )
                            }
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );

  const renderForm = () => (
    <form
      id={REALIZADOR_FORM_ID}
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="p-4 md:p-6"
    >
      <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Fila 1: Buscador + Botón Nuevo Realizador */}
            <div className="flex gap-2 items-start">
              <div ref={dropdownPersonaRef} className="relative flex-1">
                <Label className="text-sm font-medium">Persona *</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar persona..."
                    value={busquedaPersona}
                    disabled={!!personaSeleccionada}
                    onChange={(e) => {
                      setBusquedaPersona(e.target.value);
                      setShowDropdownPersona(true);
                      setPersonaSeleccionada(null);
                    }}
                    onFocus={() => setShowDropdownPersona(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white disabled:bg-gray-100"
                  />
                  {personaSeleccionada && (
                    <button
                      type="button"
                      onClick={() => {
                        setPersonaSeleccionada(null);
                        setBusquedaPersona("");
                        setFormData((prev) => ({ ...prev, id_persona: "" }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showDropdownPersona && personasFiltradas.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {personasFiltradas.map((p) => {
                      const nat = p.cliente_natural;
                      const tcp = (p as any).cliente_tcp;
                      const nombreCompleto = nat
                        ? `${nat.nombre || ""} ${nat.primer_apellido || ""} ${nat.segundo_apellido || ""}`.trim()
                        : tcp
                          ? `${tcp.nombre || ""} ${tcp.primer_apellido || ""} ${tcp.segundo_apellido || ""}`.trim()
                          : p.nombre;
                      const ci =
                        nat?.carnet_identidad || tcp?.carnet_identidad || "";
                      return (
                        <button
                          key={p.id_cliente}
                          type="button"
                          onClick={() => handleSeleccionarPersona(p)}
                          className="w-full text-left px-4 py-2 hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">
                            {nombreCompleto}
                          </span>
                          {ci && (
                            <span className="text-gray-400 text-sm ml-2">
                              - {ci}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-2">
                            ({p.tipo_persona})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {showDropdownPersona &&
                  personasFiltradas.length === 0 &&
                  busquedaPersona && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                      No se encontraron resultados
                    </div>
                  )}
              </div>
              <div className="pt-7">
                <button
                  type="button"
                  onClick={() => setShowNuevoClienteModal(true)}
                  className="py-2 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Realizador
                </button>
              </div>
            </div>

            {/* Fila 2: Solicitud + Etapa (solo sin etapaParam) - lado a lado */}
            {!etapaParam && (
              <div className="flex gap-2 items-start">
                <div ref={dropdownSolicitudRef} className="relative flex-1">
                  <Label className="text-sm font-medium">Solicitud *</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar solicitud..."
                      value={busquedaSolicitud}
                      onChange={(e) => {
                        setBusquedaSolicitud(e.target.value);
                        setShowDropdownSolicitud(true);
                        setSolicitudSeleccionada(null);
                      }}
                      onFocus={() => setShowDropdownSolicitud(true)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    />
                  </div>
                  {showDropdownSolicitud && solicitudesFiltradas.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {solicitudesFiltradas.map((s) => (
                        <button
                          key={s.id_solicitud_servicio}
                          type="button"
                          onClick={() => handleSeleccionarSolicitud(s)}
                          className="w-full text-left px-4 py-2 hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">
                            {s.numero || s.codigo_solicitud}
                          </span>
                          {s.descripcion && (
                            <span className="text-gray-500 text-sm ml-2">
                              - {s.descripcion}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdownSolicitud &&
                    solicitudesFiltradas.length === 0 &&
                    busquedaSolicitud && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                        No se encontraron resultados
                      </div>
                    )}
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">Etapa *</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={formData.id_etapa || ""}
                    onChange={(e: any) => {
                      const etapaId = Number(e.target.value);
                      const etapaSel = etapasSolicitud.find(
                        (et) => et.id_etapa === etapaId,
                      );
                      setFormData({
                        ...formData,
                        id_etapa: etapaId,
                        id_moneda:
                          monedaContrato ||
                          etapaSel?.id_moneda ||
                          formData.id_moneda ||
                          "",
                      });
                    }}
                    disabled={!solicitudSeleccionada}
                  >
                    <option value="">Seleccionar etapa</option>
                    {etapasSolicitud.map((e) => (
                      <option key={e.id_etapa} value={e.id_etapa}>
                        {e.nombre_etapa || `Etapa #${e.numero_etapa}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Fila 3: Cobro + Moneda (lado a lado) */}
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Label className="text-sm font-medium">Cobro</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cobro || ""}
                  onChange={(e: any) =>
                    setFormData({ ...formData, cobro: e.target.value })
                  }
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">Moneda</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                  value={formData.id_moneda || currentEtapa?.id_moneda || ""}
                  disabled={!!monedaContrato}
                  onChange={(e: any) =>
                    setFormData({ ...formData, id_moneda: e.target.value })
                  }
                >
                  <option value="">Seleccionar moneda</option>
                  {monedas.map((m) => (
                    <option key={m.id_moneda} value={m.id_moneda}>
                      {m.denominacion}
                    </option>
                  ))}
                </select>
                {monedaContrato && (
                  <p className="mt-1 text-xs text-gray-500">
                    Moneda del contrato (no se puede cambiar)
                  </p>
                )}
              </div>
            </div>
          </div>
      </div>
      </form>
  );

  return (
    <div className="p-4 md:p-6">
      {view === 'list' && renderList()}

      <FormModal
        isOpen={view === "form"}
        onClose={() => { setView("list"); resetForm(); }}
        title={editingItem ? "Editar Realizador" : "Nuevo Realizador"}
        subtitle={currentEtapa
          ? `Etapa: ${currentEtapa.nombre_etapa || `#${currentEtapa.numero_etapa}`}`
          : "Asignar realizador a etapa"}
        icon={<Users className="h-6 w-6" />}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setView("list"); resetForm(); }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={REALIZADOR_FORM_ID}
              disabled={isSaving}
              isLoading={isSaving}
              className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingItem ? "Guardar cambios" : "Guardar"}
            </Button>
          </>
        }
      >
        {renderForm()}
      </FormModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {detailModal.isOpen &&
        detailModal.item && (
          <ModalOverlay
            isOpen={true}
            onClose={() => setDetailModal({ isOpen: false, item: null })}
          >
            <div className="bg-white shadow-2xl max-w-lg w-full max-h-[100dvh] overflow-auto animate-scale-in sm:max-h-[90dvh] sm:rounded-2xl">
              <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-brand-50 to-brand-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg">
                      <Users className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {getPersonaName(detailModal.item.id_persona)}
                      </h3>
                      {(() => {
                        const cli = getClienteById(detailModal.item.id_persona);
                        return (
                          <p className="text-sm text-gray-500 font-mono">
                            Codigo cliente:{" "}
                            {(cli as any)?.codigo || (cli as any)?.nit || "N/A"}
                          </p>
                        );
                      })()}
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
              <div className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-brand-50 to-brand-50 p-4 rounded-xl border border-brand-100">
                    <p className="text-xs text-brand-600 uppercase tracking-wider mb-1">
                      Cobro
                    </p>
                    <p className="font-bold text-brand-900 text-xl">
                      {getMonedaSymbol(detailModal.item.id_moneda)}{" "}
                      {formatCifra(detailModal.item.cobro)}
                    </p>
                    {detailModal.item.asignada_por_migracion && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          {detailModal.item.motivo_asignacion ||
                            "La etapa de esta persona fue asignada por la migración del legacy."}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Moneda
                    </p>
                    <p className="font-bold text-gray-900">
                      {getMonedaDenominacion(detailModal.item.id_moneda) ||
                        "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Liquidada
                    </p>
                    {detailModal.item.liquidada ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        No
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Por Cobrar
                    </p>
                    <p className="font-bold text-gray-900">
                      {getMonedaSymbol(detailModal.item.id_moneda) || ""}{" "}
                      {formatCifra(detailModal.item.por_cobrar)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    detailModal.item &&
                    navigate(
                      `/proyectos/liquidaciones?persona=${detailModal.item.id_persona}`,
                    )
                  }
                  className="gap-2 text-brand-600 border-brand-200 hover:bg-brand-50"
                >
                  <Eye className="h-4 w-4" />
                  Ver Liquidaciones
                </Button>
                <button
                  onClick={() => setDetailModal({ isOpen: false, item: null })}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

      <ModalOverlay
        isOpen={showNuevoClienteModal}
        onClose={() => setShowNuevoClienteModal(false)}
        ariaLabel="Nuevo Cliente"
      >
            <div className="bg-white shadow-2xl max-w-4xl w-full max-h-[100dvh] overflow-auto animate-scale-in sm:max-h-[90dvh] sm:rounded-2xl">
              <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-brand-50 to-brand-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg">
                      <Users className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Nuevo Cliente
                      </h3>
                      <p className="text-sm text-gray-500">
                        Crear nuevo cliente para asignar como realizador
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNuevoClienteModal(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <ClienteForm
                  editingCliente={null}
                  isProveedorView={false}
                  onCancel={() => {
                    setShowNuevoClienteModal(false);
                  }}
                  onSubmit={async (data: any) => {
                    try {
                      const nuevoCliente =
                        await casosUso.createCliente(data);
                      handleSeleccionarPersona(nuevoCliente);
                      setShowNuevoClienteModal(false);
                      toast.success("Cliente creado");
                      queryClient.invalidateQueries({
                        queryKey: ["clientes-all"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["realizadores", "clientes"],
                      });
                      queryClient.invalidateQueries({ queryKey: ["clientes"] });
                    } catch (error: any) {
                      toast.error(error.message || "Error al crear cliente");
                    }
                  }}
                />
              </div>
            </div>
      </ModalOverlay>
    </div>
  );
}

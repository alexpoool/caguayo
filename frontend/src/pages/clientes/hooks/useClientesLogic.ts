import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import {
  clientesService,
  tiposEntidadService,
  clienteNaturalService,
  clienteJuridicaService,
  clienteTCPService,
  cuentasService,
  monedaService,
} from "../../../services/api";
import { dependenciasService } from "../../../services/administracion";
import type {
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  ClienteNatural,
  ClienteJuridica,
  ClienteTCP,
  Cuenta,
} from "../../../types/ventas";
import toast from "react-hot-toast";

type TipoPersona = "NATURAL" | "JURIDICA" | "TCP";

const DEFAULT_LIMIT = 100;

export function useClientesLogic() {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "form" | "detail">("list");

  const isProveedorView =
    location.pathname.includes("/compra/clientes") ||
    location.search.includes("tipo=proveedor");

  const defaultTipoRelacion = isProveedorView ? "PROVEEDOR" : "CLIENTE";

  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>("NATURAL");
  const [datosNatural, setDatosNatural] = useState<ClienteNatural | null>(null);
  const [datosJuridica, setDatosJuridica] = useState<ClienteJuridica | null>(
    null
  );
  const [datosTCP, setDatosTCP] = useState<ClienteTCP | null>(null);
  const [cuentasCliente, setCuentasCliente] = useState<Cuenta[]>([]);
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
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    cliente: Cliente | null;
  }>({
    isOpen: false,
    cliente: null,
  });

  // ── Lista infinita de clientes ────────────────────────────────────────────
  const tipoRelacionFilter = isProveedorView ? "PROVEEDOR,AMBAS" : "CLIENTE,AMBAS";

  const {
    items: clientes,
    isFetchingMore,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<Cliente>({
    queryKeyBase: "clientes",
    queryFn: (skip, limit, _search) =>
      clientesService.getClientes(skip, limit, tipoRelacionFilter),
    limit: DEFAULT_LIMIT,
    extraQueryKeyParams: [isProveedorView],
  });

  const { data: tiposEntidad = [] } = useQuery({
    queryKey: ["tiposEntidad"],
    queryFn: () => tiposEntidadService.getTiposEntidad(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["monedas"],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: provincias = [] } = useQuery({
    queryKey: ["provincias"],
    queryFn: () => dependenciasService.getProvincias(),
  });

  // ── Mutaciones ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: ClienteCreate) => {
      const cliente = await clientesService.createCliente(data);
      return cliente;
    },
    onSuccess: () => {
      refresh();
      toast.success("Cliente creado correctamente");
      setView("list");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear cliente"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteUpdate }) =>
      clientesService.updateCliente(id, data),
    onSuccess: () => {
      refresh();
      toast.success("Cliente actualizado correctamente");
      setView("list");
      setEditingCliente(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar cliente"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientesService.deleteCliente,
    onSuccess: () => {
      refresh();
      toast.success("Cliente eliminado correctamente");
    },
    onError: (error: any) => {
      const message = error?.message || "Error al eliminar cliente";
      toast.error(message);
    },
  });

  // Handlers
  const handleViewDetails = async (cliente: Cliente) => {
    setViewingCliente(cliente);

    try {
      // API call placeholder for real logic
      setView("detail");
    } catch (error) {
      toast.error("Error al cargar detalles del cliente");
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setTipoPersona(cliente.tipo_persona || "NATURAL");
    setCuentasCliente(cliente.cuentas || []);
    setView("form");
  };

  const handleDelete = (cliente: Cliente) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar cliente?",
      message: `¿Está seguro de eliminar al cliente "${cliente.nombre}"?`,
      onConfirm: () => deleteMutation.mutate(cliente.id_cliente),
      type: "danger",
    });
  };

  const filteredClientes = useMemo(() => {
    let result = clientes;

    if (isProveedorView) {
      result = result.filter(
        (c) => c.tipo_relacion === "PROVEEDOR" || c.tipo_relacion === "AMBAS"
      );
    }

    if (!searchTerm) return result;
    return result.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm, isProveedorView]);

  return {
    view,
    setView,
    isProveedorView,
    defaultTipoRelacion,
    editingCliente,
    setEditingCliente,
    viewingCliente,
    setViewingCliente,
    tipoPersona,
    setTipoPersona,
    datosNatural,
    setDatosNatural,
    datosJuridica,
    setDatosJuridica,
    datosTCP,
    setDatosTCP,
    cuentasCliente,
    setCuentasCliente,
    confirmModal,
    setConfirmModal,
    detailModal,
    setDetailModal,
    searchTerm,
    setSearchTerm: setSearch,
    clientes,
    tiposEntidad,
    monedas,
    provincias,
    createMutation,
    updateMutation,
    deleteMutation,
    handleViewDetails,
    handleEdit,
    handleDelete,
    filteredClientes,
    hasMore,
    loadMore,
    isFetchingMore,
    navigate,
  };
}
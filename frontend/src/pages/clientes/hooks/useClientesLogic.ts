import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import {
  clientesService,
  tiposEntidadService,
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
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openForm = () => setIsFormOpen(true);
  const closeForm = () => setIsFormOpen(false);

  const isProveedorView =
    location.pathname.includes("/compra/clientes") ||
    location.pathname.includes("/compra/proveedores") ||
    location.search.includes("tipo=proveedor");

  const defaultTipoRelacion = isProveedorView ? "PROVEEDOR" : "CLIENTE";

  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
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

  // ── Lista infinita de clientes ────────────────────────────────────────────
  const tipoRelacionFilter = isProveedorView ? "PROVEEDOR,AMBAS" : "CLIENTE,AMBAS";

  const {
    items: clientes,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
    total: totalClientesDB,
  } = useInfiniteList<Cliente>({
    queryKeyBase: "clientes",
    queryFn: (skip, limit, search, onTotal) =>
      clientesService.getClientes(
        skip,
        limit,
        tipoRelacionFilter,
        search,
        onTotal
      ),
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
      setIsFormOpen(false);
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
      setIsFormOpen(false);
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
  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setTipoPersona(cliente.tipo_persona || "NATURAL");
    setCuentasCliente(cliente.cuentas || []);
    setIsFormOpen(true);
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

  return {
    isFormOpen,
    openForm,
    closeForm,
    isProveedorView,
    defaultTipoRelacion,
    editingCliente,
    setEditingCliente,
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
    searchTerm,
    setSearchTerm: setSearch,
    clientes,
    tiposEntidad,
    monedas,
    provincias,
    createMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleDelete,
    hasMore,
    loadMore,
    isLoading,
    isFetchingMore,
    totalClientesDB,
    navigate,
  };
}
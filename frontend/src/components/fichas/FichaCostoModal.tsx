import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Save,
  Package,
  Users,
  Percent,
  FileSignature,
  Wallet,
  Search,
  Pencil,
  Check,
  ChevronRight,
  FileDown,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  Input,
  SearchSelect,
  DateInput,
} from "../ui";
import type { SearchSelectOption } from "../ui";
import {
  fichasCostoService,
  fichasTarifasService,
  productosService,
} from "../../services/api";
import { calcularFicha } from "../../utils/fichaCostoCalculo";
import { formatFecha, formatFechaMesLargo } from "../../utils/fecha";
import type {
  FichaCostoRead,
  FichaInsumoInput,
  FichaManoObraInput,
} from "../../types/fichaCosto";

// Insumo proveniente del catálogo de productos (solo la norma de consumo es editable)
interface InsumoProductoRow {
  id_producto: number;
  codigo: string;
  nombre: string;
  um: string;
  precio_unitario: string;
  norma_consumo: string;
}

// Otro insumo: entrada manual sin código (electricidad, agua, etc.)
interface OtroInsumoRow {
  nombre: string;
  um: string;
  norma_consumo: string;
  precio_unitario: string;
}

// Mano de obra: selector del catálogo de tarifas (solo la norma de tiempo es editable)
interface ManoObraRow {
  id_tarifa: number | null;
  categoria: string;
  tarifa_horaria: string;
  norma_tiempo: string;
}

// Coeficientes precargados con los valores de la entidad (hoja Gastos del Excel)
const DEFAULTS = {
  pct_energia: "3",
  pct_agua: "0.5",
  pct_otros_gastos_directos: "17",
  pct_vacaciones: "9.09",
  coef_gastos_asociados: "0.2587298394047821",
  coef_gastos_generales: "0.4195769613893774",
  coef_gastos_distribucion: "0.3216931992058406",
  coef_gastos_financieros: "1.4939751466265447",
  pct_seguridad_social: "12.5",
  pct_fuerza_trabajo: "5",
  pct_utilidad: "25",
  pct_impuesto_ventas: "18",
  gasto_combustible: "0",
  gasto_osde: "0",
};

const num = (v: string) => parseFloat(v) || 0;
// Los campos Decimal de la API llegan como string; aceptar ambos
const fmt = (v: number | string) =>
  Number(v).toLocaleString("es-CU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Hojas del documento base (Excel) + catálogos: Ficha, Materiales, Mano de obra, Gastos, Tarifas, Productos
type HojaId = "ficha" | "materiales" | "mano_obra" | "gastos" | "tarifas" | "productos";

const HOJAS: { id: HojaId; label: string }[] = [
  { id: "ficha", label: "Ficha" },
  { id: "materiales", label: "Materiales" },
  { id: "mano_obra", label: "Mano de obra" },
  { id: "gastos", label: "Gastos" },
  { id: "tarifas", label: "Tarifas" },
  { id: "productos", label: "Productos" },
];

const UM_PRODUCTO = "UNO"; // Unidad de medida del producto (de momento siempre UNO)

interface FichaCostoModalProps {
  isOpen: boolean;
  producto: { id_producto: number; nombre: string; codigo?: string } | null;
  cantidad?: number;
  fecha?: string;
  onClose: () => void;
  onAccept?: (precio: number) => void;
}

export function FichaCostoModal({ isOpen, producto, cantidad = 1, fecha, onClose, onAccept }: FichaCostoModalProps) {
  const queryClient = useQueryClient();
  const [hojaActiva, setHojaActiva] = useState<HojaId>("ficha");
  // Vista inicial: lista de fichas del producto, o directamente el formulario
  const [vista, setVista] = useState<"lista" | "form">("lista");
  // Ficha en edición (null = creando una nueva)
  const [fichaEditando, setFichaEditando] = useState<FichaCostoRead | null>(null);
  const [coef, setCoef] = useState<Record<string, string>>({ ...DEFAULTS });
  const [insumosProducto, setInsumosProducto] = useState<InsumoProductoRow[]>([]);
  const [otrosInsumos, setOtrosInsumos] = useState<OtroInsumoRow[]>([
    { nombre: "", um: "", norma_consumo: "", precio_unitario: "" },
  ]);
  const [manoObra, setManoObra] = useState<ManoObraRow[]>([
    { id_tarifa: null, categoria: "", tarifa_horaria: "", norma_tiempo: "" },
  ]);
  const [elaboradoPor, setElaboradoPor] = useState("");
  const [aprobadoPor, setAprobadoPor] = useState("");
  const [fechaAprobacion, setFechaAprobacion] = useState("");

  // Búsqueda en la hoja Productos (solo lectura)
  const [busquedaProductos, setBusquedaProductos] = useState("");

  // Catálogo de tarifas (hoja Tarifas)
  const [nuevaTarifa, setNuevaTarifa] = useState({ categoria: "", tarifa_horaria: "" });
  const [editandoTarifa, setEditandoTarifa] = useState<{ id: number; categoria: string; tarifa_horaria: string } | null>(null);
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<number | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const today = new Date().toISOString().split("T")[0];
  const fechaAnexo = fecha || today;
  const fechaFmt = formatFechaMesLargo(fechaAnexo);

  // No. de ficha estimado (último id + 1); al guardar, el backend asigna el id real
  const { data: ultimaFichaLista } = useQuery({
    queryKey: ["ficha-ultima-global"],
    queryFn: () => fichasCostoService.getFichas({ limit: 1 }),
    enabled: isOpen,
  });
  const numeroEstimado = (ultimaFichaLista?.[0]?.id_ficha ?? 0) + 1;

  // Fichas ya guardadas del producto actual
  const {
    data: fichasProducto,
    isSuccess: fichasProductoOK,
  } = useQuery({
    queryKey: ["fichas-producto", producto?.id_producto],
    queryFn: () =>
      fichasCostoService.getFichas({ id_producto: producto!.id_producto, limit: 100 }),
    enabled: isOpen && !!producto,
  });

  // Al abrir: si el producto tiene fichas previas, mostrar la lista; si no, el formulario
  useEffect(() => {
    if (!isOpen || !fichasProductoOK) return;
    setFichaEditando(null);
    setVista((fichasProducto ?? []).length > 0 ? "lista" : "form");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fichasProductoOK]);

  // Catálogo de productos (insumos + hoja Productos)
  const { data: productos = [] } = useQuery({
    queryKey: ["productos-ficha"],
    queryFn: () => productosService.getProductos(0, 500),
    enabled: isOpen,
  });

  // Catálogo de tarifas (hoja Tarifas + selector de mano de obra)
  const { data: tarifas = [] } = useQuery({
    queryKey: ["fichas-tarifas"],
    queryFn: () => fichasTarifasService.getTarifas({ limit: 200 }),
    enabled: isOpen,
  });

  // ── CRUD de tarifas ──
  const crearTarifaMutation = useMutation({
    mutationFn: () =>
      fichasTarifasService.createTarifa({
        categoria: nuevaTarifa.categoria.trim(),
        tarifa_horaria: num(nuevaTarifa.tarifa_horaria),
      }),
    onSuccess: () => {
      toast.success("Tarifa agregada");
      setNuevaTarifa({ categoria: "", tarifa_horaria: "" });
      queryClient.invalidateQueries({ queryKey: ["fichas-tarifas"] });
    },
    onError: () => toast.error("Error al agregar la tarifa"),
  });

  const actualizarTarifaMutation = useMutation({
    mutationFn: (t: { id: number; categoria: string; tarifa_horaria: string }) =>
      fichasTarifasService.updateTarifa(t.id, {
        categoria: t.categoria.trim(),
        tarifa_horaria: num(t.tarifa_horaria),
      }),
    onSuccess: () => {
      toast.success("Tarifa actualizada");
      setEditandoTarifa(null);
      queryClient.invalidateQueries({ queryKey: ["fichas-tarifas"] });
    },
    onError: () => toast.error("Error al actualizar la tarifa"),
  });

  const eliminarTarifaMutation = useMutation({
    mutationFn: (id: number) => fichasTarifasService.deleteTarifa(id),
    onSuccess: () => {
      toast.success("Tarifa eliminada");
      setConfirmarEliminarId(null);
      queryClient.invalidateQueries({ queryKey: ["fichas-tarifas"] });
    },
    onError: () => toast.error("Error al eliminar la tarifa"),
  });

  // ── Exportación: diálogo de firmas solicitadas al momento de exportar ──
  const [showFirmasModal, setShowFirmasModal] = useState(false);
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);
  const [firmasForm, setFirmasForm] = useState({
    elaborado_por: "",
    aprobado_por: "",
    fecha_aprobacion: "",
  });

  const abrirDialogoExportar = () => {
    if (!fichaEditando) return;
    setFirmasForm({
      elaborado_por: fichaEditando.elaborado_por ?? "",
      aprobado_por: fichaEditando.aprobado_por ?? "",
      fecha_aprobacion: fichaEditando.fecha_aprobacion ?? "",
    });
    setShowFirmasModal(true);
  };

  const exportarExcel = async () => {
    if (!fichaEditando) return;
    setExportando("excel");
    try {
      const { blob, nombre } = await fichasCostoService.exportarExcel(
        fichaEditando.id_ficha,
        {
          elaborado_por: firmasForm.elaborado_por || null,
          aprobado_por: firmasForm.aprobado_por || null,
          fecha_aprobacion: firmasForm.fecha_aprobacion || null,
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      setShowFirmasModal(false);
    } catch {
      toast.error("Error al exportar la ficha");
    } finally {
      setExportando(null);
    }
  };

  const exportarPdf = async () => {
    if (!fichaEditando) return;
    setExportando("pdf");
    try {
      const { blob, nombre } = await fichasCostoService.exportarPdf(
        fichaEditando.id_ficha,
        {
          elaborado_por: firmasForm.elaborado_por || null,
          aprobado_por: firmasForm.aprobado_por || null,
          fecha_aprobacion: firmasForm.fecha_aprobacion || null,
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      setShowFirmasModal(false);
    } catch {
      toast.error("Error al exportar la ficha a PDF");
    } finally {
      setExportando(null);
    }
  };

  const productosHoja = useMemo(() => {
    const q = busquedaProductos.trim().toLowerCase();
    if (!q) return productos.slice(0, 20);
    return productos
      .filter(
        (p: any) =>
          p.codigo?.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [productos, busquedaProductos]);

  // ── Cálculo en vivo ──
  const totalInsumos = useMemo(
    () =>
      insumosProducto.reduce(
        (acc, i) => acc + num(i.norma_consumo) * num(i.precio_unitario),
        0
      ) +
      otrosInsumos.reduce(
        (acc, i) => acc + num(i.norma_consumo) * num(i.precio_unitario),
        0
      ),
    [insumosProducto, otrosInsumos]
  );
  const salarioDirecto = useMemo(
    () => manoObra.reduce((acc, m) => acc + num(m.tarifa_horaria) * num(m.norma_tiempo), 0),
    [manoObra]
  );
  const m = useMemo(
    () =>
      calcularFicha({
        totalInsumos,
        salarioDirecto,
        gastoCombustible: num(coef.gasto_combustible),
        gastoOsde: num(coef.gasto_osde),
        nivelProduccion: cantidad,
        pctEnergia: num(coef.pct_energia),
        pctAgua: num(coef.pct_agua),
        pctOtrosGastosDirectos: num(coef.pct_otros_gastos_directos),
        pctVacaciones: num(coef.pct_vacaciones),
        coefGastosAsociados: num(coef.coef_gastos_asociados),
        coefGastosGenerales: num(coef.coef_gastos_generales),
        coefGastosDistribucion: num(coef.coef_gastos_distribucion),
        coefGastosFinancieros: num(coef.coef_gastos_financieros),
        pctSeguridadSocial: num(coef.pct_seguridad_social),
        pctFuerzaTrabajo: num(coef.pct_fuerza_trabajo),
        pctUtilidad: num(coef.pct_utilidad),
        pctImpuestoVentas: num(coef.pct_impuesto_ventas),
      }),
    [totalInsumos, salarioDirecto, coef, cantidad]
  );

  const guardarMutation = useMutation({
    mutationFn: (usarPrecio: boolean) => {
      const insumos: FichaInsumoInput[] = [
        ...insumosProducto.map(
          (i): FichaInsumoInput => ({
            id_producto: i.id_producto,
            codigo: i.codigo,
            nombre: i.nombre,
            um: i.um || null,
            norma_consumo: num(i.norma_consumo),
            precio_unitario: num(i.precio_unitario),
          })
        ),
        ...otrosInsumos
          .filter((i) => i.nombre.trim())
          .map(
            (i): FichaInsumoInput => ({
              id_producto: null,
              codigo: "",
              nombre: i.nombre.trim(),
              um: i.um.trim() || null,
              norma_consumo: num(i.norma_consumo),
              precio_unitario: num(i.precio_unitario),
            })
          ),
      ];
      const obra: FichaManoObraInput[] = manoObra
        .filter((r) => r.id_tarifa !== null)
        .map(
          (r): FichaManoObraInput => ({
            id_tarifa: r.id_tarifa,
            categoria: r.categoria,
            tarifa_horaria: num(r.tarifa_horaria),
            norma_tiempo: num(r.norma_tiempo),
          })
        );
      const payload = {
        id_producto: producto!.id_producto,
        nivel_produccion: cantidad,
        pct_energia: num(coef.pct_energia),
        pct_agua: num(coef.pct_agua),
        pct_otros_gastos_directos: num(coef.pct_otros_gastos_directos),
        pct_vacaciones: num(coef.pct_vacaciones),
        coef_gastos_asociados: num(coef.coef_gastos_asociados),
        coef_gastos_generales: num(coef.coef_gastos_generales),
        coef_gastos_distribucion: num(coef.coef_gastos_distribucion),
        coef_gastos_financieros: num(coef.coef_gastos_financieros),
        pct_seguridad_social: num(coef.pct_seguridad_social),
        pct_fuerza_trabajo: num(coef.pct_fuerza_trabajo),
        pct_utilidad: num(coef.pct_utilidad),
        pct_impuesto_ventas: num(coef.pct_impuesto_ventas),
        gasto_combustible: num(coef.gasto_combustible),
        gasto_osde: num(coef.gasto_osde),
        elaborado_por: elaboradoPor.trim() || null,
        aprobado_por: aprobadoPor.trim() || null,
        fecha_elaboracion: fechaAnexo,
        fecha_aprobacion: fechaAprobacion || null,
        insumos,
        mano_obra: obra,
      };
      const peticion = fichaEditando
        ? fichasCostoService.updateFicha(fichaEditando.id_ficha, payload)
        : fichasCostoService.createFicha(payload);
      return peticion.then((data) => ({ data, usarPrecio }));
    },
    onSuccess: ({ data, usarPrecio }) => {
      // Los Decimal llegan como string desde la API; convertir antes de usar
      const precio = Number(data.precio_unitario_ajustado);
      toast.success(
        `Ficha No.${data.id_ficha} ${fichaEditando ? "actualizada" : "guardada"}. Precio sugerido: $${fmt(precio)}`
      );
      queryClient.invalidateQueries({ queryKey: ["fichas-producto"] });
      queryClient.invalidateQueries({ queryKey: ["ficha-ultima-global"] });
      if (usarPrecio && onAccept) {
        onAccept(Number(precio.toFixed(2)));
      }
      handleClose();
    },
    onError: () => toast.error("Error al guardar la ficha de costo"),
  });

  if (!isOpen || !producto) return null;

  const validarYGuardar = (usarPrecio: boolean) => {
    const hayInsumoProducto = insumosProducto.some(
      (i) => i.nombre.trim() && num(i.norma_consumo) > 0
    );
    const hayOtroInsumo = otrosInsumos.some(
      (i) => i.nombre.trim() && num(i.norma_consumo) > 0
    );
    if (!hayInsumoProducto && !hayOtroInsumo) {
      toast.error("Agregue al menos un insumo con norma de consumo");
      setHojaActiva("materiales");
      return;
    }
    guardarMutation.mutate(usarPrecio);
  };

  const handleClose = () => {
    setHojaActiva("ficha");
    setVista("lista");
    setFichaEditando(null);
    setCoef({ ...DEFAULTS });
    setInsumosProducto([]);
    setOtrosInsumos([{ nombre: "", um: "", norma_consumo: "", precio_unitario: "" }]);
    setManoObra([{ id_tarifa: null, categoria: "", tarifa_horaria: "", norma_tiempo: "" }]);
    setElaboradoPor("");
    setAprobadoPor("");
    setFechaAprobacion("");
    setNuevaTarifa({ categoria: "", tarifa_horaria: "" });
    setEditandoTarifa(null);
    setConfirmarEliminarId(null);
    onClose();
  };

  // Abrir una ficha existente: carga todos sus datos en el formulario (modo edición)
  const abrirFichaExistente = (f: FichaCostoRead) => {
    setFichaEditando(f);
    setCoef({
      pct_energia: String(f.pct_energia),
      pct_agua: String(f.pct_agua),
      pct_otros_gastos_directos: String(f.pct_otros_gastos_directos),
      pct_vacaciones: String(f.pct_vacaciones),
      coef_gastos_asociados: String(f.coef_gastos_asociados),
      coef_gastos_generales: String(f.coef_gastos_generales),
      coef_gastos_distribucion: String(f.coef_gastos_distribucion),
      coef_gastos_financieros: String(f.coef_gastos_financieros),
      pct_seguridad_social: String(f.pct_seguridad_social),
      pct_fuerza_trabajo: String(f.pct_fuerza_trabajo),
      pct_utilidad: String(f.pct_utilidad),
      pct_impuesto_ventas: String(f.pct_impuesto_ventas),
      gasto_combustible: String(f.gasto_combustible),
      gasto_osde: String(f.gasto_osde),
    });
    setInsumosProducto(
      f.insumos
        .filter((i) => i.id_producto)
        .map((i) => ({
          id_producto: i.id_producto!,
          codigo: i.codigo,
          nombre: i.nombre,
          um: i.um ?? "",
          precio_unitario: String(i.precio_unitario),
          norma_consumo: String(i.norma_consumo),
        }))
    );
    const otros = f.insumos
      .filter((i) => !i.id_producto)
      .map((i) => ({
        nombre: i.nombre,
        um: i.um ?? "",
        norma_consumo: String(i.norma_consumo),
        precio_unitario: String(i.precio_unitario),
      }));
    setOtrosInsumos(
      otros.length
        ? otros
        : [{ nombre: "", um: "", norma_consumo: "", precio_unitario: "" }]
    );
    const obra = f.mano_obra.map((mo) => ({
      id_tarifa: mo.id_tarifa ?? null,
      categoria: mo.categoria,
      tarifa_horaria: String(mo.tarifa_horaria),
      norma_tiempo: String(mo.norma_tiempo),
    }));
    setManoObra(
      obra.length
        ? obra
        : [{ id_tarifa: null, categoria: "", tarifa_horaria: "", norma_tiempo: "" }]
    );
    setElaboradoPor(f.elaborado_por ?? "");
    setAprobadoPor(f.aprobado_por ?? "");
    setFechaAprobacion(f.fecha_aprobacion ?? "");
    setHojaActiva("ficha");
    setVista("form");
  };

  // Crear una nueva ficha desde cero (descarta la carga de la anterior)
  const nuevaFicha = () => {
    setFichaEditando(null);
    setCoef({ ...DEFAULTS });
    setInsumosProducto([]);
    setOtrosInsumos([{ nombre: "", um: "", norma_consumo: "", precio_unitario: "" }]);
    setManoObra([{ id_tarifa: null, categoria: "", tarifa_horaria: "", norma_tiempo: "" }]);
    setElaboradoPor("");
    setAprobadoPor("");
    setFechaAprobacion("");
    setHojaActiva("ficha");
    setVista("form");
  };

  // Selector de productos para agregar como insumo (combobox con buscador)
  const productosDisponibles = useMemo(() => {
    const yaAgregados = new Set(insumosProducto.map((i) => i.id_producto));
    return productos.filter((p: any) => !yaAgregados.has(p.id_producto));
  }, [productos, insumosProducto]);

  const opcionesProductos: SearchSelectOption[] = useMemo(
    () =>
      productosDisponibles.map((p: any) => ({
        value: p.id_producto,
        label: p.nombre,
        description: `${p.codigo ? `[${p.codigo}] ` : ""}P. compra: $${Number(p.precio_compra ?? 0).toFixed(2)}`,
      })),
    [productosDisponibles]
  );

  const opcionesTarifas: SearchSelectOption[] = useMemo(
    () =>
      tarifas.map((t: any) => ({
        value: t.id_tarifa,
        label: t.categoria,
        description: `$${fmt(Number(t.tarifa_horaria))}/h`,
      })),
    [tarifas]
  );

  const agregarInsumoProducto = (idProducto: number) => {
    const p = productos.find((x: any) => x.id_producto === idProducto);
    if (!p) return;
    setInsumosProducto((prev) => [
      ...prev,
      {
        id_producto: p.id_producto,
        codigo: p.codigo ?? "",
        nombre: p.nombre,
        um: "",
        precio_unitario: String(p.precio_compra ?? "0"),
        norma_consumo: "",
      },
    ]);
  };

  const actualizarOtrosInsumos = (idx: number, patch: Partial<OtroInsumoRow>) =>
    setOtrosInsumos((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const actualizarManoObra = (idx: number, patch: Partial<ManoObraRow>) =>
    setManoObra((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const seleccionarTarifa = (idx: number, idTarifa: number) => {
    const t = tarifas.find((x: any) => x.id_tarifa === idTarifa);
    if (!t) return;
    actualizarManoObra(idx, {
      id_tarifa: t.id_tarifa,
      categoria: t.categoria,
      tarifa_horaria: String(t.tarifa_horaria),
    });
  };

  const inputCls =
    "w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:text-gray-500";

  const badgeDe = (id: HojaId): number | undefined => {
    if (id === "materiales") return insumosProducto.length + otrosInsumos.filter((i) => i.nombre.trim()).length;
    if (id === "mano_obra") return manoObra.filter((r) => r.id_tarifa !== null).length;
    if (id === "tarifas") return tarifas.length;
    return undefined;
  };

  const filasResultado: { fila: string; label: string; valor: number; fuerte?: boolean }[] = [
    { fila: "1", label: "Gasto material (insumos + combustible + energía + agua)", valor: m.gastoMaterial },
    { fila: "2", label: "Salario directo o retribución directa (incluye vacaciones)", valor: m.salarioTotal },
    { fila: "3", label: "Otros gastos directos", valor: m.otrosGastosDirectos },
    { fila: "4", label: "Gastos asociados a la producción", valor: m.gastosAsociados },
    { fila: "5", label: "COSTO TOTAL (1+2+3+4)", valor: m.costoTotal, fuerte: true },
    { fila: "6", label: "Gastos generales y de administración", valor: m.gastosGenerales },
    { fila: "7", label: "Gastos de distribución y venta", valor: m.gastosDistribucion },
    { fila: "8", label: "Gastos financieros", valor: m.gastosFinancieros },
    { fila: "9", label: "Gastos por financiamiento de la OSDE", valor: num(coef.gasto_osde) },
    { fila: "10", label: "Tributos (gastos tributarios + impuesto s/ ventas)", valor: m.gastosTributarios + m.impuestoVentas },
    { fila: "11", label: "TOTAL DE GASTOS (6+7+8+9)", valor: m.totalGastos },
    { fila: "12", label: "TOTAL DE COSTOS Y GASTOS (5+11)", valor: m.totalCostosGastos, fuerte: true },
    { fila: "13", label: "Utilidad", valor: m.utilidad },
    { fila: "14", label: "PRECIO O TARIFA", valor: m.precioTarifa, fuerte: true },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[520px] max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header — mismo estilo que el modal de Nuevo Cliente */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                <Calculator className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Ficha de Costo No.{fichaEditando ? fichaEditando.id_ficha : numeroEstimado}
                </h3>
                <p className="text-sm text-gray-500">
                  {producto.nombre} - {cantidad} - {UM_PRODUCTO}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha</p>
                <p className="text-sm font-semibold text-gray-900">{fechaFmt}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Hojas del documento (tabs) — solo en el formulario */}
        {vista === "form" && (
        <div className="flex gap-2 px-6 py-3 border-b border-gray-200 overflow-x-auto">
          {HOJAS.map((h) => {
            const badge = badgeDe(h.id);
            const activa = hojaActiva === h.id;
            return (
              <button key={h.id} type="button" onClick={() => setHojaActiva(h.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activa
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {h.label}
                {badge !== undefined && badge > 0 && (
                  <span className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-[11px] font-bold rounded-full ${
                    activa ? "bg-white/25 text-white" : "bg-teal-100 text-teal-700"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        )}

        {/* Contenido: lista de fichas previas o formulario */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Vista: lista de fichas existentes del producto ── */}
          {vista === "lista" && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Fichas de costo del producto
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Seleccione una ficha para verla o editarla, o cree una nueva.
                  </p>
                </div>
                <Button size="sm" onClick={nuevaFicha}
                  className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                  <Plus className="h-3.5 w-3.5" />
                  Crear nueva ficha
                </Button>
              </div>
              <div className="space-y-3">
                {(fichasProducto ?? []).length === 0 ? (
                  <div className="border border-gray-200 rounded-lg px-4 py-8 text-center text-sm text-gray-400">
                    Este producto aún no tiene fichas de costo.
                  </div>
                ) : (
                  (fichasProducto ?? []).map((f) => (
                    <button key={f.id_ficha} type="button"
                      onClick={() => abrirFichaExistente(f)}
                      className="w-full flex items-center justify-between gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-teal-300 hover:bg-teal-50/40 transition-colors text-left group">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow">
                          <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Ficha No.{f.id_ficha}</p>
                          <p className="text-xs text-gray-400">
                            Elaborada: {formatFecha(f.fecha_elaboracion) || "—"}
                            {f.elaborado_por ? ` · ${f.elaborado_por}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Precio sugerido</p>
                          <p className="text-sm font-bold text-teal-700">${fmt(Number(f.precio_unitario_ajustado))}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Formulario (solo cuando vista === "form") ── */}
          {vista === "form" && (
          <>
          {/* ── Hoja Ficha (resultado del cálculo) ── */}
          {hojaActiva === "ficha" && (
            <div className="space-y-6">
              <Card className="shadow-sm border-gray-200" hover={false}>
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5 text-teal-600" />
                    Resultado del cálculo (filas 1–15)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {filasResultado.map((r) => (
                      <div key={r.fila} className={"flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-b-0 " + (r.fuerte ? "bg-gray-50 font-semibold" : "")}>
                        <span className="text-sm text-gray-600">
                          <span className="inline-block w-6 text-gray-400">{r.fila}</span> {r.label}
                        </span>
                        <span className={"text-sm " + (r.fuerte ? "text-gray-900" : "text-gray-700")}>${fmt(r.valor)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                      <span className="text-sm font-bold">
                        <span className="inline-block w-6">15</span> PRECIO O TARIFA UNITARIO AJUSTADO
                      </span>
                      <span className="text-lg font-bold">${fmt(m.precioUnitarioAjustado)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200" hover={false}>
                <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSignature className="h-5 w-5 text-teal-600" />
                    Firmas del documento
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!fichaEditando}
                      onClick={abrirDialogoExportar}
                      className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={fichaEditando ? "Descargar el documento Excel" : "Guarde la ficha para poder exportarla"}>
                      <FileDown className="h-4 w-4" />
                      Exportar a Excel
                    </Button>
                    <Button size="sm" variant="outline" disabled={!fichaEditando}
                      onClick={abrirDialogoExportar}
                      className="gap-1.5 text-rose-700 border-rose-300 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generar el documento PDF">
                      <FileText className="h-4 w-4" />
                      Generar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-400">
                    Los datos de firmas (elaborado por, aprobado por y fecha de aprobación)
                    se solicitarán al momento de exportar el documento.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Hoja Materiales (Insumos + Otros insumos) ── */}
          {hojaActiva === "materiales" && (
            <div className="space-y-6">
              {/* Insumos: selector desde el catálogo de productos */}
              <Card className="shadow-sm border-gray-200" hover={false}>
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-teal-600" />
                    Insumos (del catálogo de productos)
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-4">
                  <div className="max-w-md mb-3">
                    <Label>Seleccionar producto para agregar</Label>
                    <SearchSelect
                      className="mt-1"
                      options={opcionesProductos}
                      value={null}
                      placeholder="Buscar y seleccionar producto…"
                      emptyMessage="Sin resultados"
                      onChange={agregarInsumoProducto}
                    />
                  </div>
                  {insumosProducto.length === 0 ? (
                    <p className="text-xs text-gray-400">No se han agregado insumos del catálogo.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                            <th className="text-left px-3 py-2 font-semibold">Código</th>
                            <th className="text-left px-3 py-2 font-semibold">Insumo</th>
                            <th className="text-left px-3 py-2 font-semibold w-20">UM</th>
                            <th className="text-right px-3 py-2 font-semibold">Norma consumo</th>
                            <th className="text-right px-3 py-2 font-semibold">Precio unitario</th>
                            <th className="text-right px-3 py-2 font-semibold">Costo</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {insumosProducto.map((row, idx) => {
                            const costo = num(row.norma_consumo) * num(row.precio_unitario);
                            return (
                              <tr key={row.id_producto}>
                                <td className="px-3 py-1.5 text-gray-600">{row.codigo || "—"}</td>
                                <td className="px-3 py-1.5 font-medium text-gray-800">{row.nombre}</td>
                                <td className="px-3 py-1.5 text-gray-500">{row.um || "—"}</td>
                                <td className="px-3 py-1.5">
                                  <input type="number" step="0.001" className={inputCls + " text-right"} value={row.norma_consumo}
                                    onChange={(e) =>
                                      setInsumosProducto((prev) =>
                                        prev.map((r, i) => (i === idx ? { ...r, norma_consumo: e.target.value } : r))
                                      )
                                    } />
                                </td>
                                <td className="px-3 py-1.5 text-right text-gray-600">${fmt(num(row.precio_unitario))}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-700">${fmt(costo)}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <button type="button"
                                    onClick={() => setInsumosProducto((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-gray-400 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Otros insumos: entrada manual sin código */}
              <Card className="shadow-sm border-gray-200" hover={false}>
                <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Percent className="h-5 w-5 text-teal-600" />
                    Otros insumos (entrada manual)
                  </CardTitle>
                  <Button size="sm" variant="outline" className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
                    onClick={() => setOtrosInsumos([...otrosInsumos, { nombre: "", um: "", norma_consumo: "", precio_unitario: "" }])}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar otro insumo
                  </Button>
                </CardHeader>
                <CardContent className="mt-4">
                  <p className="text-xs text-gray-400 mb-3">
                    Conceptos no catalogados como productos: electricidad, agua, etc.
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                          <th className="text-left px-3 py-2 font-semibold">Nombre *</th>
                          <th className="text-left px-3 py-2 font-semibold w-20">UM</th>
                          <th className="text-right px-3 py-2 font-semibold">Norma consumo</th>
                          <th className="text-right px-3 py-2 font-semibold">Precio unitario</th>
                          <th className="text-right px-3 py-2 font-semibold">Costo</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {otrosInsumos.map((row, idx) => {
                          const costo = num(row.norma_consumo) * num(row.precio_unitario);
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-1.5">
                                <input className={inputCls} value={row.nombre} placeholder="Ej: ELECTRICIDAD"
                                  onChange={(e) => actualizarOtrosInsumos(idx, { nombre: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input className={inputCls} value={row.um} placeholder="KW"
                                  onChange={(e) => actualizarOtrosInsumos(idx, { um: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" step="0.001" className={inputCls + " text-right"} value={row.norma_consumo}
                                  onChange={(e) => actualizarOtrosInsumos(idx, { norma_consumo: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" step="0.01" className={inputCls + " text-right"} value={row.precio_unitario}
                                  onChange={(e) => actualizarOtrosInsumos(idx, { precio_unitario: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                                ${fmt(costo)}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => setOtrosInsumos(otrosInsumos.filter((_, i) => i !== idx))}
                                  className="p-1 text-gray-400 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-gray-500">TOTAL DE INSUMOS:</span>
                <span className="font-bold text-teal-700">${fmt(totalInsumos)}</span>
              </div>
            </div>
          )}

          {/* ── Hoja Mano de obra (selector de tarifas) ── */}
          {hojaActiva === "mano_obra" && (
            <Card className="shadow-sm border-gray-200" hover={false}>
              <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-teal-600" />
                  Mano de obra — operaciones del catálogo de tarifas
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
                  onClick={() => setManoObra([...manoObra, { id_tarifa: null, categoria: "", tarifa_horaria: "", norma_tiempo: "" }])}>
                  <Plus className="h-3.5 w-3.5" />
                  Agregar operación
                </Button>
              </CardHeader>
              <CardContent className="mt-4">
                <p className="text-xs text-gray-400 mb-3">
                  Seleccione la categoría (salario/hora) desde la hoja Tarifas; solo la norma de tiempo es editable.
                </p>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                        <th className="text-left px-3 py-2 font-semibold">Categoría ocupacional *</th>
                        <th className="text-right px-3 py-2 font-semibold">Salario/hora</th>
                        <th className="text-right px-3 py-2 font-semibold">Norma de tiempo (h)</th>
                        <th className="text-right px-3 py-2 font-semibold">Gasto de salario</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {manoObra.map((row, idx) => {
                        const usadas = new Set(
                          manoObra
                            .filter((r2, i) => i !== idx && r2.id_tarifa !== null)
                            .map((r2) => r2.id_tarifa)
                        );
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-1.5 min-w-[220px]">
                              <SearchSelect
                                options={opcionesTarifas.filter(
                                  (t) => !usadas.has(t.value) || t.value === row.id_tarifa
                                )}
                                value={row.id_tarifa}
                                placeholder="Seleccionar tarifa…"
                                emptyMessage="Sin tarifas disponibles"
                                onChange={(v) => seleccionarTarifa(idx, v)}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-600">
                              {row.id_tarifa ? `$${fmt(num(row.tarifa_horaria))}` : "—"}
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" step="0.01" min="0" className={inputCls + " text-right"}
                                value={row.norma_tiempo} disabled={!row.id_tarifa}
                                onChange={(e) => actualizarManoObra(idx, { norma_tiempo: e.target.value })} />
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                              ${fmt(num(row.tarifa_horaria) * num(row.norma_tiempo))}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => setManoObra(manoObra.filter((_, i) => i !== idx))}
                                className="p-1 text-gray-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50/60 border-t border-teal-200 font-semibold">
                        <td colSpan={3} className="px-3 py-2 text-right text-gray-700">SALARIO DIRECTO</td>
                        <td className="px-3 py-2 text-right text-teal-700">${fmt(salarioDirecto)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Hoja Gastos ── */}
          {hojaActiva === "gastos" && (
            <Card className="shadow-sm border-gray-200" hover={false}>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Percent className="h-5 w-5 text-teal-600" />
                  Gastos — Coeficientes y porcentajes
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-4">
                <p className="text-xs text-gray-400 mb-4">
                  Valores de la entidad según el cálculo de gastos reales. Precargados y editables.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ["pct_energia", "Energía (% insumos)"],
                    ["pct_agua", "Agua (% insumos)"],
                    ["gasto_combustible", "Combustible y lubricantes ($)"],
                    ["pct_otros_gastos_directos", "Otros gastos directos (% insumos)"],
                    ["pct_vacaciones", "Vacaciones (% salario)"],
                    ["coef_gastos_asociados", "Coef. gastos asociados prod."],
                    ["coef_gastos_generales", "Coef. gastos generales admón."],
                    ["coef_gastos_distribucion", "Coef. gastos distribución y venta"],
                    ["coef_gastos_financieros", "Coef. gastos financieros (%)"],
                    ["pct_seguridad_social", "Seguridad social (% salario)"],
                    ["pct_fuerza_trabajo", "Impuesto fuerza de trabajo (%)"],
                    ["pct_utilidad", "Utilidad (%)"],
                    ["pct_impuesto_ventas", "Impuesto s/ ventas (%)"],
                    ["gasto_osde", "Financiamiento OSDE ($)"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input type="number" step="0.0000000000000001" className="mt-1"
                        value={coef[key]}
                        onChange={(e) => setCoef({ ...coef, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Hoja Tarifas (catálogo, CRUD) ── */}
          {hojaActiva === "tarifas" && (
            <Card className="shadow-sm border-gray-200" hover={false}>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-teal-600" />
                  Tarifas — salario por hora por categoría ocupacional
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-4">
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Categoría ocupacional</Label>
                    <Input className="mt-1" value={nuevaTarifa.categoria}
                      placeholder="Ej: ELABORADOR DE ALIMENTOS"
                      onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, categoria: e.target.value })} />
                  </div>
                  <div className="w-40">
                    <Label>Salario/hora</Label>
                    <Input type="number" step="0.0001" min="0" className="mt-1" value={nuevaTarifa.tarifa_horaria}
                      placeholder="0.00"
                      onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, tarifa_horaria: e.target.value })} />
                  </div>
                  <Button size="sm" disabled={crearTarifaMutation.isPending || !nuevaTarifa.categoria.trim()}
                    onClick={() => crearTarifaMutation.mutate()}
                    className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                        <th className="text-left px-3 py-2 font-semibold">Categoría</th>
                        <th className="text-right px-3 py-2 font-semibold">Salario/hora</th>
                        <th className="w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tarifas.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-gray-400 text-sm">
                            No hay tarifas registradas. Agregue la primera arriba.
                          </td>
                        </tr>
                      )}
                      {tarifas.map((t: any) => {
                        const et = editandoTarifa?.id === t.id_tarifa ? editandoTarifa : null;
                        return et ? (
                          <tr key={t.id_tarifa} className="bg-teal-50/40">
                            <td className="px-3 py-1.5">
                              <input className={inputCls} value={et.categoria}
                                onChange={(e) => setEditandoTarifa({ ...et, categoria: e.target.value })} />
                            </td>
                            <td className="px-3 py-1.5 w-40">
                              <input type="number" step="0.0001" className={inputCls + " text-right"} value={et.tarifa_horaria}
                                onChange={(e) => setEditandoTarifa({ ...et, tarifa_horaria: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" title="Guardar"
                                  onClick={() => actualizarTarifaMutation.mutate(et)}
                                  className="p-1.5 text-teal-600 hover:bg-teal-100 rounded">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button type="button" title="Cancelar"
                                  onClick={() => setEditandoTarifa(null)}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={t.id_tarifa}>
                            <td className="px-3 py-1.5 font-medium text-gray-800">{t.categoria}</td>
                            <td className="px-3 py-1.5 text-right text-gray-700">${fmt(Number(t.tarifa_horaria))}</td>
                            <td className="px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" title="Editar"
                                  onClick={() => setEditandoTarifa({
                                    id: t.id_tarifa,
                                    categoria: t.categoria,
                                    tarifa_horaria: String(t.tarifa_horaria),
                                  })}
                                  className="p-1.5 text-gray-400 hover:text-teal-600 rounded">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" title={confirmarEliminarId === t.id_tarifa ? "Confirmar eliminación" : "Eliminar"}
                                  onClick={() => {
                                    if (confirmarEliminarId === t.id_tarifa) {
                                      eliminarTarifaMutation.mutate(t.id_tarifa);
                                    } else {
                                      setConfirmarEliminarId(t.id_tarifa);
                                    }
                                  }}
                                  className={"p-1.5 rounded " + (confirmarEliminarId === t.id_tarifa ? "text-white bg-red-500" : "text-gray-400 hover:text-red-600")}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Hoja Productos (solo lectura) ── */}
          {hojaActiva === "productos" && (
            <Card className="shadow-sm border-gray-200" hover={false}>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-teal-600" />
                  Productos del sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-4">
                <div className="relative max-w-md mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    className={inputCls + " pl-9"}
                    placeholder="Buscar producto…"
                    value={busquedaProductos}
                    onChange={(e) => setBusquedaProductos(e.target.value)}
                  />
                </div>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                        <th className="text-left px-3 py-2 font-semibold">Código</th>
                        <th className="text-left px-3 py-2 font-semibold">Producto</th>
                        <th className="text-right px-3 py-2 font-semibold">Precio compra</th>
                        <th className="text-right px-3 py-2 font-semibold">Precio venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productosHoja.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm">
                            No hay productos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                      {productosHoja.map((p: any) => (
                        <tr key={p.id_producto}>
                          <td className="px-3 py-1.5 text-gray-600">{p.codigo || "—"}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-800">{p.nombre}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700">${fmt(Number(p.precio_compra ?? 0))}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700">${fmt(Number(p.precio_venta ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50">
          {vista === "form" ? (
            <>
              <div className="text-sm">
                <span className="text-gray-500">Precio sugerido: </span>
                <span className="font-bold text-teal-700">${fmt(m.precioUnitarioAjustado)}</span>
                {fichaEditando && (
                  <span className="ml-3 text-xs text-gray-400">editando Ficha No.{fichaEditando.id_ficha}</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button disabled={guardarMutation.isPending} onClick={() => validarYGuardar(false)}
                  className="gap-2 border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-400">
                  Guardar ficha
                </Button>
                {onAccept && (
                  <Button disabled={guardarMutation.isPending} onClick={() => validarYGuardar(true)}
                    className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
                    <Save className="h-4 w-4" />
                    Guardar y usar precio
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-400">
                {(fichasProducto ?? []).length} ficha(s) registrada(s) para este producto
              </span>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de firmas para exportación */}
      {showFirmasModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <FileSignature className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Firmas del documento</h3>
                    <p className="text-xs text-gray-500">
                      Ficha No.{fichaEditando?.id_ficha} — datos para la exportación
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowFirmasModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Elaborado por</Label>
                <Input className="mt-1" value={firmasForm.elaborado_por}
                  onChange={(e) => setFirmasForm({ ...firmasForm, elaborado_por: e.target.value })}
                  placeholder="Nombre completo" />
              </div>
              <div>
                <Label>Aprobado por</Label>
                <Input className="mt-1" value={firmasForm.aprobado_por}
                  onChange={(e) => setFirmasForm({ ...firmasForm, aprobado_por: e.target.value })}
                  placeholder="Nombre completo" />
              </div>
              <div>
                <Label>Fecha de aprobación</Label>
                <DateInput className="mt-1" value={firmasForm.fecha_aprobacion}
                  onChange={(fecha_aprobacion) => setFirmasForm({ ...firmasForm, fecha_aprobacion })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowFirmasModal(false)}>
                Cancelar
              </Button>
              <Button onClick={exportarPdf} disabled={exportando === "pdf"}
                className="gap-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-400">
                <FileText className="h-4 w-4" />
                {exportando === "pdf" ? "Generando…" : "Generar PDF"}
              </Button>
              <Button onClick={exportarExcel} disabled={exportando === "excel"}
                className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                <FileDown className="h-4 w-4" />
                {exportando === "excel" ? "Exportando…" : "Exportar a Excel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

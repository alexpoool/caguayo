import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Coins,
  FileDown,
  FileText,
  Landmark,
  Percent,
  Plus,
  Save,
  ScrollText,
  Search,
  Trash2,
  User,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmModal,
  DateInput,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import { dj08Service } from "../../services/api";
import type {
  ActividadEconomica,
  DeclaracionJurada,
  DJ08Calculado,
  DJ08Input,
  Tributo,
} from "../../types/dj08";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const zero = {
  contribucion_restauracion: 0,
  pagos_arrendamiento: 0,
  importe_exonerado_reparaciones: 0,
  otros_descuentos: 0,
  bonificacion_mfp: 0,
  cuotas_mensuales: 0,
  otros_pagos_anticipados: 0,
  total_retenciones: 0,
  bonificaciones_autorizadas: 0,
  impuesto_declaracion_rectificada: 0,
  pago_declaracion_anterior: 0,
  bonificacion_pronto_pago: 0,
  impuesto_pagado_dj_ano: 0,
  recargo_mora: 0,
};

function entradaVacia(): DJ08Input {
  return {
    ano_fiscal: new Date().getFullYear(),
    opera_en_municipio: true,
    municipio_donde_opera: "",
    codigo_tributo: "",
    codigo_banco: "",
    minimo_exento: 39120,
    ...zero,
    fecha_declaracion: new Date().toISOString().slice(0, 10),
    observaciones: "",
  };
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0,00";
  return Number(n).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Escala progresiva (Sección G, filas 45-54) — espejo de backend/src/services/dj08_service.py
const ESCALA: { desde: number; hasta: number | null; pct: number }[] = [
  { desde: 0, hasta: 25000, pct: 5 },
  { desde: 25000, hasta: 50000, pct: 10 },
  { desde: 50000, hasta: 100000, pct: 15 },
  { desde: 100000, hasta: 200000, pct: 20 },
  { desde: 200000, hasta: 350000, pct: 25 },
  { desde: 350000, hasta: 500000, pct: 30 },
  { desde: 500000, hasta: 650000, pct: 35 },
  { desde: 650000, hasta: 800000, pct: 40 },
  { desde: 800000, hasta: 1000000, pct: 45 },
  { desde: 1000000, hasta: null, pct: 50 },
];

// Cálculo en vivo (cliente) — mismo orden de operaciones que dj08_service.construir_datos
function calcularLocal(
  entrada: DJ08Input,
  actividades: ActividadEconomica[],
  tributos: Tributo[],
) {
  const total_ingresos = actividades.reduce((a, x) => a + Number(x.ingresos || 0), 0);
  const total_gastos = actividades.reduce((a, x) => a + Number(x.gastos || 0), 0);
  const total_tributos = tributos.reduce((a, x) => a + Number(x.importe || 0), 0);

  const base_imponible = Math.max(
    0,
    total_ingresos -
      Number(entrada.minimo_exento || 0) -
      total_gastos -
      total_tributos -
      Number(entrada.contribucion_restauracion || 0) -
      Number(entrada.pagos_arrendamiento || 0) -
      Number(entrada.importe_exonerado_reparaciones || 0) -
      Number(entrada.otros_descuentos || 0) -
      Number(entrada.bonificacion_mfp || 0),
  );

  const bi = Math.max(0, base_imponible);
  const escala = ESCALA.map((t, i) => {
    const base_tramo = bi > t.desde ? (t.hasta === null ? bi - t.desde : Math.min(bi, t.hasta) - t.desde) : 0;
    return {
      fila: 45 + i,
      desde: t.desde,
      hasta: t.hasta,
      base_tramo,
      pct: t.pct,
      importe: (base_tramo * t.pct) / 100,
    };
  });
  const escala_total_base = escala.reduce((a, f) => a + f.base_tramo, 0);
  const impuesto_escala = escala.reduce((a, f) => a + f.importe, 0);

  const bruto =
    impuesto_escala -
    Number(entrada.cuotas_mensuales || 0) -
    Number(entrada.otros_pagos_anticipados || 0) -
    Number(entrada.total_retenciones || 0) -
    Number(entrada.bonificaciones_autorizadas || 0);
  const impuesto_pagar = Math.max(0, bruto);
  const total_devolver = Math.max(0, -bruto);

  const dif =
    Number(entrada.impuesto_declaracion_rectificada || 0) -
    Number(entrada.pago_declaracion_anterior || 0);
  const diferencia_pagar = dif > 0 ? dif : 0;
  const diferencia_devolver = dif < 0 ? -dif : 0;

  const base_e =
    Number(entrada.impuesto_declaracion_rectificada || 0) === 0
      ? impuesto_pagar
      : diferencia_pagar;
  const total_pagar = Math.max(
    0,
    base_e -
      Number(entrada.bonificacion_pronto_pago || 0) -
      Number(entrada.impuesto_pagado_dj_ano || 0) +
      Number(entrada.recargo_mora || 0),
  );

  return {
    total_ingresos,
    total_gastos,
    total_tributos,
    base_imponible,
    escala,
    escala_total_base,
    impuesto_escala,
    impuesto_pagar,
    total_devolver,
    diferencia_pagar,
    diferencia_devolver,
    total_pagar,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Piezas de UI reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = "0.01",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <Input
      type="number"
      step={step}
      min="0"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className={inputCls}
    />
  );
}

// Fila "Concepto | Importe | Fila" de las secciones B-E (estilo hoja Ficha del modal)
function FilaSeccion({
  fila,
  label,
  valor,
  fuerte,
  gradiente,
}: {
  fila: number;
  label: string;
  valor: number;
  fuerte?: boolean;
  gradiente?: boolean;
}) {
  if (gradiente) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
        <span className="text-sm font-bold">
          <span className="inline-block w-8">{fila}</span> {label}
        </span>
        <span className="text-lg font-bold">${fmt(valor)}</span>
      </div>
    );
  }
  return (
    <div
      className={
        "flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-b-0 " +
        (fuerte ? "bg-gray-50 font-semibold" : "")
      }
    >
      <span className="text-sm text-gray-600">
        <span className="inline-block w-8 text-gray-400">{fila}</span> {label}
      </span>
      <span className={"text-sm " + (fuerte ? "text-gray-900" : "text-gray-700")}>
        ${fmt(valor)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hojas del formulario (como las hojas del Excel de la Ficha de Costo)
// ─────────────────────────────────────────────────────────────────────────────

type HojaId = "hoja1" | "seccionA" | "seccionBCDE" | "seccionF" | "seccionG";

const HOJAS: { id: HojaId; label: string }[] = [
  { id: "hoja1", label: "Hoja 1 · Datos" },
  { id: "seccionA", label: "Sección A · Actividades" },
  { id: "seccionBCDE", label: "Secciones B–E · Liquidación" },
  { id: "seccionF", label: "Sección F · Tributos" },
  { id: "seccionG", label: "Sección G · Escala" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────

export function DJ08Page() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState<"list" | "form">("list");
  const [hojaActiva, setHojaActiva] = useState<HojaId>("hoja1");
  const [entrada, setEntrada] = useState<DJ08Input>(entradaVacia());
  const [calculado, setCalculado] = useState<DJ08Calculado | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [confirmar, setConfirmar] = useState<{
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    tipo: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({ isOpen: false, titulo: "", mensaje: "", tipo: "danger", onConfirm: () => {} });

  // Catálogos (se administran en Administración → Configuración)
  const { data: actividades = [] } = useQuery({
    queryKey: ["dj08Actividades"],
    queryFn: dj08Service.listarActividades,
  });
  const { data: tributos = [] } = useQuery({
    queryKey: ["dj08Tributos"],
    queryFn: dj08Service.listarTributos,
  });

  // Declaraciones guardadas
  const { data: declaraciones = [], isLoading: cargandoDJs } = useQuery({
    queryKey: ["dj08Declaraciones"],
    queryFn: () => dj08Service.listarDeclaraciones(),
  });

  const set = <K extends keyof DJ08Input>(k: K, v: DJ08Input[K]) =>
    setEntrada((prev) => ({ ...prev, [k]: v }));

  // ── Cálculo en vivo ──
  const c = useMemo(
    () => calcularLocal(entrada, actividades, tributos),
    [entrada, actividades, tributos],
  );

  // ── Mutaciones ──
  const guardarMutation = useMutation({
    mutationFn: () => dj08Service.guardarDeclaracion(entrada),
    onSuccess: (dj) => {
      toast.success(`Declaración ${dj.codigo} guardada · Total a pagar: $${fmt(dj.total_pagar)}`);
      queryClient.invalidateQueries({ queryKey: ["dj08Declaraciones"] });
      setVista("list");
    },
    onError: () => toast.error("Error al guardar la declaración"),
  });

  const presentarMutation = useMutation({
    mutationFn: (id: number) => dj08Service.presentarDeclaracion(id),
    onSuccess: (dj) => {
      toast.success(`Declaración ${dj.codigo} marcada como PRESENTADA`);
      queryClient.invalidateQueries({ queryKey: ["dj08Declaraciones"] });
    },
    onError: () => toast.error("Error al presentar la declaración"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => dj08Service.eliminarDeclaracion(id),
    onSuccess: () => {
      toast.success("Declaración eliminada");
      queryClient.invalidateQueries({ queryKey: ["dj08Declaraciones"] });
    },
    onError: () => toast.error("Error al eliminar la declaración"),
  });

  // ── Acciones ──
  const nuevaDeclaracion = () => {
    setEntrada(entradaVacia());
    setCalculado(null);
    setHojaActiva("hoja1");
    setVista("form");
  };

  const calcularEnServidor = async () => {
    setCalculando(true);
    try {
      const res = await dj08Service.calcular(entrada);
      setCalculado(res);
      toast.success("Declaración calculada con los datos del contribuyente");
    } catch {
      toast.error("Error al calcular la declaración");
    } finally {
      setCalculando(false);
    }
  };

  const exportarPdf = async () => {
    setExportando(true);
    try {
      const { blob, nombre } = await dj08Service.exportarPdf(entrada);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generado");
    } catch {
      toast.error("Error al exportar el PDF");
    } finally {
      setExportando(false);
    }
  };

  const reexportar = async (dj: DeclaracionJurada) => {
    try {
      const { blob, nombre } = await dj08Service.exportarDeclaracionPdf(dj.id_declaracion);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al exportar la declaración");
    }
  };

  const pedirConfirmacion = (
    titulo: string,
    mensaje: string,
    tipo: "danger" | "warning" | "info",
    onConfirm: () => void,
  ) => setConfirmar({ isOpen: true, titulo, mensaje, tipo, onConfirm });

  // ── Filtro de la lista ──
  const declaracionesFiltradas = declaraciones.filter(
    (dj) =>
      dj.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(dj.ano_fiscal).includes(busqueda),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA: Lista (mismo patrón que Proveedores / Convenios / Anexos)
  // ═══════════════════════════════════════════════════════════════════════════
  if (vista === "list") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
              <ScrollText className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-baseline">
              <h1 className="text-xl font-bold text-gray-900">
                Declaraciones Juradas DJ-08
              </h1>
              <p className="text-sm text-gray-500 ml-3 hidden sm:block">
                Impuesto sobre Ingresos Personales — CUP ({declaracionesFiltradas.length}{" "}
                {declaracionesFiltradas.length === 1 ? "declaración" : "declaraciones"})
              </p>
            </div>
          </div>
          <Button
            onClick={nuevaDeclaracion}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Nueva Declaración
          </Button>
        </div>

        {/* Buscador */}
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por código o año fiscal..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabla */}
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-teal-600" />
                      Código
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-teal-600" />
                      Año fiscal
                    </div>
                  </TableHead>
                  <TableHead>Fecha declaración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Base Imponible</TableHead>
                  <TableHead className="text-right">Total a pagar</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoDJs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      Cargando declaraciones…
                    </TableCell>
                  </TableRow>
                ) : declaracionesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ScrollText className="h-8 w-8 text-gray-300" />
                        <span className="text-sm">
                          {busqueda
                            ? "Sin resultados para la búsqueda"
                            : "No hay declaraciones guardadas. Cree la primera con «Nueva Declaración»."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  declaracionesFiltradas.map((dj) => (
                    <TableRow
                      key={dj.id_declaracion}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-mono font-medium">
                          <ScrollText className="h-3.5 w-3.5" />
                          {dj.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {dj.ano_fiscal}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {dj.fecha_declaracion || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            dj.estado === "PRESENTADA"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {dj.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">
                        ${fmt(dj.base_imponible)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          ${fmt(dj.total_pagar)}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reexportar(dj)}
                            className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                            title="Descargar PDF"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                          {dj.estado === "BORRADOR" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  pedirConfirmacion(
                                    "Presentar declaración",
                                    `¿Marcar la declaración ${dj.codigo} como PRESENTADA? No podrá editarse ni eliminarse.`,
                                    "warning",
                                    () => presentarMutation.mutate(dj.id_declaracion),
                                  )
                                }
                                className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                title="Marcar como presentada"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Presentar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  pedirConfirmacion(
                                    "Eliminar borrador",
                                    `¿Eliminar la declaración ${dj.codigo}? Esta acción no se puede deshacer.`,
                                    "danger",
                                    () => eliminarMutation.mutate(dj.id_declaracion),
                                  )
                                }
                                className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Eliminar borrador"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
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
          isOpen={confirmar.isOpen}
          onClose={() => setConfirmar({ ...confirmar, isOpen: false })}
          onConfirm={() => {
            confirmar.onConfirm();
            setConfirmar({ ...confirmar, isOpen: false });
          }}
          title={confirmar.titulo}
          message={confirmar.mensaje}
          type={confirmar.tipo}
          confirmText="Confirmar"
          cancelText="Cancelar"
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISTA: Formulario (página completa, hojas como la Ficha de Costo)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in-up">
      {/* Header del formulario */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVista("list")}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Nueva Declaración Jurada DJ-08
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total a pagar (fila 36)</p>
            <p className="text-lg font-bold text-teal-700">${fmt(c.total_pagar)}</p>
          </div>
          <Button
            variant="outline"
            onClick={calcularEnServidor}
            disabled={calculando}
            className="gap-2 text-teal-700 border-teal-300 hover:bg-teal-50"
          >
            <Percent className="h-4 w-4" />
            {calculando ? "Calculando…" : "Calcular"}
          </Button>
        </div>
      </div>

      {/* Hojas del documento (tabs) */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {HOJAS.map((h) => {
          const activa = hojaActiva === h.id;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setHojaActiva(h.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activa
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {h.label}
              {h.id === "seccionA" && actividades.length > 0 && (
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-[11px] font-bold rounded-full ${
                    activa ? "bg-white/25 text-white" : "bg-teal-100 text-teal-700"
                  }`}
                >
                  {actividades.length}
                </span>
              )}
              {h.id === "seccionF" && tributos.length > 0 && (
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-[11px] font-bold rounded-full ${
                    activa ? "bg-white/25 text-white" : "bg-teal-100 text-teal-700"
                  }`}
                >
                  {tributos.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardarMutation.mutate();
        }}
        className="pb-8"
      >
        {/* ── HOJA 1: Datos del formulario ── */}
        {hojaActiva === "hoja1" && (
          <div className="space-y-6">
            {/* Contribuyente (viene de la dependencia y del usuario, como el documento) */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-teal-600" />
                  Contribuyente (de la dependencia y del usuario)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {calculado ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ["NIT", calculado.nit],
                      ["Nombre (s) y apellidos", calculado.nombre],
                      ["Carné de identidad / Dirección", calculado.direccion],
                      ["Municipio", calculado.municipio],
                      ["Provincia", calculado.provincia],
                      ["Zona Postal", calculado.codigo_postal],
                      ["Teléfono", calculado.telefono],
                      ["Correo Electrónico", calculado.email],
                    ].map(([label, valor]) => (
                      <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{valor || "—"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Pulse «Calcular» para traer NIT, dirección, municipio, provincia, zona postal,
                    teléfono y correo desde la dependencia del usuario (casillas de la hoja 1 del
                    formulario oficial).
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Datos que ingresa el usuario */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Datos de la declaración
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Año fiscal *">
                    <Input
                      type="number"
                      value={entrada.ano_fiscal}
                      onChange={(e) => set("ano_fiscal", Number(e.target.value) || new Date().getFullYear())}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Código del tributo (hoja 1)">
                    <Input
                      value={entrada.codigo_tributo ?? ""}
                      onChange={(e) => set("codigo_tributo", e.target.value)}
                      placeholder="Ej: 053022-2"
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Código del Banco (hoja 1)">
                    <Input
                      value={entrada.codigo_banco ?? ""}
                      onChange={(e) => set("codigo_banco", e.target.value)}
                      placeholder="Ej: 90105"
                      className={inputCls}
                    />
                  </Campo>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Municipio donde opera">
                    <Input
                      value={entrada.municipio_donde_opera ?? ""}
                      onChange={(e) => set("municipio_donde_opera", e.target.value)}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Mínimo exento autorizado (fila 12)">
                    <NumInput
                      value={entrada.minimo_exento}
                      onChange={(v) => set("minimo_exento", v)}
                    />
                  </Campo>
                  <Campo label="Fecha de la declaración (hoja 4)">
                    <DateInput
                      value={entrada.fecha_declaracion ?? ""}
                      onChange={(iso) => set("fecha_declaracion", iso || null)}
                    />
                  </Campo>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={entrada.opera_en_municipio}
                    onChange={(e) => set("opera_en_municipio", e.target.checked)}
                    className="h-4 w-4 accent-teal-600"
                  />
                  Opera en su municipio (marcado = SI; desmarcado = NO)
                </label>
                <Campo label="Observaciones (hoja 4)">
                  <textarea
                    rows={3}
                    value={entrada.observaciones ?? ""}
                    onChange={(e) => set("observaciones", e.target.value)}
                    className={inputCls}
                  />
                </Campo>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SECCIÓN A: Actividades económicas (filas 1-10) ── */}
        {hojaActiva === "seccionA" && (
          <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-teal-600" />
                Sección A — Ingresos Obtenidos y Gastos Deducibles por actividad (filas 1-10)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-400 mb-3">
                Las actividades económicas se administran en Administración → Configuración →
                Actividades Económicas. Todas las registradas se incluyen en la declaración.
              </p>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                      <th className="text-left px-3 py-2 font-semibold">Código - Nombre</th>
                      <th className="text-left px-3 py-2 font-semibold">Desde</th>
                      <th className="text-left px-3 py-2 font-semibold">Hasta</th>
                      <th className="text-right px-3 py-2 font-semibold">Ingresos Obtenidos</th>
                      <th className="text-right px-3 py-2 font-semibold">Gastos Deducibles</th>
                      <th className="text-right px-3 py-2 font-semibold w-16">Fila</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {actividades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                          Sin actividades registradas — agrégalas en Configuración
                        </td>
                      </tr>
                    )}
                    {actividades.map((a, idx) => (
                      <tr key={a.id_actividad} className="hover:bg-teal-50/30 transition-colors">
                        <td className="px-3 py-1.5 font-medium text-gray-800">
                          {a.codigo} - {a.nombre}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">{a.fecha_inicio}</td>
                        <td className="px-3 py-1.5 text-gray-600">{a.fecha_fin}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">${fmt(a.ingresos)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">${fmt(a.gastos)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{idx + 1}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-bold">
                      <td className="px-3 py-2.5" colSpan={3}>
                        Total (filas 11 y 13 de la Sección B)
                      </td>
                      <td className="px-3 py-2.5 text-right">${fmt(c.total_ingresos)}</td>
                      <td className="px-3 py-2.5 text-right">${fmt(c.total_gastos)}</td>
                      <td className="px-3 py-2.5 text-right">10</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SECCIONES B-E: Liquidación ── */}
        {hojaActiva === "seccionBCDE" && (
          <div className="space-y-6">
            {/* Sección B — Base Imponible */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Percent className="h-5 w-5 text-teal-600" />
                  Sección B — Determinación de la Base Imponible (filas 11-20)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <FilaSeccion fila={11} label="Ingresos obtenidos (Sección A, fila 10)" valor={c.total_ingresos} />
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      <span className="inline-block w-8 text-gray-400">12</span> (-) Mínimo Exento Autorizado
                    </span>
                    <div className="w-40">
                      <NumInput
                        value={entrada.minimo_exento}
                        onChange={(v) => set("minimo_exento", v)}
                      />
                    </div>
                  </div>
                  <FilaSeccion fila={13} label="(-) Gastos deducibles (Sección A, fila 10)" valor={c.total_gastos} />
                  <FilaSeccion fila={14} label="(-) Total de tributos pagados (Sección F, fila 44)" valor={c.total_tributos} />
                  {([
                    ["contribucion_restauracion", "(-) Contribución para restauración y preservación"],
                    ["pagos_arrendamiento", "(-) Pagos por arrendamiento de bienes a entidades estatales"],
                    ["importe_exonerado_reparaciones", "(-) Importe exonerado por arrendamiento por reparaciones"],
                    ["otros_descuentos", "(-) Otros descuentos autorizados"],
                    ["bonificacion_mfp", "(-) Bonificación según aprobación del MFP"],
                  ] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        <span className="inline-block w-8 text-gray-400">
                          {k === "contribucion_restauracion" ? 15 : k === "pagos_arrendamiento" ? 16 : k === "importe_exonerado_reparaciones" ? 17 : k === "otros_descuentos" ? 18 : 19}
                        </span>{" "}
                        {label}
                      </span>
                      <div className="w-40">
                        <NumInput value={entrada[k]} onChange={(v) => set(k, v)} />
                      </div>
                    </div>
                  ))}
                  <FilaSeccion fila={20} label="Base Imponible (pasa a Sección G, fila 21)" valor={c.base_imponible} fuerte gradiente />
                </div>
              </CardContent>
            </Card>

            {/* Sección C — Impuesto a pagar */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="h-5 w-5 text-teal-600" />
                  Sección C — Determinación del impuesto a pagar (filas 21-27)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <FilaSeccion fila={21} label="Impuesto a pagar según escala (Sección G, fila 55)" valor={c.impuesto_escala} />
                  {([
                    ["cuotas_mensuales", "(-) Total de cuotas mensuales pagadas por el Titular"],
                    ["otros_pagos_anticipados", "(-) Otros pagos anticipados o Créditos del ejercicio anterior"],
                    ["total_retenciones", "(-) Total de retenciones"],
                    ["bonificaciones_autorizadas", "(-) Bonificaciones autorizadas"],
                  ] as const).map(([k, label], i) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        <span className="inline-block w-8 text-gray-400">{22 + i}</span> {label}
                      </span>
                      <div className="w-40">
                        <NumInput value={entrada[k]} onChange={(v) => set(k, v)} />
                      </div>
                    </div>
                  ))}
                  <FilaSeccion fila={26} label="Impuesto a pagar (filas 21-22-23-24-25, si > 0)" valor={c.impuesto_pagar} fuerte />
                  <FilaSeccion fila={27} label="Total a Devolver (si resultado negativo, TCP = 0)" valor={c.total_devolver} />
                </div>
              </CardContent>
            </Card>

            {/* Sección D — Rectificada */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-amber-500">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50/80 to-orange-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Sección D — Declaración Jurada Rectificada (filas 28-31)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-400 mb-3">
                  Se utiliza solo en caso de presentarse una Declaración Jurada Rectificada.
                </p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {([
                    ["impuesto_declaracion_rectificada", "Impuesto a pagar según Declaración Rectificada"],
                    ["pago_declaracion_anterior", "(-) Pago del impuesto realizado en la Declaración anterior"],
                  ] as const).map(([k, label], i) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        <span className="inline-block w-8 text-gray-400">{28 + i}</span> {label}
                      </span>
                      <div className="w-40">
                        <NumInput value={entrada[k]} onChange={(v) => set(k, v)} />
                      </div>
                    </div>
                  ))}
                  <FilaSeccion fila={30} label="Diferencia Impuesto a Pagar (si fila 28 > fila 29)" valor={c.diferencia_pagar} />
                  <FilaSeccion fila={31} label="Diferencia a devolver (si fila 28 < fila 29)" valor={c.diferencia_devolver} />
                </div>
              </CardContent>
            </Card>

            {/* Sección E — Total a Pagar */}
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Coins className="h-5 w-5 text-teal-600" />
                  Sección E — Total a Pagar (filas 32-36)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <FilaSeccion
                    fila={32}
                    label="IMPUESTO A PAGAR (viene de filas 26 o 30)"
                    valor={
                      Number(entrada.impuesto_declaracion_rectificada || 0) === 0
                        ? c.impuesto_pagar
                        : c.diferencia_pagar
                    }
                  />
                  {([
                    ["bonificacion_pronto_pago", "(-) Bonificaciones (5% por pronto pago)"],
                    ["impuesto_pagado_dj_ano", "(-) Impuesto pagado en DJ presentadas en el año fiscal"],
                    ["recargo_mora", "(+) Recargo por mora (si se paga fuera de fecha)"],
                  ] as const).map(([k, label], i) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        <span className="inline-block w-8 text-gray-400">{33 + i}</span> {label}
                      </span>
                      <div className="w-40">
                        <NumInput value={entrada[k]} onChange={(v) => set(k, v)} />
                      </div>
                    </div>
                  ))}
                  <FilaSeccion fila={36} label="TOTAL A PAGAR (fila 32 – 33 – 34 + 35)" valor={c.total_pagar} gradiente />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SECCIÓN F: Tributos (filas 37-44) ── */}
        {hojaActiva === "seccionF" && (
          <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-teal-600" />
                Sección F — Total de Tributos Pagados Asociados a la Actividad (filas 37-44)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-400 mb-3">
                Los tributos se administran en Administración → Configuración → Tributos. Se
                descuentan de la Base Imponible (fila 14 de la Sección B).
              </p>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                      <th className="text-left px-3 py-2 font-semibold">Nombre del Tributo</th>
                      <th className="text-right px-3 py-2 font-semibold">Importe Total pagado</th>
                      <th className="text-right px-3 py-2 font-semibold w-16">Fila</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tributos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-gray-400">
                          Sin tributos registrados — agrégalos en Configuración
                        </td>
                      </tr>
                    )}
                    {tributos.map((t, idx) => (
                      <tr key={t.id_tributo} className="hover:bg-teal-50/30 transition-colors">
                        <td className="px-3 py-1.5 font-medium text-gray-800">{t.nombre}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">${fmt(t.importe)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{37 + idx}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-bold">
                      <td className="px-3 py-2.5">Total de tributos pagados</td>
                      <td className="px-3 py-2.5 text-right">${fmt(c.total_tributos)}</td>
                      <td className="px-3 py-2.5 text-right">44</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SECCIÓN G: Escala progresiva (filas 45-55) ── */}
        {hojaActiva === "seccionG" && (
          <div className="space-y-6">
            <Card className="shadow-md border-gray-200 border-l-4 border-l-teal-500">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50/80 to-cyan-50/40">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Percent className="h-5 w-5 text-teal-600" />
                  Sección G — Determinación del impuesto según escala progresiva (filas 45-55)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-400 mb-3">
                  Escala progresiva ingresos personales – TCP – PESOS - CUP. Calculada sobre la
                  Base Imponible de la fila 20.
                </p>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                        <th className="text-left px-3 py-2 font-semibold">Exceso de</th>
                        <th className="text-left px-3 py-2 font-semibold">Hasta</th>
                        <th className="text-right px-3 py-2 font-semibold">Base Imponible</th>
                        <th className="text-right px-3 py-2 font-semibold">Tipo %</th>
                        <th className="text-right px-3 py-2 font-semibold">Importe</th>
                        <th className="text-right px-3 py-2 font-semibold w-16">Fila</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {c.escala.map((f) => (
                        <tr key={f.fila} className={f.base_tramo > 0 ? "bg-teal-50/40" : ""}>
                          <td className="px-3 py-1.5 text-gray-700">{fmt(f.desde)}</td>
                          <td className="px-3 py-1.5 text-gray-700">
                            {f.hasta === null ? "—" : fmt(f.hasta)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700">${fmt(f.base_tramo)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700">{f.pct}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                            ${fmt(f.importe)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-400">{f.fila}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-bold">
                        <td className="px-3 py-2.5" colSpan={2}>Total (pasa a Sección C, fila 21)</td>
                        <td className="px-3 py-2.5 text-right">${fmt(c.escala_total_base)}</td>
                        <td></td>
                        <td className="px-3 py-2.5 text-right">${fmt(c.impuesto_escala)}</td>
                        <td className="px-3 py-2.5 text-right">55</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Resumen final del cálculo del servidor (datos oficiales) */}
            {calculado && (
              <Card className="shadow-md border-gray-200" >
                <CardHeader className="border-b bg-gray-50/50 flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Resultado del cálculo del servidor
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={calcularEnServidor}
                    disabled={calculando}
                    className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Recalcular
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[
                      ["Total ingresos (fila 10)", calculado.total_ingresos],
                      ["Base Imponible (fila 20)", calculado.base_imponible],
                      ["Impuesto escala (fila 21)", calculado.impuesto_escala],
                      ["Impuesto a pagar (fila 26)", calculado.impuesto_pagar],
                      ["TOTAL A PAGAR (fila 36)", calculado.total_pagar],
                    ].map(([label, v]) => (
                      <div key={label as string} className="rounded-lg border border-gray-200 p-3">
                        <span className="text-[11px] text-gray-500">{label as string}</span>
                        <p className="text-lg font-bold text-gray-800">${fmt(v as number)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Acciones del formulario ── */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={guardarMutation.isPending}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Save className="h-4 w-4" />
            {guardarMutation.isPending ? "Guardando…" : "Guardar Declaración"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportarPdf}
            disabled={exportando}
            className="gap-2 text-rose-700 border-rose-300 hover:bg-rose-50"
          >
            <FileDown className="h-4 w-4" />
            {exportando ? "Generando…" : "Exportar PDF"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setVista("list")}>
            Cancelar
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmar.isOpen}
        onClose={() => setConfirmar({ ...confirmar, isOpen: false })}
        onConfirm={() => {
          confirmar.onConfirm();
          setConfirmar({ ...confirmar, isOpen: false });
        }}
        title={confirmar.titulo}
        message={confirmar.mensaje}
        type={confirmar.tipo}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </div>
  );
}

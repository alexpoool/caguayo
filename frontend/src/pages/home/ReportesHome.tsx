import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Package,
  DollarSign,
  TrendingUp,
  Boxes,
  ArrowLeftRight,
  UserCircle,
  FileText,
  Users,
  Layers,
  Calculator,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { ReportFormModal } from "../reportes/ReportFormModal";
import { ReportCategoryModal } from "../reportes/ReportCategoryModal";

// Report form components
import ReporteExistencias from "../reportes/ReporteExistencias";
import ReporteMovimientosDependencia from "../reportes/ReporteMovimientosDependencia";
import ReporteMovimientosProducto from "../reportes/ReporteMovimientosProducto";
import ReporteProveedores from "../reportes/ReporteProveedores";
import ReporteClientes from "../reportes/ReporteClientes";
import ReporteLiquidaciones from "../reportes/ReporteLiquidaciones";
import ReporteProyectos from "../reportes/ReporteProyectos";
import ReporteCreadores from "../reportes/ReporteCreadores";
import ReporteDesempeno from "../reportes/ReporteDesempeno";
import ReporteOnat from "../reportes/ReporteOnat";
import ReporteMincult from "../reportes/ReporteMincult";

// Report definition
interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Category definition
interface ReportCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  reports: ReportItem[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "inventario",
    title: "Inventario",
    icon: <Boxes className="w-5 h-5 text-blue-600" />,
    reports: [
      {
        id: "existencias",
        title: "Existencias",
        description: "Stock actual de productos por dependencia con totales generales.",
        icon: <Boxes className="h-5 w-5 text-blue-600" />,
        color: "bg-blue-50 hover:bg-blue-100",
      },
      {
        id: "movimientos-dependencia",
        title: "Movimientos por Dependencia",
        description: "Historial de movimientos filtrado por dependencia y período.",
        icon: <ArrowLeftRight className="h-5 w-5 text-green-600" />,
        color: "bg-green-50 hover:bg-green-100",
      },
      {
        id: "movimientos-producto",
        title: "Movimientos por Producto",
        description: "Seguimiento detallado de un producto específico en el tiempo.",
        icon: <Package className="h-5 w-5 text-purple-600" />,
        color: "bg-purple-50 hover:bg-purple-100",
      },
    ],
  },
  {
    id: "tienda",
    title: "Tienda",
    icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
    reports: [
      {
        id: "clientes",
        title: "Registro de Clientes",
        description: "Listado de clientes registrados con historial de compras.",
        icon: <Users className="h-5 w-5 text-emerald-600" />,
        color: "bg-emerald-50 hover:bg-emerald-100",
      },
    ],
  },
  {
    id: "compra",
    title: "Compra",
    icon: <DollarSign className="w-5 h-5 text-amber-600" />,
    reports: [
      {
        id: "proveedores",
        title: "Proveedores",
        description: "Listado de proveedores registrados con información de contacto.",
        icon: <UserCircle className="h-5 w-5 text-amber-600" />,
        color: "bg-amber-50 hover:bg-amber-100",
      },
      {
        id: "liquidaciones",
        title: "Resumen de Liquidaciones",
        description: "Resumen de liquidaciones realizadas por período y proveedor.",
        icon: <Calculator className="h-5 w-5 text-orange-600" />,
        color: "bg-orange-50 hover:bg-orange-100",
      },
    ],
  },
  {
    id: "proyectos",
    title: "Proyectos",
    icon: <Layers className="w-5 h-5 text-indigo-600" />,
    reports: [
      {
        id: "proyectos",
        title: "Registro de Proyectos",
        description: "Listado de proyectos con estado, fechas y montos.",
        icon: <Layers className="h-5 w-5 text-indigo-600" />,
        color: "bg-indigo-50 hover:bg-indigo-100",
      },
      {
        id: "creadores",
        title: "Registro de Creadores",
        description: "Listado de creadores participantes en proyectos.",
        icon: <Users className="h-5 w-5 text-violet-600" />,
        color: "bg-violet-50 hover:bg-violet-100",
      },
      {
        id: "desempeno",
        title: "Informe de Desempeño",
        description: "Análisis de rendimiento y productividad por proyecto.",
        icon: <BarChart3 className="h-5 w-5 text-cyan-600" />,
        color: "bg-cyan-50 hover:bg-cyan-100",
      },
    ],
  },
  {
    id: "ministerios",
    title: "Ministerios",
    icon: <FileText className="w-5 h-5 text-rose-600" />,
    reports: [
      {
        id: "onat",
        title: "ONAT — Ingresos y Retenciones",
        description: "Reporte de ingresos y retenciones para ONAT.",
        icon: <Receipt className="h-5 w-5 text-rose-600" />,
        color: "bg-rose-50 hover:bg-rose-100",
      },
      {
        id: "mincult",
        title: "MINCULT — Escala de Ingresos",
        description: "Escala de ingresos para el Ministerio de Cultura.",
        icon: <ClipboardList className="h-5 w-5 text-pink-600" />,
        color: "bg-pink-50 hover:bg-pink-100",
      },
    ],
  },
];

// Map report IDs to their form components
const REPORT_FORMS: Record<string, React.ComponentType> = {
  existencias: ReporteExistencias,
  "movimientos-dependencia": ReporteMovimientosDependencia,
  "movimientos-producto": ReporteMovimientosProducto,
  proveedores: ReporteProveedores,
  clientes: ReporteClientes,
  liquidaciones: ReporteLiquidaciones,
  proyectos: ReporteProyectos,
  creadores: ReporteCreadores,
  desempeno: ReporteDesempeno,
  onat: ReporteOnat,
  mincult: ReporteMincult,
};

// Map report IDs to their titles
const REPORT_TITLES: Record<string, string> = {
  existencias: "Existencias",
  "movimientos-dependencia": "Movimientos por Dependencia",
  "movimientos-producto": "Movimientos por Producto",
  proveedores: "Proveedores por Dependencia",
  clientes: "Registro de Clientes",
  liquidaciones: "Resumen de Liquidaciones",
  proyectos: "Registro de Proyectos",
  creadores: "Registro de Creadores",
  desempeno: "Informe de Desempeño",
  onat: "ONAT — Ingresos y Retenciones",
  mincult: "MINCULT — Escala de Ingresos",
};

// List item component for a report
function ReportListItem({
  report,
  onClick,
}: {
  report: ReportItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 rounded-lg transition-colors group border-b border-gray-100 last:border-b-0"
    >
      <div className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0">
        {report.icon}
      </div>
      <span className="font-medium text-sm text-gray-800 group-hover:text-blue-600 transition-colors min-w-0">
        {report.title}
      </span>
      <span className="text-xs text-gray-400 ml-auto flex-shrink-0 hidden sm:block">
        {report.description}
      </span>
    </button>
  );
}

export function ReportesHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const moduleParam = searchParams.get("module");

  // Open category modal when module param is set
  const selectedCategory = useMemo(
    () => (moduleParam ? REPORT_CATEGORIES.find((c) => c.id === moduleParam) ?? null : null),
    [moduleParam]
  );

  // Clear module param when a report is selected
  useEffect(() => {
    if (selectedReport) {
      setSearchParams({}, { replace: true });
    }
  }, [selectedReport, setSearchParams]);

  const ReportFormComponent = useMemo(
    () => (selectedReport ? REPORT_FORMS[selectedReport] : null),
    [selectedReport]
  );

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setSearchParams({}, { replace: true });
  };

  const handleCloseCategory = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="h-[calc(100vh-8rem)] overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-4">
            <BarChart3 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Centro de Reportes
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Genera y visualiza reportes de todos los módulos del sistema.
            Selecciona una categoría o usa el menú lateral.
          </p>
        </div>

        {/* Categories */}
        {REPORT_CATEGORIES.map((category) => (
          <section key={category.id} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {category.icon}
              <h2 className="text-lg font-bold text-gray-800">{category.title}</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {category.reports.map((report) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  onClick={() => handleSelectReport(report.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Category Modal (opened from sidebar) */}
      <ReportCategoryModal
        isOpen={!!selectedCategory}
        onClose={handleCloseCategory}
        categoryTitle={selectedCategory?.title ?? ""}
        categoryIcon={selectedCategory?.icon ?? <BarChart3 className="w-5 h-5" />}
        reports={selectedCategory?.reports ?? []}
        onSelectReport={handleSelectReport}
      />

      {/* Report Form Modal */}
      {selectedReport && ReportFormComponent && (
        <ReportFormModal
          isOpen={!!selectedReport}
          onClose={handleCloseModal}
          onBack={() => {
            setSelectedReport(null);
            // Find the category for this report and reopen it
            const cat = REPORT_CATEGORIES.find((c) =>
              c.reports.some((r) => r.id === selectedReport)
            );
            if (cat) {
              setSearchParams({ module: cat.id }, { replace: true });
            }
          }}
          title={REPORT_TITLES[selectedReport] ?? selectedReport}
        >
          <ReportFormComponent />
        </ReportFormModal>
      )}
    </div>
  );
}

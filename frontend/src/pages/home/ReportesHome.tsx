import { Link } from "react-router-dom";
import {
  BarChart3,
  Package,
  DollarSign,
  Download,
  TrendingUp,
  Boxes,
  ArrowLeftRight,
  UserCircle,
  FileText,
  TrendingDown,
  Users,
  Layers,
  Calculator,
  ClipboardList,
} from "lucide-react";

interface ReportCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function ReportCard({ to, icon, title, description, color }: ReportCardProps) {
  return (
    <Link
      to={to}
      className={`flex items-start gap-3 p-4 ${color} rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
    >
      <div className="p-2 rounded-lg bg-white/80 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-gray-800 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function ReportesHome() {
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

        {/* Inventario */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Inventario</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportCard
              to="/reportes/existencias"
              icon={<Boxes className="h-5 w-5 text-blue-600" />}
              title="Existencias"
              description="Stock actual de productos por dependencia con totales generales."
              color="bg-blue-50 hover:bg-blue-100"
            />
            <ReportCard
              to="/reportes/movimientos-dependencia"
              icon={<ArrowLeftRight className="h-5 w-5 text-green-600" />}
              title="Movimientos por Dependencia"
              description="Historial de movimientos filtrado por dependencia y período."
              color="bg-green-50 hover:bg-green-100"
            />
            <ReportCard
              to="/reportes/movimientos-producto"
              icon={<Package className="h-5 w-5 text-purple-600" />}
              title="Movimientos por Producto"
              description="Seguimiento detallado de un producto específico en el tiempo."
              color="bg-purple-50 hover:bg-purple-100"
            />
          </div>
        </section>

        {/* Compras */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800">Compras</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              to="/reportes/proveedores"
              icon={<UserCircle className="h-5 w-5 text-amber-600" />}
              title="Proveedores"
              description="Listado de proveedores registrados con información de contacto."
              color="bg-amber-50 hover:bg-amber-100"
            />
            <ReportCard
              to="/reportes/resumen-liquidaciones"
              icon={<Calculator className="h-5 w-5 text-orange-600" />}
              title="Resumen de Liquidaciones"
              description="Resumen de liquidaciones realizadas por período y proveedor."
              color="bg-orange-50 hover:bg-orange-100"
            />
          </div>
        </section>

        {/* Ventas */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">Ventas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              to="/reportes/registro-clientes"
              icon={<Users className="h-5 w-5 text-emerald-600" />}
              title="Registro de Clientes"
              description="Listado de clientes registrados con historial de compras."
              color="bg-emerald-50 hover:bg-emerald-100"
            />
          </div>
        </section>

        {/* Proyectos */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-800">Proyectos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportCard
              to="/reportes/registro-proyectos"
              icon={<Layers className="h-5 w-5 text-indigo-600" />}
              title="Registro de Proyectos"
              description="Listado de proyectos con estado, fechas y montos."
              color="bg-indigo-50 hover:bg-indigo-100"
            />
            <ReportCard
              to="/reportes/registro-creadores"
              icon={<Users className="h-5 w-5 text-violet-600" />}
              title="Registro de Creadores"
              description="Listado de creadores participantes en proyectos."
              color="bg-violet-50 hover:bg-violet-100"
            />
            <ReportCard
              to="/reportes/informe-desempeno"
              icon={<BarChart3 className="h-5 w-5 text-cyan-600" />}
              title="Informe de Desempeño"
              description="Análisis de rendimiento y productividad por proyecto."
              color="bg-cyan-50 hover:bg-cyan-100"
            />
          </div>
        </section>

        {/* Ministerios */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-gray-800">Ministerios</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportCard
              to="/reportes/onat"
              icon={<FileText className="h-5 w-5 text-rose-600" />}
              title="Ingresos y Retenciones"
              description="Reporte de ingresos y retenciones para ONAT."
              color="bg-rose-50 hover:bg-rose-100"
            />
            <ReportCard
              to="/reportes/mincult"
              icon={<ClipboardList className="h-5 w-5 text-pink-600" />}
              title="MINCULT - Escala de Ingresos"
              description="Escala de ingresos para el Ministerio de Cultura."
              color="bg-pink-50 hover:bg-pink-100"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

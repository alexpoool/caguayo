import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  User,
  Building2,
  CreditCard,
  Shield,
  Database,
  MapPin,
  Boxes,
  UserCircle,
  Briefcase,
  Wrench,
  BarChart3,
  ChevronRight,
} from "lucide-react";

export function HomePage() {
  const { user, baseDatos } = useAuth();

  const modulos = [
    {
      id: "inventario",
      path: "/movimientos",
      label: "Inventario",
      icon: Boxes,
      desc: "Gestión de stock, almacén y artículos",
      color: "text-blue-600",
      bg: "bg-blue-50",
      hover: "hover:border-blue-300",
    },
    {
      id: "compra",
      path: "/compra/clientes",
      label: "Compras",
      icon: UserCircle,
      desc: "Proveedores, convenios y anexos",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      hover: "hover:border-emerald-300",
    },
    {
      id: "venta",
      path: "/clientes",
      label: "Ventas",
      icon: Briefcase,
      desc: "Clientes, contratos y facturas",
      color: "text-purple-600",
      bg: "bg-purple-50",
      hover: "hover:border-purple-300",
    },
    {
      id: "proyecto",
      path: "/proyectos/servicios",
      label: "Proyectos",
      icon: Wrench,
      desc: "Servicios, etapas y liquidaciones",
      color: "text-orange-600",
      bg: "bg-orange-50",
      hover: "hover:border-orange-300",
    },
    {
      id: "reportes",
      path: "/reportes/alertas-stock",
      label: "Reportes",
      icon: BarChart3,
      desc: "Estadísticas, alertas y existencias",
      color: "text-rose-600",
      bg: "bg-rose-50",
      hover: "hover:border-rose-300",
    },
  ];

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6 p-6 overflow-y-auto">
      {/* Columna izquierda - Info del usuario */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{user?.nombre}</h2>
            <p className="text-gray-400 text-sm">@{user?.alias}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Cédula</p>
              <p className="text-sm font-medium text-gray-900">{user?.ci}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nombre completo</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.nombre} {user?.primer_apellido} {user?.segundo_apellido}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Grupo</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.grupo?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Dependencia</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Base de Datos</p>
              <p className="text-sm font-medium text-gray-900">{baseDatos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Columna centro - Módulos */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Bienvenido a Caguayo
          </h1>
          <p className="text-gray-500 mt-1">
            Selecciona un módulo para comenzar a trabajar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modulos.map((mod) => (
            <Link
              key={mod.id}
              to={mod.path}
              className={`flex flex-col bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md ${mod.hover} group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${mod.bg}`}
                >
                  <mod.icon className={`h-6 w-6 ${mod.color}`} />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {mod.label}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Columna derecha - Info de la empresa */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {user?.dependencia?.nombre}
            </h2>
            <p className="text-gray-400 text-sm">Información de la empresa</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.email || "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Base de Datos</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.base_datos}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Servidor</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.dependencia?.host}:{user?.dependencia?.puerto}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

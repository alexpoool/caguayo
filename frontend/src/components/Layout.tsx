import React from "react";
import { Search, Bell, HelpCircle, ChevronRight, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>{children}</div>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">CAGUAYO</h1>
      </div>
      <nav className="space-y-2">{children}</nav>
    </div>
  );
}

export function Header({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();

  const getInitials = () => {
    if (!user) return "US";
    const firstInitial = user.nombre ? user.nombre.charAt(0).toUpperCase() : "";
    const lastInitial = user.primer_apellido
      ? user.primer_apellido.charAt(0).toUpperCase()
      : "";
    if (firstInitial || lastInitial) return `${firstInitial}${lastInitial}`;
    return user.alias ? user.alias.slice(0, 2).toUpperCase() : "US";
  };

  const displayName = user
    ? `${user.nombre || ""} ${user.primer_apellido || ""}`.trim() || user.alias
    : "Cargando...";

  const roleName = user?.grupo?.nombre || "Usuario";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-2 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Izquierda: Migas de pan o Título */}
        <div className="flex-1 lg:w-1/3 flex items-center space-x-2 text-sm text-gray-500">
          <span className="hover:text-gray-900 cursor-pointer transition-colors">
            Inicio
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Panel</span>
        </div>

        {/* Centro: Buscador global (Oculto en móvil) */}
        <div className="flex-1 justify-center hidden lg:flex px-4 w-full">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente, documento..."
              className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
        </div>

        {/* Derecha: Utilidades y perfil de usuario */}
        <div className="flex-1 lg:w-1/3 flex items-center justify-end space-x-3">
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Ayuda"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            className="relative text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute 0 -right-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              3
            </span>
          </button>

          <div className="flex items-center ml-2 pl-3 border-l border-gray-200 cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs select-none">
              {getInitials()}
            </div>
            <div className="hidden md:flex flex-col ml-2 items-start justify-center">
              <span className="text-sm font-semibold text-gray-700 leading-none mb-1">
                {displayName}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-medium leading-none tracking-wider line-clamp-1 max-w-[120px]">
                {roleName}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Contenido extra para vistas específicas */}
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 p-6">{children}</main>;
}

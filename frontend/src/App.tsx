import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  Package,
  Boxes,
  Clock,
  Home,
  Briefcase,
  BarChart3,
  UserCircle,
  Settings,
  Shield,
  Building,
  Coins,
  ChevronLeft,
  ChevronRight,
  FileText,
  FilePlus,
  Receipt,
  DollarSign,
} from "lucide-react";

import { WelcomePage } from "./pages/Welcome";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { HomePage } from "./pages/HomePage";
import { PerfilPage } from "./pages/Perfil";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProductosPage } from "./pages/Productos";
import { ClientesPage } from "./pages/Clientes";
import { PerfilClientePage } from "./pages/PerfilCliente";
import { MovimientosPage } from "./pages/Movimientos";
import { MovimientosPendientesPage } from "./pages/MovimientosPendientes";
import { RecepcionesPage } from "./pages/RecepcionesPage";
import { MovimientoAjusteForm } from "./pages/movimientos/MovimientoAjusteForm";
import { ConfiguracionPage } from "./pages/Configuracion";
import { InventarioHome } from "./pages/home/InventarioHome";
import { AdministracionHome } from "./pages/home/AdministracionHome";
import { VentaHome } from "./pages/home/VentaHome";
import { CompraHome } from "./pages/home/CompraHome";
import { ReportesHome } from "./pages/home/ReportesHome";
import { CompraConveniosPage } from "./pages/compra/ConveniosPage";
import { CompraAnexosPage } from "./pages/compra/AnexosPage";
import { ProductosEnLiquidacionPage } from "./pages/compra/ProductosEnLiquidacionPage";
import { LiquidacionesPage } from "./pages/compra/LiquidacionesPage";
import { CrearLiquidacionPage } from "./pages/compra/CrearLiquidacionPage";
import { ContratosPage } from "./pages/ventas/ContratosPage";
import { SuplementosPage } from "./pages/ventas/SuplementosPage";
import { FacturasPage } from "./pages/ventas/FacturasPage";
import { VentasEfectivoPage } from "./pages/ventas/VentasEfectivoPage";
import ReporteProveedores from "./pages/reportes/ReporteProveedores";
import ReporteExistencias from "./pages/reportes/ReporteExistencias";
import ReporteMovimientosDependencia from "./pages/reportes/ReporteMovimientosDependencia";
import ReporteMovimientosProducto from "./pages/reportes/ReporteMovimientosProducto";

type Modulo =
  | "administracion"
  | "venta"
  | "compra"
  | "inventario"
  | "reportes"
  | "home";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const rutasPorModulo: Record<Modulo, string[]> = {
  inventario: [
    "/inventario",
    "/movimientos",
    "/movimientos/pendientes",
    "/movimientos/ajuste",
    "/movimientos/seleccionar-recepcion",
    "/productos",
  ],
  administracion: ["/administracion", "/perfil"],
  venta: [
    "/venta",
    "/ventas",
    "/clientes",
    "/ventas/operaciones",
    "/ventas/contratos",
    "/ventas/suplementos",
    "/ventas/facturas",
    "/ventas/efectivo",
  ],
  compra: [
    "/compra",
    "/compra/clientes",
    "/compra/convenios",
    "/compra/anexos",
    "/compra/liquidaciones",
    "/compra/productos-liquidacion",
  ],
  reportes: [
    "/reportes",
    "/reportes/proveedores",
    "/reportes/existencias",
    "/reportes/movimientos-dependencia",
    "/reportes/movimientos-producto",
  ],
  home: ["/"],
};

// Componente para proteger rutas según el módulo
function ProtectedRoute({
  children,
  moduloActivo,
  currentPath,
}: {
  children: React.ReactNode;
  moduloActivo: Modulo;
  currentPath: string;
}) {
  const rutasPermitidas = rutasPorModulo[moduloActivo];
  const isAllowed = rutasPermitidas.some(
    (route) =>
      currentPath === route || (route !== "/" && currentPath.startsWith(route)),
  );

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [moduloActivo, setModuloActivo] = useState<Modulo>("inventario");
  const [slimSidebar, setSlimSidebar] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage =
    location.pathname === "/" ||
    location.pathname === "/administracion" ||
    location.pathname === "/perfil";

  // All hooks must be called before any early returns
  useEffect(() => {
    // Only redirect to login if we're not loading and not authenticated, and not already on login or register page
    if (
      !isLoading &&
      !isAuthenticated &&
      location.pathname !== "/login" &&
      location.pathname !== "/register"
    ) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  useEffect(() => {
    const path = location.pathname || "/";
    if (path === "/") {
      setModuloActivo("home");
      return;
    }
    for (const [moduloKey, rutas] of Object.entries(rutasPorModulo) as [
      Modulo,
      string[],
    ][]) {
      if (
        rutas.some((route) =>
          route === "/"
            ? path === route
            : path === route || (route !== "/" && path.startsWith(route)),
        )
      ) {
        setModuloActivo(moduloKey);
        return;
      }
    }
    setModuloActivo("inventario");
  }, [location.pathname]);

  // Ensure sidebar is expanded on initial load
  useEffect(() => {
    setSlimSidebar(false);
  }, []);

  // Early returns must come AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // When not authenticated, redirect to login happens via useEffect
  // The content below is only for authenticated users

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowAccountModal(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleLinkClick = () => {};

  const handleModuloClick = (moduloId: Modulo) => {
    setModuloActivo(moduloId);
    // Navegar a la página home del módulo
    navigate(`/${moduloId}`);
  };

  // Sidebar and header are always visible

  const NavLink = ({
    to,
    children,
    onClick,
    exact = false,
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
    exact?: boolean;
  }) => {
    const linkLocation = useLocation();
    const isActive = exact
      ? linkLocation.pathname === to
      : linkLocation.pathname === to ||
        (linkLocation.pathname.startsWith(`${to}/`) && to !== "/movimientos");
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`
          group flex items-center ${slimSidebar ? "justify-center" : "gap-3"} ${slimSidebar ? "px-0" : "px-3"} py-2.5 rounded-lg 
          transition-all duration-300 ease-out relative overflow-hidden
          ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }
        `}
      >
        <span
          className={`
          absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 
          bg-blue-400 rounded-r-full transition-all duration-300
          group-hover:h-6
          ${isActive ? "h-8 bg-white" : ""}
        `}
        />
        <span
          className={`
          transition-all duration-300
          ${isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-blue-400 group-hover:scale-110"}
        `}
        >
          {children && React.Children.toArray(children)[0]}
        </span>
        {!slimSidebar && (
          <span className="font-medium">
            {children && React.Children.toArray(children).slice(1)}
          </span>
        )}
      </Link>
    );
  };

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: "venta", label: "Venta", icon: Briefcase },
    { id: "compra", label: "Compra", icon: UserCircle },
    { id: "inventario", label: "Inventario", icon: Boxes },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
  ];

  function handleToggleSlim(_event: React.MouseEvent<HTMLButtonElement>): void {
    setSlimSidebar((prev) => !prev);
  }
  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={`grid ${isHomePage ? "grid-cols-[0_1fr]" : slimSidebar ? "grid-cols-[4.5rem_1fr]" : "grid-cols-[16rem_1fr]"} grid-rows-[auto_1fr] h-screen bg-gray-50`}
      >
        <aside
          className={`row-span-2 col-start-1 col-end-2 h-full bg-slate-900 text-white flex flex-col shadow-xl min-h-screen transition-all duration-300 ${isHomePage ? "hidden" : slimSidebar ? "w-[4.5rem]" : "w-64"}`}
        >
          <div
            className={`flex items-center ${slimSidebar ? "justify-center px-0" : "px-6"} py-4 border-b border-slate-800`}
          >
            {!slimSidebar && (
              <h1 className="text-2xl font-bold tracking-wider text-blue-400">
                CAGUAYO
              </h1>
            )}
            <button
              onClick={handleToggleSlim}
              title={slimSidebar ? "Expandir sidebar" : "Contraer sidebar"}
              className={`p-1 rounded-full hover:bg-slate-800 transition-colors ${slimSidebar ? "" : "ml-2"}`}
            >
              {slimSidebar ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
          <nav
            className={`flex-1 overflow-y-auto py-4 ${slimSidebar ? "px-1" : ""}`}
          >
            <>
              {moduloActivo === "inventario" && (
                <ul className={`space-y-1 ${slimSidebar ? "px-0" : "px-3"}`}>
                  <li>
                    <NavLink to="/movimientos" onClick={handleLinkClick} exact>
                      <ArrowLeftRight className="w-5 h-5" />
                      Movimientos
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/movimientos/pendientes"
                      onClick={handleLinkClick}
                    >
                      <Clock className="w-5 h-5" />
                      Pendientes
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/productos" onClick={handleLinkClick}>
                      <Boxes className="w-5 h-5" />
                      Productos
                    </NavLink>
                  </li>
                </ul>
              )}
              {moduloActivo === "administracion" && (
                <ul className={`space-y-1 ${slimSidebar ? "px-0" : "px-3"}`}>
                  <li>
                    <NavLink to="/configuracion" onClick={handleLinkClick}>
                      <Settings className="w-5 h-5" />
                      Configuración
                    </NavLink>
                  </li>
                </ul>
              )}
              {moduloActivo === "compra" && (
                <ul className={`space-y-1 ${slimSidebar ? "px-0" : "px-3"}`}>
                  <li>
                    <NavLink to="/compra/clientes" onClick={handleLinkClick}>
                      <UserCircle className="w-5 h-5" />
                      Proveedores
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/compra/convenios" onClick={handleLinkClick}>
                      <FileText className="w-5 h-5" />
                      Convenios
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/compra/anexos" onClick={handleLinkClick}>
                      <Boxes className="w-5 h-5" />
                      Anexos
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/compra/liquidaciones"
                      onClick={handleLinkClick}
                    >
                      <Coins className="w-5 h-5" />
                      Liquidaciones
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/compra/productos-liquidacion"
                      onClick={handleLinkClick}
                    >
                      <Coins className="w-5 h-5" />
                      Productos en Liquidación
                    </NavLink>
                  </li>
                </ul>
              )}
              {moduloActivo === "venta" && (
                <ul className={`space-y-1 ${slimSidebar ? "px-0" : "px-3"}`}>
                  <li>
                    <NavLink to="/clientes" onClick={handleLinkClick}>
                      <UserCircle className="w-5 h-5" />
                      Clientes
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/ventas/contratos" onClick={handleLinkClick}>
                      <FilePlus className="w-5 h-5" />
                      Contrato
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/ventas/suplementos" onClick={handleLinkClick}>
                      <FileText className="w-5 h-5" />
                      Suplemento
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/ventas/facturas" onClick={handleLinkClick}>
                      <Receipt className="w-5 h-5" />
                      Factura
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/ventas/efectivo" onClick={handleLinkClick}>
                      <DollarSign className="w-5 h-5" />
                      Efectivo
                    </NavLink>
                  </li>
                </ul>
              )}
              {moduloActivo === "reportes" && (
                <ul className={`space-y-1 ${slimSidebar ? "px-0" : "px-3"}`}>
                  <li>
                    <NavLink
                      to="/reportes/proveedores"
                      onClick={handleLinkClick}
                    >
                      <BarChart3 className="w-5 h-5" />
                      Proveedores
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/reportes/existencias"
                      onClick={handleLinkClick}
                    >
                      <Package className="w-5 h-5" />
                      Existencias
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/reportes/movimientos-dependencia"
                      onClick={handleLinkClick}
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      Mov. Dependencia
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/reportes/movimientos-producto"
                      onClick={handleLinkClick}
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      Mov. Producto
                    </NavLink>
                  </li>
                </ul>
              )}
            </>
          </nav>
        </aside>
        <header
          className={`${isHomePage ? "col-start-1 col-end-3" : "col-start-2 col-end-3"} row-start-1 row-end-2 sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2">
            <Link
              to="/"
              onClick={() => setModuloActivo("home")}
              className="p-2 rounded-lg hover:bg-slate-50 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Inicio"
            >
              <Home className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </Link>
            <Link
              to="/administracion"
              onClick={() => setModuloActivo("administracion")}
              className="p-2 rounded-lg hover:bg-slate-50 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Administración"
            >
              <Settings className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </Link>
            <div className="relative group">
              <button
                onClick={() => setShowAccountModal(!showAccountModal)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-50 transition-colors focus:outline-none"
                title="Cuenta"
              >
                <img
                  src="/default.jpg"
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              </button>

              {/* Dropdown Menu */}
              {showAccountModal && (
                <>
                  {/* Invisible backdrop to close dropdown when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAccountModal(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-50 animate-fade-in-up">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src="/default.jpg"
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold truncate">
                          {user
                            ? `${user.nombre} ${user.primer_apellido}`
                            : "Usuario"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {user?.alias || "Cuenta de usuario"}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          setShowAccountModal(false);
                          setModuloActivo("administracion");
                          navigate("/perfil");
                        }}
                      >
                        Ver perfil
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded-md text-red-600 hover:bg-red-50 transition-colors mt-1"
                        onClick={() => {
                          setShowAccountModal(false);
                          setShowLogoutConfirm(true);
                        }}
                      >
                        Salir del sistema
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {["compra", "venta", "inventario", "reportes"].map((moduloId) => {
              const modulo = modulos.find((m) => m.id === moduloId);
              if (!modulo) return null;
              const isActive = moduloActivo === modulo.id;
              return (
                <button
                  key={modulo.id}
                  onClick={() => handleModuloClick(modulo.id)}
                  className={`text-sm font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 pb-1
                    ${
                      isActive
                        ? "text-blue-900 font-semibold border-b-2 border-blue-600"
                        : "text-blue-600 hover:text-blue-800"
                    }
                  `}
                >
                  {modulo.label}
                </button>
              );
            })}
          </div>
          <div className="animate-fade-in-up animation-fill-both"></div>
        </header>
        <div
          className={`${isHomePage ? "col-start-1 col-end-3" : "col-start-2 col-end-3"} row-start-2 row-end-3 min-w-0 flex flex-col overflow-hidden`}
        >
          <main className="flex-1 overflow-auto bg-slate-50 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="animate-fade-in-up animation-fill-both">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/compra/clientes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/clientes"
                      >
                        <ClientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos/pendientes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos/pendientes"
                      >
                        <MovimientosPendientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/productos"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/productos"
                      >
                        <ProductosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rutas de Inventario - protegidas */}
                  <Route
                    path="/inventario"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/inventario"
                      >
                        <InventarioHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos/pendientes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos/pendientes"
                      >
                        <MovimientosPendientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos/seleccionar-recepcion"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos"
                      >
                        <RecepcionesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos/ajuste"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos"
                      >
                        <MovimientoAjusteForm />
                      </ProtectedRoute>
                    }
                  />
                  {/* Rutas de Ventas - protegidas */}
                  <Route
                    path="/venta"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/venta"
                      >
                        <VentaHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clientes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/clientes"
                      >
                        <ClientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clientes/:id"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/clientes"
                      >
                        <PerfilClientePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ventas/operaciones"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/ventas/operaciones"
                      >
                        <VentaHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ventas/contratos"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/ventas/contratos"
                      >
                        <ContratosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ventas/suplementos"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/ventas/suplementos"
                      >
                        <SuplementosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ventas/facturas"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/ventas/facturas"
                      >
                        <FacturasPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ventas/efectivo"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/ventas/efectivo"
                      >
                        <VentasEfectivoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rutas de Administración - protegidas */}
                  <Route
                    path="/administracion"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/administracion"
                      >
                        <ConfiguracionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos"
                      >
                        <MovimientosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/movimientos/pendientes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/movimientos/pendientes"
                      >
                        <MovimientosPendientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/configuracion"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/configuracion"
                      >
                        <ConfiguracionPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rutas de Compras - protegidas */}
                  <Route
                    path="/compra"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra"
                      >
                        <CompraHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compra/convenios"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/convenios"
                      >
                        <CompraConveniosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compra/anexos"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/anexos"
                      >
                        <CompraAnexosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compra/liquidaciones"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/liquidaciones"
                      >
                        <LiquidacionesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compra/liquidaciones/crear"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/liquidaciones"
                      >
                        <CrearLiquidacionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compra/productos-liquidacion"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/compra/productos-liquidacion"
                      >
                        <ProductosEnLiquidacionPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rutas de Reportes - protegidas */}
                  <Route
                    path="/reportes"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/reportes"
                      >
                        <ReportesHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reportes/proveedores"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/reportes/proveedores"
                      >
                        <ReporteProveedores />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reportes/existencias"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/reportes/existencias"
                      >
                        <ReporteExistencias />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reportes/movimientos-dependencia"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/reportes/movimientos-dependencia"
                      >
                        <ReporteMovimientosDependencia />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reportes/movimientos-producto"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/reportes/movimientos-producto"
                      >
                        <ReporteMovimientosProducto />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/perfil"
                    element={
                      <ProtectedRoute
                        moduloActivo={moduloActivo}
                        currentPath="/perfil"
                      >
                        <PerfilPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold">
              Confirmar cierre de sesión
            </h4>
            <p className="text-sm text-slate-500 mt-2">
              ¿Estás seguro que quieres cerrar la sesión?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-md bg-slate-50 hover:bg-gray-200"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}

function AppWrapper() {
  return (
    <Router>
      <Toaster position="top-right" />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default AppWrapper;

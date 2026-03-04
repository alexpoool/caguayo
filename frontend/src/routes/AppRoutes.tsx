import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Modulo } from '../types/navigation';
import { rutasPorModulo } from '../config/navigation';

import { WelcomePage } from '../pages/Welcome';
import { ProductosPage } from '../pages/Productos';
import { ClientesPage } from '../pages/Clientes';
import { PerfilClientePage } from '../pages/PerfilCliente';
import { MonedasPage } from '../pages/Monedas';
import { MovimientosPage } from '../pages/Movimientos';
import { MovimientosPendientesPage } from '../pages/MovimientosPendientes';
import { RecepcionesPage } from '../pages/RecepcionesPage';
import { MovimientoAjusteForm } from '../pages/movimientos/MovimientoAjusteForm';
import { ConfiguracionPage } from '../pages/Configuracion';
import { UsuariosPage } from '../pages/Usuarios';
import { GruposPage } from '../pages/Grupos';
import { DependenciasPage } from '../pages/Dependencias';
import { InventarioHome } from '../pages/home/InventarioHome';
import { AdministracionHome } from '../pages/home/AdministracionHome';
import { VentaHome } from '../pages/home/VentaHome';
import { CompraHome } from '../pages/home/CompraHome';
import { ReportesHome } from '../pages/home/ReportesHome';
import { CompraClientesPage } from '../pages/compra/ClientesPage';
import { CompraConveniosPage } from '../pages/compra/ConveniosPage';
import { CompraAnexosPage } from '../pages/compra/AnexosPage';
import { ReportesInventarioHome } from '../pages/reportes/InventarioHome';
import { ReportesComprasHome } from '../pages/reportes/ComprasHome';
import { ReportesVentasHome } from '../pages/reportes/VentasHome';
import { ReporteExistenciasPage } from '../pages/reportes/ReporteExistenciasPage';
import { ReporteMovimientosDependenciaPage } from '../pages/reportes/ReporteMovimientosDependenciaPage';
import { ReporteKardexPage } from '../pages/reportes/ReporteKardexPage';

// Componente para proteger rutas según el módulo
function ProtectedRoute({ 
  children, 
  moduloActivo, 
  currentPath 
}: { 
  children: React.ReactNode; 
  moduloActivo: Modulo;
  currentPath: string;
}) {
  const rutasPermitidas = rutasPorModulo[moduloActivo];
  const isAllowed = rutasPermitidas.some(route => 
    currentPath === route || (route !== '/' && currentPath.startsWith(route))
  );
  
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

interface AppRoutesProps {
  moduloActivo: Modulo;
}

export function AppRoutes({ moduloActivo }: AppRoutesProps) {
  return (
    <div className="animate-fade-in-up animation-fill-both">
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/">
              <WelcomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compra/clientes"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/clientes">
              <CompraClientesPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/movimientos/pendientes" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos/pendientes">
              <MovimientosPendientesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/productos" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/productos">
              <ProductosPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas de Inventario - protegidas */}
        <Route 
          path="/inventario" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
              <InventarioHome />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/movimientos/seleccionar-recepcion" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
              <RecepcionesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/movimientos/ajuste" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
              <MovimientoAjusteForm />
            </ProtectedRoute>
          } 
        />
        {/* Rutas de Ventas - protegidas */}
        <Route 
          path="/venta" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/venta">
              <VentaHome />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes">
              <ClientesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/clientes/:id" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes">
              <PerfilClientePage />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas de Administración - protegidas */}
        <Route 
          path="/administracion" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/administracion">
              <AdministracionHome />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/monedas"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/monedas">
              <MonedasPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/movimientos" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
              <MovimientosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/configuracion" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion">
              <ConfiguracionPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/usuarios" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/usuarios">
              <UsuariosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grupos" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/grupos">
              <GruposPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/dependencias" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/dependencias">
              <DependenciasPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas de Compras - protegidas */}
        <Route 
          path="/compra" 
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra">
              <CompraHome />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/convenios"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/convenios">
              <CompraConveniosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/anexos"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/anexos">
              <CompraAnexosPage />
            </ProtectedRoute>
          }
        />
        
        {/* Rutas de Reportes - protegidas */}
        <Route
          path="/reportes"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReportesHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/inventario"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReportesInventarioHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/inventario/existencias"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReporteExistenciasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/inventario/movimientos-dependencia"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReporteMovimientosDependenciaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/inventario/kardex"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReporteKardexPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/compras"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReportesComprasHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/ventas"
          element={
            <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
              <ReportesVentasHome />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

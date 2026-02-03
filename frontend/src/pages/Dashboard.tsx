import { useState, useEffect } from "react";
import { dashboardService } from "../services/api";
import type { DashboardStats } from "../types";
import { Package, ShoppingCart, TrendingUp, Grid3x3 } from "lucide-react";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar estadísticas",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-gray-500">No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vista general del </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Productos
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_productos}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_ventas}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Movimientos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_movimientos}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <Grid3x3 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_categorias}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ventas del mes y productos con stock bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventas del Mes
          </h2>
          <p className="text-3xl font-bold text-green-600">
            ${stats.ventas_mes_actual.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">Total vendido este mes</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Productos con Stock Bajo
          </h2>
          <div className="space-y-2">
            {stats.productos_stock_bajo.length > 0 ? (
              stats.productos_stock_bajo.map((producto) => (
                <div
                  key={producto.id_producto}
                  className="flex justify-between items-center py-2 border-b border-gray-100"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {producto.nombre}
                  </span>
                  <span className="text-sm text-gray-500">
                    ${producto.precio_venta.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No hay productos con stock bajo
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

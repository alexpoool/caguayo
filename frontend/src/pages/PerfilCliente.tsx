import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientesService } from '../services/api';
import type { ClienteWithVentas, Venta } from '../types/ventas';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, CreditCard, 
  Calendar, ShoppingCart, DollarSign, Package, TrendingUp,
  CheckCircle, XCircle, ExternalLink
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui';

export function PerfilClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clienteId = parseInt(id || '0');

  const { data: cliente, isLoading, isError, error } = useQuery<ClienteWithVentas>({
    queryKey: ['cliente-perfil', clienteId],
    queryFn: () => clientesService.getClienteWithVentas(clienteId),
    enabled: !!clienteId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando perfil del cliente...</div>
      </div>
    );
  }

  if (isError || !cliente) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar el perfil</p>
          <p>{error instanceof Error ? error.message : 'Cliente no encontrado'}</p>
          <Button onClick={() => navigate('/clientes')} className="mt-4 gap-2" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver a Clientes
          </Button>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalVentas = cliente.ventas?.length || 0;
  const ventasCompletadas = cliente.ventas?.filter((v: Venta) => v.estado === 'COMPLETADA').length || 0;
  const ventasPendientes = cliente.ventas?.filter((v: Venta) => v.estado === 'PENDIENTE').length || 0;
  const montoTotal = cliente.ventas?.reduce((sum: number, v: Venta) => sum + v.total, 0) || 0;
  const montoCompletado = cliente.ventas
    ?.filter((v: Venta) => v.estado === 'COMPLETADA')
    .reduce((sum: number, v: Venta) => sum + v.total, 0) || 0;

  const getEstadoBadge = (estado: string) => {
    const styles = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      COMPLETADA: 'bg-green-100 text-green-800',
      ANULADA: 'bg-red-100 text-red-800'
    };
    return styles[estado as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/clientes')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil del Cliente</h1>
          <p className="text-gray-500">Información detallada y historial de compras</p>
        </div>
      </div>

      {/* Info General y Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Cliente */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{cliente.nombre}</CardTitle>
                <p className="text-sm text-gray-500">Cliente desde {new Date(cliente.fecha_registro).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Cédula / RIF</p>
                <p className="font-medium">{cliente.cedula_rif || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{cliente.telefono || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{cliente.email || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{cliente.direccion || 'No registrada'}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                {cliente.activo ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700">Cliente Activo</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">Cliente Inactivo</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-50">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Ventas</p>
                  <p className="text-2xl font-bold">{totalVentas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-50">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monto Total</p>
                  <p className="text-2xl font-bold">${montoTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-50">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ventas Completadas</p>
                  <p className="text-2xl font-bold">{ventasCompletadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-50">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monto Completado</p>
                  <p className="text-2xl font-bold">${montoCompletado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-orange-50">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ventas Pendientes</p>
                    <p className="text-2xl font-bold">{ventasPendientes}</p>
                  </div>
                </div>
                {ventasPendientes > 0 && (
                  <Button onClick={() => navigate('/ventas')} variant="secondary" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Ver Ventas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de Ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalVentas === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Este cliente no tiene ventas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cliente.ventas?.map((venta: Venta) => (
                    <TableRow key={venta.id_venta} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{venta.id_venta}</TableCell>
                      <TableCell>
                        {new Date(venta.fecha).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>{venta.detalles?.length || 0} productos</TableCell>
                      <TableCell className="font-medium">
                        ${venta.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(venta.estado)}`}>
                          {venta.estado}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

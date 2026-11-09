import { ArrowRight, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/components';
import { formatFecha } from '../../../../utils/fecha';
import type { ClienteReciente } from '../../domain/dashboard';

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((parte) => parte[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function ClientesRecientesCard({
  clientes,
  onVerClientes,
  onCliente,
  delay = 0,
}: {
  clientes: ClienteReciente[];
  onVerClientes: () => void;
  onCliente: (id: number) => void;
  delay?: number;
}) {
  return (
    <Card animate style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-brand-600" />
          Clientes Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clientes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clientes.slice(0, 8).map((cliente) => (
              <div
                key={cliente.id_cliente}
                className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                onClick={() => onCliente(cliente.id_cliente)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-600">
                  {iniciales(cliente.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {cliente.nombre}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatFecha(cliente.fecha_registro) ||
                      'Fecha no disponible'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Users className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              No hay clientes registrados recientemente
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className="mt-4 w-full text-brand-600 hover:text-brand-800"
          onClick={onVerClientes}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Ver todos los clientes
        </Button>
      </CardContent>
    </Card>
  );
}

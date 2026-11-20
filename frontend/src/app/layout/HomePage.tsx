import { useAuth } from '@/shared/ui/auth';
import { useEmpresa } from '@/config/branding';
import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronDown, ChevronRight, Clock3 } from 'lucide-react';

type FuncItem = {
  key: string;
  label: string;
};

type ModuleNode = {
  key: string;
  label: string;
  enabled: boolean;
  funcs: FuncItem[];
};

const MODULES: ModuleNode[] = [
  {
    key: 'terceros',
    label: 'Terceros',
    enabled: false,
    funcs: [
      { key: 'clientes', label: 'Clientes' },
      { key: 'contratos', label: 'Contratos' },
      { key: 'proveedores', label: 'Proveedores' },
      { key: 'convenios', label: 'Convenios' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    enabled: false,
    funcs: [
      { key: 'movimientos', label: 'Movimientos' },
      { key: 'pendientes', label: 'Pendientes' },
      { key: 'productos', label: 'Productos' },
    ],
  },
  {
    key: 'compra',
    label: 'Compra',
    enabled: false,
    funcs: [
      { key: 'proveedores', label: 'Proveedores' },
      { key: 'convenios', label: 'Convenios' },
      { key: 'anexos', label: 'Anexos' },
      { key: 'liquidaciones', label: 'Liquidaciones' },
      { key: 'productos_liquidacion', label: 'Productos en Liquidación' },
    ],
  },
  {
    key: 'venta',
    label: 'Tienda',
    enabled: false,
    funcs: [
      { key: 'clientes', label: 'Clientes' },
      { key: 'contratos', label: 'Contratos' },
      { key: 'suplementos', label: 'Suplementos' },
      { key: 'facturas', label: 'Facturas' },
      { key: 'venta_efectivo', label: 'Venta en Efectivo' },
    ],
  },
  {
    key: 'proyecto',
    label: 'Proyectos',
    enabled: false,
    funcs: [
      { key: 'servicios', label: 'Servicios' },
      { key: 'solicitudes', label: 'Solicitudes' },
      { key: 'proyectos', label: 'Proyectos' },
      { key: 'facturas_servicio', label: 'Facturas de Servicio' },
      { key: 'ofertas', label: 'Ofertas' },
      { key: 'pre_facturas', label: 'Pre-facturas' },
      { key: 'liquidaciones_servicio', label: 'Liquidaciones de Servicio' },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    enabled: false,
    funcs: [
      { key: 'reporte_existencias', label: 'Reporte de Existencias' },
      { key: 'reporte_movimientos_dependencia', label: 'Mov. por Dependencia' },
      { key: 'reporte_movimientos_producto', label: 'Mov. por Producto' },
      { key: 'reporte_proveedores', label: 'Registro de Proveedores' },
      { key: 'reporte_clientes', label: 'Registro de Clientes' },
      { key: 'reporte_proyectos', label: 'Registro de Proyectos' },
      { key: 'reporte_creadores', label: 'Registro de Realizadores' },
      { key: 'reporte_desempeno', label: 'Informe de Desempeño' },
      { key: 'reporte_liquidaciones', label: 'Resumen de Liquidaciones' },
      { key: 'reporte_onat', label: 'ONAT - Retenciones' },
      { key: 'reporte_mincult', label: 'MINCULT - Ingresos' },
    ],
  },
  {
    key: 'administracion',
    label: 'Administración',
    enabled: false,
    funcs: [
      { key: 'monedas', label: 'Monedas' },
      { key: 'usuarios', label: 'Usuarios' },
      { key: 'grupos', label: 'Grupos' },
      { key: 'dependencias', label: 'Dependencias' },
      { key: 'cuentas', label: 'Cuentas' },
    ],
  },
];

const guideSteps = [
  {
    step: 1,
    title: 'Usa el menú lateral',
    desc: 'Encuentra todos los módulos disponibles según tu rol.',
  },
  {
    step: 2,
    title: 'Selecciona un módulo',
    desc: 'Los módulos sin acceso aparecen en rojo y no son expandibles.',
  },
  {
    step: 3,
    title: 'Trabaja dentro del módulo',
    desc: 'Cada módulo muestra solo las funcionalidades habilitadas para tu grupo.',
  },
  {
    step: 4,
    title: 'Cierra sesión al terminar',
    desc: 'Usa el menú de usuario arriba a la derecha.',
  },
];

export function HomePage() {
  const { funcionalidades, user } = useAuth();
  const empresa = useEmpresa();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    terceros: false,
    inventario: false,
    compra: false,
    venta: false,
    proyecto: false,
    reportes: false,
    administracion: false,
  });

  const modules = useMemo(() => {
    const names = new Set(funcionalidades.map(f => f.nombre.toLowerCase()));
    return MODULES.map(m => {
      const enabledFuncs = m.funcs.filter(f => names.has(f.key.toLowerCase()));
      return {
        ...m,
        enabled: enabledFuncs.length > 0,
        funcs: enabledFuncs,
      };
    });
  }, [funcionalidades]);

  const enabledCount = modules.filter(m => m.enabled).length;
  const totalModules = modules.length;

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = () => {
    try {
      return new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatTime = () => {
    try {
      return new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-full w-full bg-surface">
      <div className="p-4 md:p-6 space-y-6">
        <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-[#092E83] via-[#1256C8] to-[#3288F4] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[34px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-36 right-1/4 h-72 w-72 rounded-full bg-blue-300/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Panel personal · {empresa.nombre}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">¡Bienvenido, {user?.nombre || 'Usuario'}! <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-50 sm:text-base">Has iniciado sesión como <strong>{user?.grupo?.nombre || 'Usuario'}</strong> en {empresa.nombre}.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-100">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate()}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{formatTime()}</span>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-100">Sesión activa</span>
            </div>
          </div>
          <BarChart3 className="absolute bottom-5 right-8 hidden h-28 w-28 text-white/20 lg:block" strokeWidth={1.2} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">Tus Accesos Habilitados</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Módulos y funcionalidades asignados a tu grupo. Módulos habilitados: {enabledCount} de {totalModules}
              </p>
            </div>

            <div className="max-h-[560px] overflow-y-auto px-6 pb-6">
              <ul className="space-y-2">
                {modules.map(mod => (
                  <li key={mod.key} className="rounded-lg border border-gray-100 bg-gray-50/40">
                    <button
                      onClick={() => mod.enabled && toggle(mod.key)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      disabled={!mod.enabled}
                    >
                      <div className="flex items-center gap-3">
                        {mod.enabled ? (
                          expanded[mod.key] ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            mod.enabled ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {mod.label}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          mod.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {mod.enabled ? 'Habilitado' : 'No habilitado'}
                      </span>
                    </button>

                    {mod.enabled && expanded[mod.key] && mod.funcs.length > 0 && (
                      <ul className="space-y-1 border-t border-gray-100 bg-white px-6 py-3">
                        {mod.funcs.map(f => (
                          <li key={f.key} className="flex items-center gap-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                            <span className="text-sm text-gray-700">{f.label}</span>
                            <span className="ml-auto text-xs text-green-600">Habilitado</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">Guía Rápida</h2>
              </div>
            </div>
            <div className="px-6 pb-6">
              <ol className="space-y-4">
                {guideSteps.map(step => (
                  <li key={step.step} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {step.step}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
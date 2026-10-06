import { useAuth } from '../context/AuthContext';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
      { key: 'configuracion', label: 'Configuración' },
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
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
      <div className="p-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 text-white shadow-lg">
          <div className="flex flex-col items-center gap-6 px-8 py-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">
                Bienvenido, <span className="text-brand-100">{user?.nombre || 'Usuario'}</span> 👋
              </h1>
              <p className="mt-2 text-sm text-slate-200 md:text-base">
                Has iniciado sesión como <strong>{user?.grupo?.nombre || 'Usuario'}</strong> en Caguayo.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 md:justify-start md:text-sm">
                <span>📅 {formatDate()}</span>
                <span>🕐 {formatTime()}</span>
                <span>💻 Sesión activa</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 text-4xl shadow-inner">
                🎛️
              </div>
              <p className="mt-2 text-sm font-semibold tracking-wide">CAGUAYO</p>
              <small className="text-xs text-slate-300">Sistema de Gestión</small>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <h2 className="text-base font-semibold text-slate-900">Tus Accesos Habilitados</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Módulos y funcionalidades asignados a tu grupo. Módulos habilitados: {enabledCount} de {totalModules}
              </p>
            </div>

            <div className="max-h-[560px] overflow-y-auto px-6 pb-6">
              <ul className="space-y-2">
                {modules.map(mod => (
                  <li key={mod.key} className="rounded-lg border border-slate-100 bg-slate-50/40">
                    <button
                      onClick={() => mod.enabled && toggle(mod.key)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      disabled={!mod.enabled}
                    >
                      <div className="flex items-center gap-3">
                        {mod.enabled ? (
                          expanded[mod.key] ? (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                          )
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            mod.enabled ? 'text-slate-900' : 'text-slate-400'
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
                      <ul className="space-y-1 border-t border-slate-100 bg-white px-6 py-3">
                        {mod.funcs.map(f => (
                          <li key={f.key} className="flex items-center gap-2 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                            <span className="text-sm text-slate-700">{f.label}</span>
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

          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <h2 className="text-base font-semibold text-slate-900">Guía Rápida</h2>
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
                      <p className="text-sm font-medium text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
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
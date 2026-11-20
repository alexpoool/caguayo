import { useMemo } from 'react';
import { BarChart3, BookOpen, Boxes, Briefcase, CalendarDays, ChartNoAxesCombined, Clock3, FileText, Package, ShoppingCart, Store, Users, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/shared/ui/auth';
import { useEmpresa } from '@/config/branding';

const MODULES = [
  { key: 'terceros', label: 'Terceros', icon: Users, color: '#2878F0', funcs: ['clientes', 'contratos', 'proveedores', 'convenios'] },
  { key: 'compra', label: 'Compra', icon: ShoppingCart, color: '#F59A32', funcs: ['proveedores', 'convenios', 'anexos', 'liquidaciones', 'productos_liquidacion'] },
  { key: 'venta', label: 'Tienda', icon: Store, color: '#8B5CF6', funcs: ['clientes', 'contratos', 'suplementos', 'facturas', 'venta_efectivo'] },
  { key: 'proyecto', label: 'Proyectos', icon: Wrench, color: '#0EA5A4', funcs: ['servicios', 'solicitudes', 'proyectos', 'facturas_servicio', 'ofertas', 'pre_facturas', 'liquidaciones_servicio'] },
  { key: 'inventario', label: 'Inventario', icon: Boxes, color: '#10A879', funcs: ['movimientos', 'pendientes', 'productos'] },
  { key: 'reportes', label: 'Reportes', icon: BarChart3, color: '#7C5CE7', funcs: ['reporte_existencias', 'reporte_movimientos_dependencia', 'reporte_movimientos_producto', 'reporte_proveedores', 'reporte_clientes', 'reporte_proyectos', 'reporte_creadores', 'reporte_desempeno', 'reporte_liquidaciones', 'reporte_onat', 'reporte_mincult'] },
];

export function HomeDashboardPreview() {
  const { funcionalidades, user } = useAuth();
  const empresa = useEmpresa();
  const names = useMemo(() => new Set(funcionalidades.map(f => f.nombre.toLowerCase())), [funcionalidades]);
  const available = useMemo(() => MODULES.map(module => ({
    ...module,
    count: module.funcs.filter(name => names.has(name)).length,
  })).filter(module => module.count > 0), [names]);
  const totalFunctions = available.reduce((sum, module) => sum + module.count, 0);
  const today = new Date();
  const date = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const chartData = available.map(module => ({ name: module.label, funcionalidades: module.count, color: module.color }));

  return (
    <div className="min-h-full w-full space-y-5 bg-[#F4F7FF] p-1 sm:p-2">
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-[#092E83] via-[#1256C8] to-[#3288F4] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[34px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 right-1/4 h-72 w-72 rounded-full bg-blue-300/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Panel personal · {empresa.nombre}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">¡Bienvenido, {user?.nombre || 'Usuario'}! <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-50 sm:text-base">Este es el resumen de las funcionalidades que tienes habilitadas en CAGUAYO.</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-100">
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{date}</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-100">Sesión activa</span>
          </div>
        </div>
        <ChartNoAxesCombined className="absolute bottom-5 right-8 hidden h-28 w-28 text-white/20 lg:block" strokeWidth={1.2} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Módulos habilitados</span><Boxes className="h-5 w-5 text-blue-600" /></div><p className="mt-3 text-3xl font-bold text-slate-900">{available.length}</p><p className="mt-1 text-xs text-slate-500">Con al menos una funcionalidad autorizada</p></div>
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Funcionalidades habilitadas</span><FileText className="h-5 w-5 text-emerald-600" /></div><p className="mt-3 text-3xl font-bold text-slate-900">{totalFunctions}</p><p className="mt-1 text-xs text-slate-500">Según los permisos de tu cuenta</p></div>
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Grupo de usuario</span><Users className="h-5 w-5 text-violet-600" /></div><p className="mt-3 truncate text-xl font-bold text-slate-900">{user?.grupo?.nombre || 'No definido'}</p><p className="mt-1 text-xs text-slate-500">Perfil de acceso actual</p></div>
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Dependencia</span><Briefcase className="h-5 w-5 text-orange-500" /></div><p className="mt-3 truncate text-xl font-bold text-slate-900">{user?.dependencia?.nombre || 'No definida'}</p><p className="mt-1 text-xs text-slate-500">Dependencia asociada a tu usuario</p></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><BarChart3 className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Distribución de permisos por módulo</h2><p className="text-xs text-slate-500">Cantidad de funcionalidades habilitadas en tu cuenta</p></div></div>
          {chartData.length ? <div className="h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EEF9" /><XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#F3F7FF' }} formatter={(value: number) => [value, 'Funcionalidades']} /><Bar dataKey="funcionalidades" radius={[7, 7, 0, 0]} maxBarSize={54}>{chartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">No hay funcionalidades habilitadas para mostrar.</div>}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Package className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Tus módulos</h2><p className="text-xs text-slate-500">Accesos disponibles según tus permisos</p></div></div>
          <div className="space-y-3">{available.map(module => { const Icon = module.icon; return <div key={module.key} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"><span className="rounded-lg p-2" style={{ backgroundColor: module.color + '18', color: module.color }}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{module.label}</span><span className="block text-xs text-slate-500">{module.count} {module.count === 1 ? 'funcionalidad habilitada' : 'funcionalidades habilitadas'}</span></span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>; })}{!available.length && <p className="py-8 text-center text-sm text-slate-500">No hay módulos habilitados.</p>}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6"><div className="flex items-start gap-4"><span className="rounded-xl bg-blue-600 p-3 text-white"><BookOpen className="h-6 w-6" /></span><div><h2 className="font-semibold text-slate-900">¿Necesitas ayuda?</h2><p className="mt-1 text-sm text-slate-600">Consulta la guía de usuario para conocer los procedimientos de los módulos y funcionalidades que tienes habilitados.</p></div></div></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6"><h2 className="font-semibold text-slate-900">Tu espacio de trabajo</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">El menú superior contiene los módulos del sistema. Al seleccionar uno, el menú lateral muestra únicamente las funcionalidades disponibles para tu usuario.</p></div>
      </section>
    </div>
  );
}

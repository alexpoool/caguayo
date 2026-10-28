import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  TrendingUp,
  ClipboardList,
  FileText,
  Settings,
  CalendarDays,
  Award,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

interface SubmoduloCard {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ReactNode;
  fase: number;
  /** Ruta de la página del submódulo; null si aún no está implementado. */
  ruta: string | null;
}

const SUBMODULOS: SubmoduloCard[] = [
  {
    id: 'catalogos',
    nombre: 'Catálogos',
    descripcion:
      'Contratos, bonificaciones, deducciones, pagos, departamentos, puestos, tipos de evaluación y calificaciones.',
    icon: <Settings className="h-5 w-5" />,
    fase: 1,
    ruta: '/rrhh/catalogos',
  },
  {
    id: 'departamentos',
    nombre: 'Departamentos',
    descripcion: 'Estructura de departamentos y sus responsables.',
    icon: <Building2 className="h-5 w-5" />,
    fase: 2,
    ruta: '/rrhh/catalogos?tab=departamentos',
  },
  {
    id: 'puestos',
    nombre: 'Puestos',
    descripcion: 'Puestos de trabajo y rangos salariales.',
    icon: <Briefcase className="h-5 w-5" />,
    fase: 2,
    ruta: '/rrhh/catalogos?tab=puestos',
  },
  {
    id: 'empleados',
    nombre: 'Empleados',
    descripcion: 'Ficha del personal, asignaciones y organigrama.',
    icon: <Users className="h-5 w-5" />,
    fase: 3,
    ruta: '/rrhh/empleados',
  },
  {
    id: 'asistencia',
    nombre: 'Asistencia',
    descripcion: 'Registro de entrada y salida, tardanzas y horas extras.',
    icon: <Clock className="h-5 w-5" />,
    fase: 4,
    ruta: '/rrhh/asistencia',
  },
  {
    id: 'deducciones',
    nombre: 'Deducciones',
    descripcion: 'Deducciones por empleado y periodo.',
    icon: <TrendingUp className="h-5 w-5" />,
    fase: 5,
    ruta: '/rrhh/movimientos',
  },
  {
    id: 'bonificaciones',
    nombre: 'Bonificaciones',
    descripcion: 'Bonificaciones por empleado y periodo.',
    icon: <Award className="h-5 w-5" />,
    fase: 5,
    ruta: '/rrhh/movimientos',
  },
  {
    id: 'nomina',
    nombre: 'Nómina',
    descripcion: 'Generación de nómina, recibos y control de estados.',
    icon: <FileText className="h-5 w-5" />,
    fase: 6,
    ruta: '/rrhh/nomina',
  },
  {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    descripcion: 'Vacaciones y permisos con flujo de aprobación.',
    icon: <CalendarDays className="h-5 w-5" />,
    fase: 7,
    ruta: '/rrhh/solicitudes',
  },
  {
    id: 'evaluaciones',
    nombre: 'Evaluaciones',
    descripcion: 'Evaluaciones de desempeño con objetivos seleccionados y ponderados.',
    icon: <ClipboardList className="h-5 w-5" />,
    fase: 8,
    ruta: '/rrhh/evaluaciones',
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    descripcion: 'Dashboards y reportes exportables del módulo.',
    icon: <BarChart3 className="h-5 w-5" />,
    fase: 9,
    ruta: '/rrhh/reportes',
  },
  {
    id: 'auditoria',
    nombre: 'Auditoría',
    descripcion: 'Registro de acciones del módulo.',
    icon: <ShieldAlert className="h-5 w-5" />,
    fase: 9,
    ruta: '/rrhh/auditoria',
  },
];

export function RrhhHome() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-3xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-panel-900 via-panel-700 to-brand-500 px-8 py-8 text-center text-white shadow-lg md:px-10">
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-400/60 bg-brand-500/20 shadow-inner">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-wide md:text-2xl">
            MÓDULO DE RECURSOS HUMANOS
          </h1>
          <p className="mt-1 text-sm text-slate-200 md:text-base">
            Gestión de personal, asistencia, nómina y evaluaciones
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm leading-relaxed text-slate-700">
            El módulo de Recursos Humanos gestiona el ciclo completo del
            personal: desde la estructura de departamentos y puestos hasta la
            asistencia diaria, las solicitudes de vacaciones, la generación de
            la nómina y las evaluaciones de desempeño.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SUBMODULOS.map((sub) => {
              const contenido = (
                <>
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    {sub.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {sub.nombre}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      {sub.descripcion}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        sub.ruta
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {sub.ruta ? 'Disponible' : `Fase ${sub.fase} · próximamente`}
                    </span>
                  </div>
                </>
              );

              const clases =
                'flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-left transition-shadow hover:shadow-sm';

              return sub.ruta ? (
                <Link key={sub.id} to={sub.ruta} className={clases}>
                  {contenido}
                </Link>
              ) : (
                <div key={sub.id} className={`${clases} opacity-70`} aria-disabled>
                  {contenido}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          <strong className="font-semibold">En construcción.</strong> La Fase 0
          del módulo dejó el esquema de base de datos y esta pantalla lista;
          cada submódulo se habilitará conforme avancen las fases.
        </div>
      </div>
    </div>
  );
}

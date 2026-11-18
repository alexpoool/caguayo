import { useEffect, useRef } from 'react';
import { cargarRuta, RUTAS_PRECARGA_INICIAL } from '@/app/rutas/cargadores';

interface ConexionNavegador {
  saveData?: boolean;
  effectiveType?: string;
}

const rutasPedidas = new Set<string>();

/** En redes limitadas o con ahorro de datos no se adelanta ninguna descarga. */
function redLimitada(): boolean {
  const conexion = (navigator as Navigator & { connection?: ConexionNavegador })
    .connection;
  if (!conexion) return false;
  if (conexion.saveData) return true;
  return (
    conexion.effectiveType === 'slow-2g' || conexion.effectiveType === '2g'
  );
}

/**
 * Descarga el chunk de la ruta antes del clic. Es best-effort: si falla, la
 * navegación normal vuelve a intentarlo.
 */
export function precargarRuta(pathname: string): void {
  if (redLimitada()) return;
  const ruta = pathname.split('?')[0];
  if (rutasPedidas.has(ruta)) return;
  const cargar = cargarRuta(ruta);
  if (!cargar) return;
  rutasPedidas.add(ruta);
  void cargar().catch(() => {
    // Permitir reintento en la siguiente visita o hover.
    rutasPedidas.delete(ruta);
  });
}

/** Precarga en tiempo muerto las rutas más usadas después del login. */
export function usePrecargaInactiva(activa: boolean): void {
  const lanzada = useRef(false);

  useEffect(() => {
    if (!activa || lanzada.current) return;
    lanzada.current = true;
    if (redLimitada()) return;

    const precargar = () => {
      if (document.visibilityState !== 'visible') return;
      for (const ruta of RUTAS_PRECARGA_INICIAL) precargarRuta(ruta);
    };

    const ventana = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opciones?: { timeout: number },
      ) => number;
    };

    if (typeof ventana.requestIdleCallback === 'function') {
      ventana.requestIdleCallback(precargar, { timeout: 3000 });
      return;
    }
    const id = window.setTimeout(precargar, 2000);
    return () => window.clearTimeout(id);
  }, [activa]);
}

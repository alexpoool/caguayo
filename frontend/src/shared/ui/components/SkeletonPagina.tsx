import { Skeleton } from './Skeleton';

/**
 * Fallback del área de contenido mientras se descarga el chunk de una ruta.
 * Mantiene la altura para no mover el layout y deja visibles sidebar y header.
 */
export function SkeletonPagina() {
  return (
    <div className="min-h-[60vh] w-full space-y-4" aria-hidden="true">
      <Skeleton variant="rounded" className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton variant="rounded" className="h-24 w-full" />
        <Skeleton variant="rounded" className="h-24 w-full" />
        <Skeleton variant="rounded" className="h-24 w-full" />
      </div>
      <Skeleton variant="rounded" className="h-[45vh] w-full" />
    </div>
  );
}

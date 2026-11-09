import { authHelpers } from '@/shared/infrastructure/http/api';
import type { UsuarioSesion } from '@/shared/domain/sesion';

/**
 * Compatibilidad temporal para páginas heredadas que aún no migran a
 * `@/shared/ui/auth`. La feature auth ya no usa este servicio.
 */
export const authService = {
  getUser: (): UsuarioSesion | null => authHelpers.getUser() as UsuarioSesion | null,
};

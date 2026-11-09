import type { ReactNode } from 'react';
import { AuthProvider as AuthProviderBase } from '@/shared/ui/auth';
import { casosUsoAuth } from '../container/auth';

/** Une la feature auth con la UI compartida de sesión. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProviderBase casosUso={casosUsoAuth}>{children}</AuthProviderBase>
  );
}

import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { FirebaseAuthProvider } from '@/features/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

// Compatibilidade com endereços da versão anterior.
export function AuthCallbackRoute() {
  return <Navigate to="/" replace />;
}

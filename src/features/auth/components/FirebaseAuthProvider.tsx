import { useCallback, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import type { AuthState, Session } from '../model/session';
import {
  enterWithGoogle,
  currentFirebaseSession,
  leaveFirebaseSession,
} from '../services/firebaseSession';

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'anonima' });
  const adoptSession = useCallback(
    (session: Session) => setState({ status: 'autenticada', session }),
    [],
  );
  const login = useCallback(async () => {
    setState({ status: 'autenticando' });
    try {
      const session = await enterWithGoogle();
      if (session) adoptSession(session);
      else setState({ status: 'anonima' });
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setState({ status: 'anonima' });
      } else {
        setState({
          status: 'erro',
          code: 'provedor-indisponivel',
          message:
            code === 'auth/popup-blocked'
              ? 'Permita popups para este site e tente novamente.'
              : code === 'auth/unauthorized-domain'
                ? 'Este domínio precisa ser autorizado no Firebase Authentication.'
                : 'Não foi possível entrar com Google. Tente novamente.',
        });
      }
    }
  }, [adoptSession]);
  const logout = useCallback(() => {
    void leaveFirebaseSession().then(
      () => setState({ status: 'anonima' }),
      () =>
        setState({
          status: 'erro',
          code: 'provedor-indisponivel',
          message: 'Falha ao sair da conta.',
        }),
    );
  }, []);
  return (
    <AuthContext.Provider
      value={{ state, login, logout, ensureSession: currentFirebaseSession, adoptSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

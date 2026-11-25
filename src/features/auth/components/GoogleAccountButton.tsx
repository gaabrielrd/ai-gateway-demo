import { LogIn, LogOut } from 'lucide-react';
import { Button, ErrorMessage } from '@/shared/ui';
import { useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function GoogleAccountButton() {
  const { state, login, logout } = useAuth();
  const location = useLocation();
  if (state.status === 'autenticada') {
    return (
      <Button onClick={logout}>
        <LogOut className="icon icon-sm" aria-hidden="true" /> Sair
      </Button>
    );
  }
  return (
    <>
      <Button
        disabled={state.status === 'autenticando'}
        onClick={() => void login(location.pathname + location.search)}
      >
        <LogIn className="icon icon-sm" aria-hidden="true" /> Entrar com Google
      </Button>
      {state.status === 'erro' && <ErrorMessage>{state.message}</ErrorMessage>}
    </>
  );
}

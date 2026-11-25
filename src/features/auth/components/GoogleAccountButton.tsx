import { useLocation } from 'react-router';
import { Button } from '@/shared/ui';
import { useAuth } from '../hooks/useAuth';

export function GoogleAccountButton() {
  const { state, login, logout } = useAuth();
  const location = useLocation();
  if (state.status === 'autenticada') {
    return <Button onClick={logout}>Sair</Button>;
  }
  return (
    <>
      <Button
        disabled={state.status === 'autenticando'}
        onClick={() => void login(location.pathname + location.search)}
      >
        Entrar com Google
      </Button>
      {state.status === 'erro' && <span role="alert">{state.message}</span>}
    </>
  );
}

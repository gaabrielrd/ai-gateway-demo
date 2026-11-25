import { LogIn } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuth } from '../hooks/useAuth';
import styles from './RequireAuth.module.css';

export function SignInPrompt({ children }: { children: string }) {
  const { state, login } = useAuth();
  return (
    <div className={styles.prompt}>
      <p>{children}</p>
      <Button
        variant="default"
        disabled={state.status === 'autenticando'}
        onClick={() => void login()}
      >
        <LogIn className="icon icon-sm" aria-hidden="true" />
        {state.status === 'autenticando' ? 'Abrindo login…' : 'Continuar com Google'}
      </Button>
    </div>
  );
}

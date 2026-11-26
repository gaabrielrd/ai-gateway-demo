import styles from './AccessPage.module.css';
import { Link } from 'react-router';
import { KeyRound, RefreshCw } from 'lucide-react';
import { Button, ErrorMessage, Label, Textarea, WorkPage } from '@/shared/ui';
import { useEffect, useState } from 'react';
import { SignInPrompt, useAuth } from '@/features/auth';
import { AdminQueue } from './AdminQueue';
import { accessLabels, ownAccess, type AccessStatus } from '../services/access';

function RequestForm() {
  const { ensureSession } = useAuth();
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setBusy(true);
      setError('');
      try {
        const session = await ensureSession();
        if (!session) throw new Error();
        const result = await ownAccess(session);
        if (active) setStatus(result);
      } catch {
        if (active) setError('Não foi possível consultar sua solicitação.');
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [ensureSession, revision]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error();
      setStatus(await ownAccess(session, reason));
    } catch {
      setError('Não foi possível enviar sua solicitação.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p role="status">{busy ? 'Aguarde…' : status && accessLabels[status]}</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {status === 'none' && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Label htmlFor="reason">Justificativa (opcional)</Label>
          <Textarea
            id="reason"
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button variant="default" disabled={busy} type="submit">
            <KeyRound className="icon icon-sm" aria-hidden="true" /> Solicitar acesso
          </Button>
        </form>
      )}
      {status === 'approved' && (
        <Button asChild variant="default">
          <Link to="/comparar">Comparar modelos</Link>
        </Button>
      )}
      {status === 'pending' && <p>Sua solicitação aguarda a decisão da administração.</p>}
      {(status !== 'none' || error) && (
        <Button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
          <RefreshCw className="icon icon-sm" aria-hidden="true" /> Atualizar situação
        </Button>
      )}
    </>
  );
}

export function AccessPage() {
  const { state } = useAuth();
  return (
    <WorkPage
      title="Meu acesso"
      description="Consulte sua autorização para executar comparações e demonstrações do gateway."
    >
      {state.status === 'autenticada' ? (
        <div className={styles.body} key={state.session.subject}>
          <section aria-label="Situação do acesso">
            <RequestForm />
          </section>
          <AdminQueue />
        </div>
      ) : (
        <SignInPrompt>Entre com Google para solicitar acesso e acompanhar a decisão.</SignInPrompt>
      )}
    </WorkPage>
  );
}

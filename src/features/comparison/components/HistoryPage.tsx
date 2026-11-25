import { RefreshCw, Trash2, X } from 'lucide-react';
import { Empty, Spinner, Button, ErrorMessage, PageHeader } from '@/shared/ui';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import { deleteExecution, loadHistory, type HistoryEntry } from '../services/executions';

function PrivateHistory() {
  const { ensureSession } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    async function load() {
      const session = await ensureSession();
      if (!session) throw new Error('Entre novamente para consultar o histórico.');
      const list = await loadHistory(session, ctl.signal);
      if (!ctl.signal.aborted) setEntries(list);
    }
    void load().catch((e: Error) => {
      if (!ctl.signal.aborted) setError(e.message);
    });
    return () => ctl.abort();
  }, [ensureSession, revision]);
  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre novamente para excluir a execução.');
      await deleteExecution(session, id);
      setEntries((items) => items?.filter((item) => item.executionId !== id));
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao excluir a execução.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <ErrorMessage>
          {error}{' '}
          <Button
            onClick={() => {
              setError('');
              setRevision((n) => n + 1);
            }}
          >
            <RefreshCw className="icon icon-sm" aria-hidden="true" /> Tentar novamente
          </Button>
        </ErrorMessage>
      )}
      {!entries && !error && (
        <p role="status">
          <Spinner /> Carregando histórico…
        </p>
      )}
      {entries?.length === 0 && <Empty>Seu histórico está vazio.</Empty>}
      <ul>
        {entries?.map((entry) => (
          <li key={entry.executionId}>
            <Link to={'/execucoes/' + entry.executionId}>{entry.prompt}</Link>
            <p>
              Criada em {new Date(entry.createdAt).toLocaleDateString('pt-BR')} · Expira em{' '}
              {new Date(entry.expiresAt).toLocaleDateString('pt-BR')}
            </p>
            {confirm === entry.executionId ? (
              <>
                <p>Excluir esta execução e seus pareceres? O gasto continua na cota mensal.</p>
                <Button disabled={busy} onClick={() => void remove(entry.executionId)}>
                  <Trash2 className="icon icon-sm" aria-hidden="true" /> Confirmar exclusão
                </Button>
                <Button disabled={busy} onClick={() => setConfirm('')}>
                  <X className="icon icon-sm" aria-hidden="true" /> Cancelar
                </Button>
              </>
            ) : (
              <Button disabled={busy} onClick={() => setConfirm(entry.executionId)}>
                <Trash2 className="icon icon-sm" aria-hidden="true" /> Excluir
              </Button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function HistoryPage() {
  const { state } = useAuth();
  return (
    <section>
      <PageHeader title="Meu histórico" />
      {state.status === 'autenticada' ? (
        <PrivateHistory key={state.session.subject} />
      ) : (
        <p>Entre com Google para consultar seu histórico privado.</p>
      )}
    </section>
  );
}

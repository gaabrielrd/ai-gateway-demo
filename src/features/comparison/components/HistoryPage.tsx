import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button, PageHeader } from '@/shared/ui';
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
        <p role="alert">
          {error}{' '}
          <Button
            onClick={() => {
              setError('');
              setRevision((n) => n + 1);
            }}
          >
            Tentar novamente
          </Button>
        </p>
      )}
      {!entries && !error && <p role="status">Carregando histórico…</p>}
      {entries?.length === 0 && <p>Seu histórico está vazio.</p>}
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
                  Confirmar exclusão
                </Button>
                <Button disabled={busy} onClick={() => setConfirm('')}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button disabled={busy} onClick={() => setConfirm(entry.executionId)}>
                Excluir
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

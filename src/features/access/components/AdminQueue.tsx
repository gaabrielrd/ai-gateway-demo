import styles from './AccessPage.module.css';
import { Check, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { Empty, Button } from '@/shared/ui';
import { listPending, decideAccess, type Decision } from '../services/admin';

export function AdminQueue() {
  const { ensureSession } = useAuth();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPending>>>();
  const [revision, refresh] = useState(0);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      setBusy(true);
      try {
        const session = await ensureSession();
        const result = session ? await listPending(session) : null;
        if (active) setRows(result);
      } catch {
        if (active) setMessage('Falha ao consultar a fila de solicitações.');
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [ensureSession, revision]);
  async function decide(id: string, decision: Decision) {
    setBusy(true);
    setMessage('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre novamente.');
      await decideAccess(session, id, decision);
      setMessage(decision === 'approved' ? 'Acesso aprovado.' : 'Acesso rejeitado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao decidir.');
    } finally {
      refresh((n) => n + 1);
    }
  }
  if (rows === null || (rows === undefined && !message)) return null;
  return (
    <section>
      <h2>Administração de acessos</h2>
      <div className={styles.links}>
        {rows && <Link to="/admin/galeria">Gerenciar benchmarks</Link>}
        {rows && <Link to="/admin/juizes">Configurar juízes por tarefa</Link>}
      </div>
      <p role="status">{busy ? 'Consultando solicitações…' : message}</p>
      {rows?.length === 0 && <Empty>Nenhuma solicitação pendente.</Empty>}
      <ul className={styles.queue}>
        {rows?.map((row) => (
          <li key={row.id}>
            <strong>{row.email || row.id}</strong>
            {row.reason && <p>{row.reason}</p>}
            <Button
              disabled={busy}
              aria-label={'Aprovar ' + row.email}
              onClick={() => void decide(row.id, 'approved')}
            >
              <Check className="icon icon-sm" aria-hidden="true" /> Aprovar
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              aria-label={'Rejeitar ' + row.email}
              onClick={() => void decide(row.id, 'rejected')}
            >
              <X className="icon icon-sm" aria-hidden="true" /> Rejeitar
            </Button>
          </li>
        ))}
      </ul>
      <Button
        disabled={busy}
        onClick={() => {
          setMessage('');
          refresh((n) => n + 1);
        }}
      >
        <RefreshCw className="icon icon-sm" aria-hidden="true" /> Atualizar fila
      </Button>
    </section>
  );
}

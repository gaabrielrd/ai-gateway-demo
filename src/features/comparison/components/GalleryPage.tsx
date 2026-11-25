import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button, PageHeader } from '@/shared/ui';
import { listBenchmarks, publishBenchmark, withdrawBenchmark } from '../services/gallery';

export function PublishBenchmark({ id, revision }: { id: string; revision: number }) {
  const { ensureSession } = useAuth();
  const [title, setTitle] = useState(''),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [published, setPublished] = useState('');
  async function publish() {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google para publicar.');
      setPublished(await publishBenchmark(session, id, revision, title));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao publicar.');
    } finally {
      setBusy(false);
    }
  }
  if (published) return <Link to={'/galeria/' + published}>Ver benchmark publicado</Link>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void publish();
      }}
    >
      <h2>Publicar benchmark</h2>
      <label>
        Título do benchmark{' '}
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />{' '}
        Revisei as entradas, saídas e pareceres e confirmo que o material é próprio e pode ser
        publicado.
      </label>
      <Button type="submit" disabled={busy || !title.trim() || !checked}>
        Publicar na galeria
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function GalleryPage({ manage = false }: { manage?: boolean }) {
  const { ensureSession } = useAuth();
  const [items, setItems] = useState<{ id: string; title: string }[]>(),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    async function load() {
      if (!manage) return listBenchmarks(ctl.signal);
      const session = await ensureSession();
      if (!session) throw new Error('Entre com a conta administradora.');
      return listBenchmarks(ctl.signal, session);
    }
    void load()
      .then((list) => {
        if (!ctl.signal.aborted) setItems(list);
      })
      .catch((e: Error) => {
        if (!ctl.signal.aborted) setError(e.message || 'Falha ao carregar a galeria.');
      });
    return () => ctl.abort();
  }, [revision, ensureSession, manage]);
  async function withdraw(id: string) {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com a conta administradora.');
      await withdrawBenchmark(session, id);
      setItems((list) => list?.filter((item) => item.id !== id));
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao retirar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <PageHeader title={manage ? 'Gerenciar benchmarks' : 'Galeria de benchmarks'} />
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
      {!items && !error && <p role="status">Carregando benchmarks…</p>}
      {items?.length === 0 && <p>A galeria ainda está vazia.</p>}
      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <Link to={'/galeria/' + item.id}>{item.title}</Link>
            {manage &&
              (confirm === item.id ? (
                <>
                  <p>Retirar este benchmark e suas imagens da galeria pública?</p>
                  <Button disabled={busy} onClick={() => void withdraw(item.id)}>
                    Confirmar retirada
                  </Button>
                  <Button disabled={busy} onClick={() => setConfirm('')}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button disabled={busy} onClick={() => setConfirm(item.id)}>
                  Retirar
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

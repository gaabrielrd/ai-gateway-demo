import { Archive, RefreshCw, Upload, X } from 'lucide-react';
import {
  Empty,
  Spinner,
  Button,
  Checkbox,
  ErrorMessage,
  Input,
  Label,
  PageHeader,
} from '@/shared/ui';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '@/features/auth';
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
      <Label>
        Título do benchmark{' '}
        <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Label>
      <Label>
        <Checkbox
          required
          checked={checked}
          onCheckedChange={(checked) => setChecked(checked === true)}
        />{' '}
        Revisei as entradas, saídas e pareceres e confirmo que o material é próprio e pode ser
        publicado.
      </Label>
      <Button type="submit" disabled={busy || !title.trim() || !checked}>
        <Upload className="icon icon-sm" aria-hidden="true" /> Publicar na galeria
      </Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </form>
  );
}

export function GalleryPage({
  manage = false,
  featured = false,
}: {
  manage?: boolean;
  featured?: boolean;
}) {
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
  if (featured && items?.length) {
    const first = items.find((item) => item.title === 'Fatura fictícia com desconto') ?? items[0]!;
    return <Navigate replace to={'/galeria/' + first.id} />;
  }
  return (
    <section>
      <PageHeader title={manage ? 'Gerenciar benchmarks' : 'Galeria de benchmarks'} />
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
      {!items && !error && (
        <p role="status">
          <Spinner /> Carregando benchmarks…
        </p>
      )}
      {items?.length === 0 && <Empty>A galeria ainda está vazia.</Empty>}
      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <Link to={'/galeria/' + item.id}>{item.title}</Link>
            {manage &&
              (confirm === item.id ? (
                <>
                  <p>Retirar este benchmark e suas imagens da galeria pública?</p>
                  <Button disabled={busy} onClick={() => void withdraw(item.id)}>
                    <Archive className="icon icon-sm" aria-hidden="true" /> Confirmar retirada
                  </Button>
                  <Button disabled={busy} onClick={() => setConfirm('')}>
                    <X className="icon icon-sm" aria-hidden="true" /> Cancelar
                  </Button>
                </>
              ) : (
                <Button disabled={busy} onClick={() => setConfirm(item.id)}>
                  <Archive className="icon icon-sm" aria-hidden="true" /> Retirar
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

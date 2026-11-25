import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button, PageHeader } from '@/shared/ui';
import { readExecution, readImage, type Attempt, type Execution } from '../services/executions';
import { RetryAttempt } from './RetryAttempt';
import { GenerationOutput } from './GenerationOutput';
import styles from './Comparison.module.css';

const labels = {
  queued: 'Na fila',
  running: 'Em andamento',
  completed: 'Concluída',
  failed: 'Falhou',
};
const usd = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});
function PrivateImage({ id, attempt }: { id: string; attempt: Attempt }) {
  const { ensureSession } = useAuth();
  const [url, setUrl] = useState(''),
    [failed, setFailed] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    let objectUrl = '';
    async function load() {
      const session = await ensureSession();
      if (!session) throw new Error();
      const blob = await readImage(session, id, attempt.index, ctl.signal);
      if (!ctl.signal.aborted) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }
    void load().catch(() => {
      if (!ctl.signal.aborted) setFailed(true);
    });
    return () => {
      ctl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ensureSession, id, attempt.index, revision]);
  if (failed)
    return (
      <Button
        onClick={() => {
          setFailed(false);
          setRevision((n) => n + 1);
        }}
      >
        Tentar carregar a imagem novamente
      </Button>
    );
  return url ? (
    <GenerationOutput
      model={attempt.effectiveModel ?? attempt.modelId}
      content={{ type: 'image', url }}
    />
  ) : (
    <p>Carregando imagem…</p>
  );
}

function Results({ id }: { id: string }) {
  const { ensureSession } = useAuth();
  const [record, setRecord] = useState<Execution>(),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google para consultar a execução.');
      const result = await readExecution(session, id, ctl.signal);
      if (ctl.signal.aborted) return;
      setRecord(result);
      if (result.attempts.some((a) => a.status === 'queued' || a.status === 'running'))
        timer = setTimeout(poll, 1500);
    }
    function poll() {
      void load().catch((e) => {
        if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : 'Falha na consulta.');
      });
    }
    poll();
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [ensureSession, id, revision]);
  return (
    <>
      {error && (
        <div role="alert">
          {error}{' '}
          <Button
            onClick={() => {
              setError('');
              setRevision((n) => n + 1);
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {!record && !error && <p role="status">Carregando execução…</p>}
      {record && (
        <>
          <details>
            <summary>Prompt enviado</summary>
            <p>{record.prompt}</p>
          </details>
          <section className={styles.grid} aria-label="Resultados por modelo">
            {record.attempts
              .filter((a) => a.retryIndex === undefined)
              .map((a) => {
                const metrics = [
                  ['Provedor', a.provider],
                  ['Versão efetiva', a.effectiveModel],
                  ['Tempo de resposta', a.durationMs == null ? null : a.durationMs + ' ms'],
                  ['Tokens de entrada', a.inputTokens],
                  ['Tokens de saída', a.outputTokens],
                  [
                    'Custo estimado',
                    a.costMicroUsd == null ? null : usd.format(a.costMicroUsd / 1e6),
                  ],
                  [
                    'Unidade de cobrança',
                    a.unit === 'tokens'
                      ? 'tokens'
                      : a.unit === 'tiles-and-steps'
                        ? 'blocos de imagem e passos'
                        : null,
                  ],
                  ['Cache', a.cacheStatus],
                ];
                return (
                  <article className={styles.card} key={a.index}>
                    <h2>{a.modelId}</h2>
                    {a.retryOf !== undefined && <p>Repetição da tentativa {a.retryOf + 1}</p>}
                    <p role="status">{labels[a.status]}</p>
                    {a.error && <p>{a.error}</p>}
                    {a.status === 'failed' && (
                      <RetryAttempt
                        id={id}
                        index={a.index}
                        refresh={() => setRevision((n) => n + 1)}
                      />
                    )}
                    {a.output?.type === 'text' && (
                      <GenerationOutput model={a.modelId} content={a.output} />
                    )}
                    {a.output?.type === 'image' && <PrivateImage id={id} attempt={a} />}
                    {['completed', 'failed'].includes(a.status) && (
                      <dl className={styles.metrics}>
                        {metrics.map(([label, value]) => (
                          <Fragment key={label}>
                            <dt>{label}</dt>
                            <dd>{value ?? 'Não informado'}</dd>
                          </Fragment>
                        ))}
                      </dl>
                    )}
                  </article>
                );
              })}
          </section>
          <section>
            <h2>Pareceres dos juízes</h2>
            <p>Aguardando avaliação.</p>
          </section>
        </>
      )}
    </>
  );
}
export function ExecutionPage() {
  const { id = '' } = useParams();
  const { state } = useAuth();
  return (
    <section className={styles.page}>
      <PageHeader title="Resultados da comparação" />
      {state.status === 'autenticada' ? (
        <Results key={state.session.subject + ':' + id} id={id} />
      ) : (
        <p>Entre com Google para ver esta execução privada.</p>
      )}
      <Link to="/">Nova comparação</Link>
    </section>
  );
}

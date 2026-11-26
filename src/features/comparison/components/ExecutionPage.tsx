import { RefreshCw } from 'lucide-react';
import { Card, Badge, Spinner, Button, Disclosure, ErrorMessage, PageHeader } from '@/shared/ui';
import { BenchmarkConsole } from './BenchmarkConsole';
import { PublishBenchmark } from './GalleryPage';
import { readBenchmark } from '../services/gallery';
import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { SignInPrompt, useAuth } from '@/features/auth';
import { readExecution, readImage, type Attempt, type Execution } from '../services/executions';
import { EvaluationResults } from './EvaluationResults';
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
        <RefreshCw className="icon icon-sm" aria-hidden="true" /> Tentar carregar a imagem novamente
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

function Results({ id, published = false }: { id: string; published?: boolean }) {
  const { ensureSession } = useAuth();
  const [record, setRecord] = useState<Execution>(),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      let result;
      if (published) result = await readBenchmark(id, ctl.signal);
      else {
        const session = await ensureSession();
        if (!session) throw new Error('Entre com Google para consultar a execução.');
        result = await readExecution(session, id, ctl.signal);
      }
      if (ctl.signal.aborted) return;
      setRecord(result);
      if (
        result.evaluation?.status === 'pending' ||
        result.attempts.some((a) => a.status === 'queued' || a.status === 'running')
      )
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
  }, [ensureSession, id, published, revision]);
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
      {!record && !error && (
        <p role="status">
          <Spinner /> Carregando execução…
        </p>
      )}
      {record && published && <BenchmarkConsole record={record} />}
      {record && !published && (
        <>
          {record.title && <h2>{record.title}</h2>}
          <Disclosure title="Prompt enviado">
            <p>{record.prompt}</p>
            {record.reference && <p>Referência: {record.reference}</p>}
            {record.criterion && <p>Critério adicional: {record.criterion}</p>}
          </Disclosure>
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
                  <Card asChild key={a.index}>
                    <article className={styles.card}>
                      <h2>{a.modelId}</h2>
                      {a.retryOf !== undefined && <p>Repetição da tentativa {a.retryOf + 1}</p>}
                      <Badge role="status" variant="outline">
                        {labels[a.status]}
                      </Badge>
                      {a.error && <p>{a.error}</p>}
                      {!published && a.status === 'failed' && (
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
                  </Card>
                );
              })}
          </section>
          <EvaluationResults record={record} />
          {!published &&
            record.canPublish &&
            record.evaluation?.status === 'finished' &&
            typeof record.evaluation.revision === 'number' && (
              <PublishBenchmark
                key={record.evaluation.revision}
                id={id}
                revision={record.evaluation.revision}
              />
            )}
        </>
      )}
    </>
  );
}
export function ExecutionPage({ published = false }: { published?: boolean }) {
  const { id = '' } = useParams();
  const { state } = useAuth();
  return (
    <section className={published ? undefined : styles.page}>
      {!published && <PageHeader title="Resultados da comparação" />}
      {published ? (
        <Results key={id} id={id} published />
      ) : state.status === 'autenticada' ? (
        <Results key={state.session.subject + ':' + id} id={id} />
      ) : (
        <SignInPrompt>Entre com Google para ver esta execução privada.</SignInPrompt>
      )}
      {!published && <Link to="/comparar">Nova comparação</Link>}
    </section>
  );
}

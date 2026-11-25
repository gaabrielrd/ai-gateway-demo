import { Calculator, Play, RefreshCw } from 'lucide-react';
import { Spinner, Button, ErrorMessage, PageHeader } from '@/shared/ui';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import {
  quoteDemo,
  startDemo,
  readDemo,
  type DemoKind,
  type DemoQuote,
  type DemoResult,
} from '../services/demos';

const dollars = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});
const usd = (amount: number) => dollars.format(amount / 1e6);
function Demo({ kind }: { kind: DemoKind }) {
  const fallback = kind === 'fallback';
  const { ensureSession } = useAuth();
  const [quote, setQuote] = useState<DemoQuote>(),
    [result, setResult] = useState<DemoResult>(),
    [active, setActive] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  const key = useRef('');
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google.');
      setQuote(await quoteDemo(session, kind));
      setResult(undefined);
      setActive('');
      key.current = crypto.randomUUID();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na consulta.');
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!quote) return;
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google.');
      const { runId } = await startDemo(session, kind, key.current, quote.ceilingMicroUsd);
      setActive(runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao iniciar.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!active) return;
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const session = await ensureSession();
        if (!session) throw new Error('Entre com Google.');
        const next = await readDemo(session, kind, active, ctl.signal);
        if (!ctl.signal.aborted) {
          setResult(next);
          if (!next.finished) timer = setTimeout(() => void poll(), 1200);
        }
      } catch (e) {
        if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : 'Falha na consulta.');
      }
    }
    void poll();
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [active, ensureSession, refresh, kind]);
  return (
    <>
      {error && (
        <ErrorMessage>
          {error}{' '}
          {active && (
            <Button
              onClick={() => {
                setError('');
                setRefresh((n) => n + 1);
              }}
            >
              <RefreshCw className="icon icon-sm" aria-hidden="true" /> Consultar resultado
              novamente
            </Button>
          )}
        </ErrorMessage>
      )}
      {(!quote ||
        result?.finished ||
        (!active && quote.availableMicroUsd < quote.ceilingMicroUsd)) && (
        <Button disabled={busy} onClick={() => void prepare()}>
          <Calculator className="icon icon-sm" aria-hidden="true" /> Consultar previsão
        </Button>
      )}
      {quote && (
        <section>
          <h2>{fallback ? 'Rota de fallback' : 'Chamada repetida'}</h2>
          <p>{quote.prompt}</p>
          <p>{quote.modelId}</p>
          <p>
            Saldo na consulta: {usd(quote.availableMicroUsd)} · Teto da demonstração:{' '}
            {usd(quote.ceilingMicroUsd)}
          </p>
          {!active &&
            (quote.availableMicroUsd < quote.ceilingMicroUsd ? (
              <p>Saldo insuficiente.</p>
            ) : (
              <Button disabled={busy} onClick={() => void start()}>
                <Play className="icon icon-sm" aria-hidden="true" />{' '}
                {fallback ? 'Confirmar e executar fallback' : 'Confirmar e executar duas chamadas'}
              </Button>
            ))}
        </section>
      )}
      {active && !result?.finished && !error && (
        <p role="status">
          <Spinner /> Executando a demonstração…
        </p>
      )}
      {fallback && result?.finished && (
        <>
          {result.error && <ErrorMessage>{result.error}</ErrorMessage>}
          <p>Modelo final: {result.finalModel ?? 'Não informado'}</p>
          <p>
            Tempo total da rota:{' '}
            {result.durationMs == null ? 'Não informado' : result.durationMs + ' ms'}
          </p>
        </>
      )}
      {result && (
        <ol>
          {Object.entries(result.rows).map(([index, row]) => (
            <li key={index}>
              <h3>
                {fallback ? 'Destino' : 'Chamada'} {Number(index) + 1}
              </h3>
              {row.modelId && <p>{row.modelId}</p>}
              {row.status === 'running' ? (
                <p>Em andamento</p>
              ) : (
                <>
                  {fallback ? (
                    <p>{row.error ?? 'Resposta recebida'}</p>
                  ) : (
                    <>
                      <p>
                        {row.status === 'failed'
                          ? 'Falha na chamada'
                          : row.cacheStatus === 'HIT'
                            ? 'Origem: cache'
                            : row.cacheStatus === 'MISS'
                              ? 'Origem: provedor'
                              : 'Origem não informada'}
                      </p>
                      <p>Indicador do gateway: {row.cacheStatus ?? 'Não informado'}</p>
                    </>
                  )}
                  <p>
                    Tempo de resposta:{' '}
                    {row.durationMs == null ? 'Não informado' : row.durationMs + ' ms'}
                  </p>
                  <p>
                    Tokens de entrada: {row.inputTokens ?? 'Não informado'} · Tokens de saída:{' '}
                    {row.outputTokens ?? 'Não informado'}
                  </p>
                  <p>
                    Custo estimado:{' '}
                    {row.costMicroUsd == null ? 'Não informado' : usd(row.costMicroUsd)}
                  </p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
export function DemoPage({ kind = 'cache' }: { kind?: DemoKind }) {
  const fallback = kind === 'fallback';
  const { state } = useAuth();
  return (
    <section>
      <PageHeader title={fallback ? 'Demonstração de fallback' : 'Demonstração de cache'} />
      <p>
        {fallback
          ? 'A rota tenta um destino indisponível e encaminha o pedido ao Llama 3.3 pelo gateway.'
          : 'Compare a origem e o tempo de duas chamadas idênticas ao mesmo modelo.'}
      </p>
      {state.status === 'autenticada' ? (
        <Demo key={kind + state.session.subject} kind={kind} />
      ) : (
        <p>
          Entre com Google para executar. <Link to="/acesso">Meu acesso</Link>
        </p>
      )}
    </section>
  );
}

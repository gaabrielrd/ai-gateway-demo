import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button, PageHeader } from '@/shared/ui';
import {
  quoteCache,
  startCache,
  readCache,
  type CacheQuote,
  type CacheResult,
} from '../services/cache';

const dollars = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});
const usd = (amount: number) => dollars.format(amount / 1e6);
function CacheDemo() {
  const { ensureSession } = useAuth();
  const [quote, setQuote] = useState<CacheQuote>(),
    [result, setResult] = useState<CacheResult>(),
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
      setQuote(await quoteCache(session));
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
      const { runId } = await startCache(session, key.current, quote.ceilingMicroUsd);
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
        const next = await readCache(session, active, ctl.signal);
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
  }, [active, ensureSession, refresh]);
  return (
    <>
      {error && (
        <p role="alert">
          {error}{' '}
          {active && (
            <Button
              onClick={() => {
                setError('');
                setRefresh((n) => n + 1);
              }}
            >
              Consultar resultado novamente
            </Button>
          )}
        </p>
      )}
      {(!quote ||
        result?.finished ||
        (!active && quote.availableMicroUsd < quote.ceilingMicroUsd)) && (
        <Button disabled={busy} onClick={() => void prepare()}>
          Consultar previsão
        </Button>
      )}
      {quote && (
        <section>
          <h2>Chamada repetida</h2>
          <p>{quote.prompt}</p>
          <p>{quote.modelId}</p>
          <p>
            Saldo na consulta: {usd(quote.availableMicroUsd)} · Teto para duas chamadas:{' '}
            {usd(quote.ceilingMicroUsd)}
          </p>
          {!active &&
            (quote.availableMicroUsd < quote.ceilingMicroUsd ? (
              <p>Saldo insuficiente.</p>
            ) : (
              <Button disabled={busy} onClick={() => void start()}>
                Confirmar e executar duas chamadas
              </Button>
            ))}
        </section>
      )}
      {active && !result?.finished && !error && <p role="status">Executando a demonstração…</p>}
      {result && (
        <ol>
          {Object.entries(result.rows).map(([index, row]) => (
            <li key={index}>
              <h3>Chamada {Number(index) + 1}</h3>
              {row.status === 'running' ? (
                <p>Em andamento</p>
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
export function CachePage() {
  const { state } = useAuth();
  return (
    <section>
      <PageHeader title="Demonstração de cache" />
      <p>Compare a origem e o tempo de duas chamadas idênticas ao mesmo modelo.</p>
      {state.status === 'autenticada' ? (
        <CacheDemo key={state.session.subject} />
      ) : (
        <p>
          Entre com Google para executar. <Link to="/acesso">Meu acesso</Link>
        </p>
      )}
    </section>
  );
}

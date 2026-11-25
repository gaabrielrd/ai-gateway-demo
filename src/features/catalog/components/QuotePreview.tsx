import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { ExecutionForm } from '@/features/comparison';
import { Button } from '@/shared/ui';
import { getQuote } from '../services/quote';

const format = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});

function QuoteForm({ task, modelIds }: { task: string; modelIds: string[] }) {
  const { ensureSession } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getQuote>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setBusy(true);
    setError('');
    setQuote(undefined);
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google para consultar seu saldo.');
      setQuote(await getQuote(session, task, modelIds));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar o orçamento.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <Button onClick={() => void load()} disabled={busy}>
        Consultar orçamento
      </Button>
      {busy && <p role="status">Consultando saldo e teto…</p>}
      {error && <p role="alert">{error}</p>}
      {quote && (
        <div aria-live="polite">
          <p>Saldo disponível no mês: {format.format(quote.availableMicroUsd / 1e6)}</p>
          {quote.ceilingMicroUsd !== null && (
            <p>Custo máximo com julgamento: {format.format(quote.ceilingMicroUsd / 1e6)}</p>
          )}
          {quote.reason && <p>{quote.reason}</p>}
          {!quote.reason && quote.ceilingMicroUsd !== null && (
            <ExecutionForm
              task={task}
              modelIds={modelIds}
              confirmedMicroUsd={quote.ceilingMicroUsd}
            />
          )}
        </div>
      )}
    </section>
  );
}

export function QuotePreview(props: { task: string; modelIds: string[] }) {
  const { state } = useAuth();
  return state.status === 'autenticada' ? (
    <QuoteForm key={state.session.subject} {...props} />
  ) : (
    <p>Entre com Google para consultar seu saldo e o custo máximo.</p>
  );
}

import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui';
import { confirmRetry, quoteRetry } from '../services/executions';

const usd = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});
export function RetryAttempt({
  id,
  index,
  refresh,
}: {
  id: string;
  index: number;
  refresh: () => void;
}) {
  const { ensureSession } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof quoteRetry>>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(confirm: boolean) {
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google para repetir.');
      if (confirm && quote) {
        await confirmRetry(session, id, index, quote.ceilingMicroUsd);
        setSent(true);
        refresh();
      } else setQuote(await quoteRetry(session, id, index));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao solicitar repetição.');
    } finally {
      setBusy(false);
    }
  }
  if (sent) return <p role="status">Repetição solicitada.</p>;
  return (
    <div>
      <Button disabled={busy} onClick={() => void submit(false)}>
        Consultar custo de repetição
      </Button>
      {error && <p role="alert">{error}</p>}
      {quote && (
        <>
          <p>Saldo disponível: {usd.format(quote.availableMicroUsd / 1e6)}</p>
          <p>Novo teto com reavaliação: {usd.format(quote.ceilingMicroUsd / 1e6)}</p>
          {quote.reason ? (
            <p>{quote.reason}</p>
          ) : (
            <Button disabled={busy} onClick={() => void submit(true)}>
              Confirmar repetição
            </Button>
          )}
        </>
      )}
    </div>
  );
}

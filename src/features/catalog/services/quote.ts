import { authorizationHeader, type Session } from '@/features/auth';

interface Quote {
  judges?: string[];
  criteria?: { id: string; label: string }[];
  availableMicroUsd: number;
  ceilingMicroUsd: number | null;
  reason: string | null;
}

export async function getQuote(session: Session, task: string, modelIds: string[]): Promise<Quote> {
  const response = await fetch('/api/budget/quote', {
    method: 'POST',
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, modelIds }),
  });
  if (response.status === 403) throw new Error('Solicite acesso para consultar seu orçamento.');
  if (!response.ok) throw new Error('Falha ao consultar o orçamento.');
  const data = (await response.json()) as Quote;
  if (
    !data ||
    !Number.isSafeInteger(data.availableMicroUsd) ||
    !(data.ceilingMicroUsd === null || Number.isSafeInteger(data.ceilingMicroUsd)) ||
    !(data.reason === null || typeof data.reason === 'string')
  )
    throw new Error('Orçamento inválido.');
  return data;
}

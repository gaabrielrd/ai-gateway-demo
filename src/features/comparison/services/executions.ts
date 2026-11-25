import { authorizationHeader, type Session } from '@/features/auth';

export interface NewExecution {
  task: string;
  modelIds: string[];
  executionId: string;
  confirmedMicroUsd: number;
  prompt: string;
  reference: string;
  criterion: string;
}

export interface Attempt {
  retryIndex?: number;
  retryOf?: number;
  index: number;
  modelId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  effectiveModel?: string | null;
  provider?: string;
  durationMs?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costMicroUsd?: number | null;
  cacheStatus?: string | null;
  unit?: string;
  error?: string;
  output?: { type: 'text'; text: string } | { type: 'image'; contentType: string };
}
interface Round {
  revision?: number;
  status: string;
  checks?: { index: number; fields: { field: string; correct: boolean }[] | null }[];
  reviews: {
    modelId: string;
    status: string;
    costMicroUsd?: number | null;
    durationMs?: number;
    error?: string;
    verdict?: { index: number; marks: { id: string; score: number | null; reason: string }[] }[];
  }[];
  ranking?: {
    rows: {
      index: number;
      modelId: string;
      position: number | null;
      score: number | null;
      marks: {
        id: string;
        label: string;
        scores: (number | null)[];
        median: number | null;
        divergent: boolean;
      }[];
    }[];
    reasons: string[];
    elapsedMs: number | null;
    totalCostMicroUsd: number | null;
  };
}
export interface Execution {
  task?: string;
  reference?: string;
  criterion?: string;
  title?: string;
  canPublish?: boolean;
  criteria?: { id: string; label: string }[];
  judges?: string[];
  evaluation?: Round | null;
  executionId: string;
  prompt: string;
  attempts: Attempt[];
}

export async function startExecution(session: Session, payload: NewExecution) {
  const r = await fetch('/api/executions', {
    method: 'POST',
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const detail = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error || 'Não foi possível iniciar a execução.');
  }
  const data = (await r.json()) as { executionId?: string };
  if (data.executionId !== payload.executionId)
    throw new Error('Identificador de execução inválido.');
}

export async function readExecution(session: Session, id: string, signal: AbortSignal) {
  const r = await fetch('/api/executions/' + encodeURIComponent(id), {
    headers: authorizationHeader(session),
    signal,
  });
  if (!r.ok)
    throw new Error(
      r.status === 404
        ? 'Execução indisponível para esta conta.'
        : 'Falha ao consultar os resultados.',
    );
  const data = (await r.json()) as Execution;
  if (data.executionId !== id || !Array.isArray(data.attempts))
    throw new Error('Resposta de execução inválida.');
  return data;
}

export async function readImage(session: Session, id: string, index: number, signal: AbortSignal) {
  const r = await fetch('/api/executions/' + encodeURIComponent(id) + '/media/' + index, {
    headers: authorizationHeader(session),
    signal,
  });
  if (!r.ok) throw new Error('Falha ao carregar a imagem.');
  return r.blob();
}

interface RetryQuote {
  availableMicroUsd: number;
  ceilingMicroUsd: number;
  reason: string | null;
}

async function postRetry(session: Session, id: string, index: number, ceiling?: number) {
  const action = ceiling === undefined ? 'quote' : 'retry';
  const response = await fetch(
    `/api/executions/${encodeURIComponent(id)}/attempts/${index}/${action}`,
    {
      method: 'POST',
      headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
      body: JSON.stringify(ceiling === undefined ? {} : { confirmedMicroUsd: ceiling }),
    },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Falha ao consultar a repetição.');
  }
  return response;
}

export async function quoteRetry(session: Session, id: string, index: number) {
  const data = (await (await postRetry(session, id, index)).json()) as RetryQuote;
  if (!Number.isSafeInteger(data.ceilingMicroUsd) || !Number.isSafeInteger(data.availableMicroUsd))
    throw new Error('Previsão indisponível.');
  return data;
}

export async function confirmRetry(session: Session, id: string, index: number, ceiling: number) {
  await postRetry(session, id, index, ceiling);
}

export interface HistoryEntry {
  executionId: string;
  prompt: string;
  createdAt: string;
  expiresAt: string;
}

export async function loadHistory(session: Session, signal: AbortSignal): Promise<HistoryEntry[]> {
  const response = await fetch('/api/executions', {
    headers: authorizationHeader(session),
    signal,
  });
  if (!response.ok) throw new Error('Falha ao carregar o histórico.');
  return response.json() as Promise<HistoryEntry[]>;
}

export async function deleteExecution(session: Session, id: string) {
  const response = await fetch('/api/executions/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: authorizationHeader(session),
  });
  if (!response.ok && response.status !== 404) throw new Error('Falha ao excluir a execução.');
}

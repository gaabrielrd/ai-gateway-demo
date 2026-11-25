import { authorizationHeader, type Session } from '@/features/auth';

export interface CacheQuote {
  prompt: string;
  modelId: string;
  ceilingMicroUsd: number;
  availableMicroUsd: number;
}
interface CacheRow {
  status: string;
  cacheStatus?: string | null;
  durationMs?: number | null;
  costMicroUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
}
export interface CacheResult {
  rows: Record<string, CacheRow>;
  finished: boolean;
}
async function cacheRequest<T>(
  session: Session,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch('/api/demos/cache' + path, {
    ...options,
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Demonstração indisponível.');
  }
  return response.json() as Promise<T>;
}
export const quoteCache = (session: Session) => cacheRequest<CacheQuote>(session, '');
export const startCache = (session: Session, runId: string, confirmedMicroUsd: number) =>
  cacheRequest<{ runId: string }>(session, '', {
    method: 'POST',
    body: JSON.stringify({ runId, confirmedMicroUsd }),
  });
export const readCache = (session: Session, id: string, signal: AbortSignal) =>
  cacheRequest<CacheResult>(session, '/' + encodeURIComponent(id), { signal });

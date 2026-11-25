import { authorizationHeader, type Session } from '@/features/auth';

export type DemoKind = 'cache' | 'fallback';
export interface DemoQuote {
  prompt: string;
  modelId: string;
  ceilingMicroUsd: number;
  availableMicroUsd: number;
}
interface DemoRow {
  modelId?: string;
  error?: string;
  status: string;
  cacheStatus?: string | null;
  durationMs?: number | null;
  costMicroUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
}
export interface DemoResult {
  rows: Record<string, DemoRow>;
  finished: boolean;
  durationMs?: number;
  error?: string;
  finalModel?: string | null;
}
async function demoRequest<T>(
  session: Session,
  kind: DemoKind,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch('/api/demos/' + kind + path, {
    ...options,
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Demonstração indisponível.');
  }
  return response.json() as Promise<T>;
}
export const quoteDemo = (session: Session, kind: DemoKind) =>
  demoRequest<DemoQuote>(session, kind, '');
export const startDemo = (
  session: Session,
  kind: DemoKind,
  runId: string,
  confirmedMicroUsd: number,
) =>
  demoRequest<{ runId: string }>(session, kind, '', {
    method: 'POST',
    body: JSON.stringify({ runId, confirmedMicroUsd }),
  });
export const readDemo = (session: Session, kind: DemoKind, id: string, signal: AbortSignal) =>
  demoRequest<DemoResult>(session, kind, '/' + encodeURIComponent(id), { signal });

import { authorizationHeader, type Session } from '@/features/auth';
import type { Execution } from './executions';

async function checked(response: Response) {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Galeria indisponível.');
  }
  return response;
}
export async function listBenchmarks(
  signal: AbortSignal,
  session?: Session,
): Promise<{ id: string; title: string }[]> {
  return (
    await checked(
      await fetch(session ? '/api/admin/gallery' : '/api/gallery', {
        signal,
        headers: session ? authorizationHeader(session) : undefined,
      }),
    )
  ).json() as Promise<{ id: string; title: string }[]>;
}
export async function readBenchmark(id: string, signal: AbortSignal): Promise<Execution> {
  return (
    await checked(await fetch('/api/gallery/' + encodeURIComponent(id), { signal }))
  ).json() as Promise<Execution>;
}
export async function publishBenchmark(
  session: Session,
  executionId: string,
  revision: number,
  title: string,
) {
  const response = await checked(
    await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionId, revision, title, ownMaterial: true }),
    }),
  );
  return ((await response.json()) as { id: string }).id;
}
export async function withdrawBenchmark(session: Session, id: string) {
  await checked(
    await fetch('/api/admin/gallery/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: authorizationHeader(session),
    }),
  );
}

import { authorizationHeader, type Session } from '@/features/auth';

interface PendingRequest {
  id: string;
  email: string;
  reason: string;
}
export type Decision = 'approved' | 'rejected';
export async function listPending(session: Session): Promise<PendingRequest[] | null> {
  const r = await fetch('/api/admin/access', { headers: authorizationHeader(session) });
  if (r.status === 403) return null;
  if (!r.ok) throw new Error('Falha na consulta');
  const data: unknown = await r.json();
  if (!data || typeof data !== 'object' || !('requests' in data) || !Array.isArray(data.requests))
    throw new Error('Lista inválida');
  return data.requests.map((item: unknown) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('id' in item) ||
      typeof item.id !== 'string' ||
      !('reason' in item) ||
      typeof item.reason !== 'string' ||
      !('email' in item) ||
      typeof item.email !== 'string'
    )
      throw new Error('Pedido inválido');
    return { id: item.id, reason: item.reason, email: item.email };
  });
}
export async function decideAccess(session: Session, id: string, decision: Decision) {
  const r = await fetch('/api/admin/access', {
    method: 'POST',
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, decision }),
  });
  if (!r.ok)
    throw new Error(
      r.status === 409
        ? 'Outro administrador já decidiu este pedido.'
        : 'Não foi possível registrar a decisão.',
    );
}

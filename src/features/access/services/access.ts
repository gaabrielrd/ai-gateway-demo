import { authorizationHeader, type Session } from '@/features/auth';

export const accessLabels = {
  none: 'Sem solicitação',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
} as const;
export type AccessStatus = keyof typeof accessLabels;
export async function ownAccess(session: Session, reason?: string): Promise<AccessStatus> {
  const response = await fetch('/api/access', {
    method: reason === undefined ? 'GET' : 'POST',
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
    ...(reason === undefined ? {} : { body: JSON.stringify({ reason }) }),
  });
  if (!response.ok) throw new Error('Falha ao acessar a solicitação.');
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('status' in data) ||
    typeof data.status !== 'string' ||
    !Object.hasOwn(accessLabels, data.status)
  )
    throw new Error('Resposta inválida.');
  return data.status as AccessStatus;
}

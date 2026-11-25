import { authorizationHeader, type Session } from '@/features/auth';
export interface Panel {
  task: string;
  options: string[];
  modelIds: string[];
  criteria: { id: string; label: string }[];
}
export async function readPanels(session: Session): Promise<Panel[]> {
  const r = await fetch('/api/admin/panels', { headers: authorizationHeader(session) });
  if (!r.ok)
    throw new Error(
      r.status === 403
        ? 'Acesso administrativo necessário.'
        : 'Não foi possível carregar os painéis.',
    );
  const data = (await r.json()) as { panels: Panel[] };
  if (!Array.isArray(data.panels)) throw new Error('Resposta de painéis inválida.');
  return data.panels;
}
export async function savePanel(session: Session, task: string, modelIds: string[]) {
  const r = await fetch('/api/admin/panels', {
    method: 'POST',
    headers: { ...authorizationHeader(session), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, modelIds }),
  });
  if (!r.ok) throw new Error('Não foi possível salvar o painel.');
}

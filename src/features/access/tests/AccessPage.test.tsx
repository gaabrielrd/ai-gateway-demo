import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccessPage } from '../components/AccessPage';
import { useAuth, type AuthContextValue } from '@/features/auth';

vi.mock('@/features/auth', async (load) => ({
  ...(await load<typeof import('@/features/auth')>()),
  useAuth: vi.fn(),
}));
vi.mock('../components/AdminQueue', () => ({ AdminQueue: () => null }));
const session = {
  accessToken: 'id',
  subject: 'one',
  expiresAt: 1,
  scope: [],
  refreshToken: undefined,
};
function signedIn() {
  vi.mocked(useAuth).mockReturnValue({
    state: { status: 'autenticada', session },
    ensureSession: () => Promise.resolve(session),
    login: vi.fn(),
    logout: vi.fn(),
    adoptSession: vi.fn(),
  } satisfies AuthContextValue);
}
afterEach(() => vi.unstubAllGlobals());
test('envia justificativa opcional com a sessão e permite atualizar a decisão', async () => {
  signedIn();
  const http = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: 'none' }))
    .mockResolvedValueOnce(Response.json({ status: 'pending' }))
    .mockResolvedValueOnce(Response.json({ status: 'approved' }));
  vi.stubGlobal('fetch', http);
  render(<AccessPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Solicitar acesso' }));
  expect(await screen.findByText('Pendente')).toBeInTheDocument();
  expect(http.mock.calls[1]?.[1]).toMatchObject({
    method: 'POST',
    body: '{"reason":""}',
    headers: { Authorization: 'Bearer id' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar situação' }));
  expect(await screen.findByText('Aprovado')).toBeInTheDocument();
});
test('permite recuperar de falha de consulta', async () => {
  signedIn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ status: 'rejected' })),
  );
  render(<AccessPage />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar situação' }));
  expect(await screen.findByText('Rejeitado')).toBeInTheDocument();
});

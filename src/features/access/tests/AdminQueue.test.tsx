import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AdminQueue } from '../components/AdminQueue';
vi.mock('@/features/auth', async (load) => ({
  ...(await load<typeof import('@/features/auth')>()),
  useAuth: () => ({ ensureSession: session }),
}));
const session = () => Promise.resolve({ accessToken: 'id' });
afterEach(() => vi.unstubAllGlobals());
test('administrador decide um pedido e vê a fila atualizada', async () => {
  const http = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ requests: [{ id: 'u', email: 'p@example.test', reason: 'Testar' }] }),
    )
    .mockResolvedValueOnce(Response.json({ status: 'approved' }))
    .mockResolvedValueOnce(Response.json({ requests: [] }));
  vi.stubGlobal('fetch', http);
  render(<AdminQueue />);
  fireEvent.click(await screen.findByRole('button', { name: 'Aprovar p@example.test' }));
  expect(await screen.findByText('Nenhuma solicitação pendente.')).toBeInTheDocument();
  expect(http.mock.calls[1]?.[1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify({ id: 'u', decision: 'approved' }),
  });
});

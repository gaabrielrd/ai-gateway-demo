import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PanelsPage } from '../components/PanelsPage';
const auth = vi.hoisted(() => ({
  state: { status: 'autenticada', session: { subject: 'admin' } },
  ensureSession: () => Promise.resolve({}),
}));
vi.mock('@/features/auth', () => ({
  useAuth: () => auth,
  authorizationHeader: () => ({ Authorization: 'Bearer test' }),
}));
it('permite salvar apenas três opções e mostra a confirmação', async () => {
  const mock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json({
        panels: [
          {
            task: 'image',
            options: ['A', 'B', 'C', 'D'],
            criteria: [{ id: 'task', label: 'Fidelidade visual' }],
            modelIds: [],
          },
        ],
      }),
    )
    .mockResolvedValueOnce(Response.json({}));
  try {
    render(<PanelsPage />);
    const save = await screen.findByRole('button', { name: 'Salvar painel' });
    expect(save).toBeDisabled();
    for (const name of ['A', 'B', 'C'])
      await userEvent.click(screen.getByRole('checkbox', { name }));
    expect(screen.getByRole('checkbox', { name: 'D' })).toBeDisabled();
    await userEvent.click(save);
    expect(await screen.findByText('Painel salvo.')).toBeVisible();
    expect(mock).toHaveBeenLastCalledWith(
      '/api/admin/panels',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ task: 'image', modelIds: ['A', 'B', 'C'] }),
      }),
    );
  } finally {
    mock.mockRestore();
  }
});

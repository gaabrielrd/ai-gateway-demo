import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuotePreview } from '../components/QuotePreview';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    state: { status: 'autenticada', session: { subject: 'one' } },
    ensureSession: () => Promise.resolve({}),
  }),
  authorizationHeader: () => ({ Authorization: 'Bearer mock' }),
}));

describe('orçamento antes de executar', () => {
  it.each([
    [200, { availableMicroUsd: 4500000, ceilingMicroUsd: 21547, reason: null }, /0,021547/],
    [
      200,
      { availableMicroUsd: 10000, ceilingMicroUsd: 21547, reason: 'Saldo insuficiente.' },
      /Saldo insuficiente/,
    ],
    [
      200,
      { availableMicroUsd: 4500000, ceilingMicroUsd: null, reason: 'Painel indisponível.' },
      /Painel indisponível/,
    ],
    [403, {}, /Solicite acesso/],
  ] as const)('exibe a previsão ou explica o bloqueio', async (status, body, expected) => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status }));
    try {
      render(
        <MemoryRouter>
          <QuotePreview task="summary" modelIds={['x']} />
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Consultar orçamento' }));
      expect(await screen.findByText(expected)).toBeVisible();
      expect(mock).toHaveBeenCalledWith(
        '/api/budget/quote',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ task: 'summary', modelIds: ['x'] }),
        }),
      );
    } finally {
      mock.mockRestore();
    }
  });
});

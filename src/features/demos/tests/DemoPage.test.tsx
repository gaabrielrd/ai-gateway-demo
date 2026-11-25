import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { DemoPage } from '../components/DemoPage';
const auth = vi.hoisted(() => ({
  state: { status: 'autenticada', session: { subject: 'uid' } },
  ensureSession: vi.fn(() => Promise.resolve({})),
}));
vi.mock('@/features/auth', () => ({
  useAuth: () => auth,
  authorizationHeader: () => ({ Authorization: 'Bearer test' }),
}));
afterEach(() => vi.restoreAllMocks());
it('confirma o teto e mostra a origem observada mesmo quando a chamada mais rápida não indica cache', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json({
        prompt: 'Explique cache.',
        modelId: 'llama',
        ceilingMicroUsd: 1000,
        availableMicroUsd: 10000,
      }),
    )
    .mockResolvedValueOnce(Response.json({ runId: 'id' }))
    .mockResolvedValueOnce(
      Response.json({
        finished: true,
        rows: {
          0: { status: 'completed', cacheStatus: 'MISS', durationMs: 100, costMicroUsd: 2 },
          1: { status: 'completed', cacheStatus: null, durationMs: 4, costMicroUsd: null },
        },
      }),
    );
  render(
    <MemoryRouter>
      <DemoPage />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consultar previsão' }));
  expect(await screen.findByText('Explique cache.')).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: /Confirmar e executar/ }));
  expect(await screen.findByText('Origem: provedor')).toBeVisible();
  expect(screen.getByText('Origem não informada')).toBeVisible();
  expect(screen.getByText('Tempo de resposta: 4 ms')).toBeVisible();
});

it('exibe a falha do primário e identifica a versão que efetivamente respondeu', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json({
        prompt: 'Explique fallback.',
        modelId: 'llama',
        ceilingMicroUsd: 1000,
        availableMicroUsd: 10000,
      }),
    )
    .mockResolvedValueOnce(Response.json({ runId: 'id' }))
    .mockResolvedValueOnce(
      Response.json({
        finished: true,
        finalModel: 'llama',
        durationMs: 90,
        rows: {
          0: { status: 'failed', modelId: 'indisponível', error: 'Falha preparada' },
          1: { status: 'completed', modelId: 'llama', costMicroUsd: 11 },
        },
      }),
    );
  render(
    <MemoryRouter>
      <DemoPage kind="fallback" />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consultar previsão' }));
  await user.click(await screen.findByRole('button', { name: 'Confirmar e executar fallback' }));
  expect(await screen.findByText('Modelo final: llama')).toBeVisible();
  expect(screen.getByText('Falha preparada')).toBeVisible();
  expect(screen.getByText('Tempo total da rota: 90 ms')).toBeVisible();
});

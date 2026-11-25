import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ExecutionForm } from '../components/ExecutionForm';
import { PublishBenchmark, GalleryPage } from '../components/GalleryPage';
import { HistoryPage } from '../components/HistoryPage';
import { ExecutionPage } from '../components/ExecutionPage';

const auth = vi.hoisted(() => ({
  state: { status: 'autenticada', session: { subject: 'owner' } },
  ensureSession: vi.fn(() => Promise.resolve({})),
}));
vi.mock('@/features/auth', () => ({
  useAuth: () => auth,
  authorizationHeader: () => ({ Authorization: 'Bearer test' }),
}));
afterEach(() => vi.restoreAllMocks());

it('envia o teto e os campos opcionais, exibe primeiro a resposta pronta e acompanha a segunda', async () => {
  let id = '';
  let reads = 0;
  const modelIds = ['a', 'b'];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (init?.method === 'POST') {
      const data = (await new Response(init.body).json()) as { executionId: string };
      expect(data).toMatchObject({
        task: 'summary',
        modelIds,
        prompt: 'Pedido',
        criterion: 'Clareza',
        reference: 'Referência',
        confirmedMicroUsd: 230,
      });
      id = data.executionId;
      return Response.json({ executionId: id }, { status: 202 });
    }
    expect(url).toBe('/api/executions/' + id);
    reads++;
    return Response.json({
      executionId: id,
      prompt: 'Pedido',
      attempts: [
        {
          index: 0,
          modelId: 'a',
          status: 'completed',
          durationMs: 0,
          inputTokens: 0,
          outputTokens: null,
          costMicroUsd: 0,
          output: { type: 'text', text: 'Primeira resposta' },
        },
        reads === 1
          ? { index: 1, modelId: 'b', status: 'running' }
          : { index: 1, modelId: 'b', status: 'failed', error: 'Falha na chamada ao gateway.' },
      ],
    });
  });
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={<ExecutionForm task="summary" modelIds={modelIds} confirmedMicroUsd={230} />}
        />
        <Route path="/execucoes/:id" element={<ExecutionPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Usar exemplo' }));
  expect(screen.getByLabelText('Prompt')).toHaveDisplayValue(/Resuma/);
  expect(screen.getByLabelText(/Referência ou/)).toHaveDisplayValue(/nove acertos/);
  await user.clear(screen.getByLabelText(/Referência ou/));
  await user.clear(screen.getByLabelText('Prompt'));
  await user.type(screen.getByLabelText('Prompt'), 'Pedido');
  await user.type(screen.getByLabelText(/Referência ou/), 'Referência');
  await user.type(screen.getByLabelText(/Critério próprio/), 'Clareza');
  await user.click(screen.getByRole('button', { name: 'Confirmar e executar' }));
  expect(await screen.findByText('Primeira resposta')).toBeVisible();
  expect(screen.getByText('Em andamento')).toBeVisible();
  expect(screen.getByText('0 ms')).toBeVisible();
  expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  expect(
    await screen.findByText('Falha na chamada ao gateway.', {}, { timeout: 3500 }),
  ).toBeVisible();
  expect(screen.getByText('Primeira resposta')).toBeVisible();
});

it('recupera a consulta privada e carrega a imagem com o token da sessão', async () => {
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:privado');
      static override revokeObjectURL = revoke;
    },
  );
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({
        executionId: 'teste',
        prompt: 'Ilustre',
        attempts: [
          {
            index: 0,
            modelId: 'Lucid',
            status: 'completed',
            unit: 'tiles-and-steps',
            output: { type: 'image', contentType: 'image/jpeg' },
          },
        ],
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(new Blob(['imagem'], { type: 'image/jpeg' })));
  try {
    const view = render(
      <MemoryRouter initialEntries={['/execucoes/teste']}>
        <Routes>
          <Route path="/execucoes/:id" element={<ExecutionPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /carregar a imagem novamente/ }),
    );
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:privado');
    expect(request).toHaveBeenLastCalledWith(
      '/api/executions/teste/media/0',
      expect.objectContaining({ headers: { Authorization: 'Bearer test' } }),
    );
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:privado');
  } finally {
    vi.unstubAllGlobals();
  }
});

it('reabre a comparação e só repete após confirmar o novo teto', async () => {
  const failed = { index: 1, modelId: 'B', status: 'failed' };
  const first = {
    index: 0,
    modelId: 'A',
    status: 'completed',
    output: { type: 'text', text: 'Resultado preservado' },
  };
  const original = { executionId: 'original', prompt: 'Pedido', attempts: [first, failed] };
  const requests = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(original))
    .mockResolvedValueOnce(
      Response.json({ availableMicroUsd: 1000000, ceilingMicroUsd: 172000, reason: null }),
    )
    .mockResolvedValueOnce(Response.json({ index: 2 }, { status: 202 }))
    .mockResolvedValueOnce(
      Response.json({
        ...original,
        attempts: [
          first,
          { ...failed, retryIndex: 2 },
          {
            ...first,
            index: 2,
            retryOf: 1,
            modelId: 'B',
            output: { type: 'text', text: 'Resposta recuperada' },
          },
        ],
      }),
    );
  render(
    <MemoryRouter initialEntries={['/execucoes/original']}>
      <Routes>
        <Route path="/execucoes/:id" element={<ExecutionPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Consultar custo de repetição' }),
  );
  expect(await screen.findByText(/Novo teto com reavaliação/)).toHaveTextContent('0,172');
  expect(requests).toHaveBeenCalledTimes(2);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar repetição' }));
  expect(await screen.findByText('Resposta recuperada')).toBeVisible();
  expect(screen.getByText('Resultado preservado')).toBeVisible();
  expect(requests).toHaveBeenNthCalledWith(
    3,
    '/api/executions/original/attempts/1/retry',
    expect.objectContaining({ method: 'POST', body: '{"confirmedMicroUsd":172000}' }),
  );
});

it('abre a comparação pelo histórico e só exclui após confirmação', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json([
        {
          executionId: 'minha',
          prompt: 'Comparar este resumo',
          createdAt: '2026-01-01',
          expiresAt: '2026-01-31',
        },
      ]),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('link', { name: 'Comparar este resumo' })).toHaveAttribute(
    'href',
    '/execucoes/minha',
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Excluir' }));
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(fetch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Excluir' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  expect(await screen.findByText('Seu histórico está vazio.')).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/executions/minha',
    expect.objectContaining({ method: 'DELETE' }),
  );
});

it('exige revisão e autoria antes de publicar o benchmark', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'publicada' }));
  render(
    <MemoryRouter>
      <PublishBenchmark id="privada" revision={2} />
    </MemoryRouter>,
  );
  const publish = screen.getByRole('button', { name: 'Publicar na galeria' });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Título do benchmark'), 'Fatura fictícia');
  expect(publish).toBeDisabled();
  await user.click(screen.getByRole('checkbox'));
  await user.click(publish);
  expect(await screen.findByRole('link', { name: 'Ver benchmark publicado' })).toHaveAttribute(
    'href',
    '/galeria/publicada',
  );
  expect(fetch).toHaveBeenCalledWith(
    '/api/admin/gallery',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        executionId: 'privada',
        revision: 2,
        title: 'Fatura fictícia',
        ownMaterial: true,
      }),
    }),
  );
});

it('carrega a galeria pública sem pedir uma sessão', async () => {
  auth.ensureSession.mockClear();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json([{ id: 'resumo', title: 'Resumo técnico' }]),
  );
  render(
    <MemoryRouter>
      <GalleryPage />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('link', { name: 'Resumo técnico' })).toHaveAttribute(
    'href',
    '/galeria/resumo',
  );
  expect(auth.ensureSession).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Retirar' })).not.toBeInTheDocument();
});

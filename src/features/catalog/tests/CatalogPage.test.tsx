import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import catalog from '../../../../functions/catalog.json';
import { CatalogPage, ModelSelector } from '../components/CatalogPage';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ state: { status: 'anonima' } }),
}));

it.each([0, 1, 2, 3, 4])('limita a seleção com %i versões compatíveis', async (count) => {
  const user = userEvent.setup();
  const models = Array.from({ length: count }, (_, i) => ({
    ...catalog.models[0]!,
    id: 'modelo-' + i,
  }));
  render(<ModelSelector catalog={{ ...catalog, models }} />);
  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  const inputs = screen.queryAllByRole('checkbox');
  expect(inputs).toHaveLength(count);
  if (!count) {
    expect(screen.getByText(/Nenhum modelo habilitado/)).toBeVisible();
    return;
  }
  if (count < 3) expect(screen.getByText(/Apenas/)).toBeVisible();
  for (const input of inputs.slice(0, 3)) await user.click(input);
  const limit = Math.min(count, 3);
  expect(screen.getByRole('status')).toHaveTextContent(`${limit} de ${limit}`);
  if (count > 3) {
    expect(inputs[3]).toBeDisabled();
    await user.click(inputs[0]!);
    expect(inputs[3]).toBeEnabled();
  }
});

it('troca para imagem e remove as versões de texto da seleção', async () => {
  const user = userEvent.setup();
  render(<ModelSelector catalog={catalog} />);
  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  await user.click(screen.getAllByRole('checkbox')[0]!);
  await user.keyboard('{Escape}');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tarefa' }), 'Geração de imagem');

  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  expect(screen.getByRole('checkbox', { name: /lucid-origin/ })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: /flux-1-schnell/ })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: /flux-1-schnell/ })).not.toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('0 de 1');
});

it('permite recuperar o catálogo público após falha', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json(catalog));
  try {
    render(<CatalogPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('combobox', { name: 'Tarefa' })).toBeVisible();
  } finally {
    fetchMock.mockRestore();
  }
});

it('ordena por data ou nome e preserva candidatos entre provedores', async () => {
  const user = userEvent.setup();
  const models = [
    { ...catalog.models[0]!, provider: 'A', id: 'Antigo', createdAt: '2025-01-01' },
    { ...catalog.models[0]!, provider: 'A', id: 'Recente', createdAt: '2026-01-01' },
    { ...catalog.models[0]!, provider: 'B', id: 'Outro' },
  ];
  render(<ModelSelector catalog={{ ...catalog, models }} />);
  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName('Recente');
  await user.keyboard('{Escape}');
  await user.selectOptions(screen.getByLabelText('Ordenar modelos'), 'name');
  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName('Antigo');
  await user.click(screen.getByRole('checkbox', { name: 'Recente' }));
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: /^Provedor:/ }));
  await user.type(screen.getByRole('textbox', { name: 'Buscar em Provedor' }), 'B');
  await user.click(screen.getByRole('button', { name: /B 1 versão elegível/ }));
  await user.click(screen.getByRole('button', { name: /^Modelos:/ }));
  expect(screen.queryByRole('checkbox', { name: 'Recente' })).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: 'Outro' }));
  expect(screen.getByRole('status')).toHaveTextContent('2 de 3');
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: 'Remover Recente' }));
  expect(screen.getByRole('status')).toHaveTextContent('1 de 3');
});

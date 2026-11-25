import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import catalog from '../../../../functions/catalog.json';
import { CatalogPage, ModelSelector } from '../components/CatalogPage';

it.each([0, 1, 2, 3, 4])('limita a seleção com %i versões compatíveis', async (count) => {
  const user = userEvent.setup();
  const models = Array.from({ length: count }, (_, i) => ({
    ...catalog.models[0]!,
    id: 'modelo-' + i,
  }));
  render(<ModelSelector catalog={{ ...catalog, models }} />);
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
  await user.click(screen.getAllByRole('checkbox')[0]!);
  await user.selectOptions(screen.getByRole('combobox'), 'Geração de imagem');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(screen.getByRole('checkbox', { name: /flux/ })).not.toBeChecked();
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
    expect(await screen.findByRole('combobox')).toBeVisible();
  } finally {
    fetchMock.mockRestore();
  }
});

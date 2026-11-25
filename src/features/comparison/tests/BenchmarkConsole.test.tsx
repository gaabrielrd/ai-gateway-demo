import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { BenchmarkConsole } from '../components/BenchmarkConsole';
import type { Execution } from '../services/executions';

it('liga a divergência ao modelo e mantém campos ausentes distintos de zero', async () => {
  const record: Execution = {
    executionId: 'fatura',
    title: 'Extrair a data',
    task: 'extraction',
    prompt: 'Extraia a data.',
    reference: '{"emissao":"2026-04-15"}',
    attempts: [
      {
        index: 0,
        modelId: 'Modelo A',
        status: 'completed',
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        costMicroUsd: 0,
        output: { type: 'text', text: '{"emissao":"2026-04-15"}' },
      },
      {
        index: 1,
        modelId: 'Modelo B',
        status: 'completed',
        output: { type: 'text', text: '{"emissao":"15/04/2026"}' },
      },
    ],
    evaluation: {
      status: 'finished',
      reviews: [],
      checks: [
        { index: 0, fields: [{ field: 'emissao', correct: true }] },
        { index: 1, fields: [{ field: 'emissao', correct: false }] },
      ],
    },
  };
  render(
    <MemoryRouter>
      <BenchmarkConsole record={record} />
    </MemoryRouter>,
  );
  const inspector = within(screen.getByRole('complementary'));
  expect(inspector.getByText('Diferença na emissão')).toBeVisible();
  expect(inspector.getByText('15/04/2026', { exact: true })).toBeVisible();
  const table = within(screen.getByRole('table'));
  expect(table.getByRole('row', { name: /Modelo A/ })).toHaveTextContent('0,000000');
  expect(table.getByRole('row', { name: /Modelo B/ })).toHaveTextContent('—');
  const button = table.getByRole('button', { name: 'Modelo A' });
  await userEvent.click(button);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(inspector.getByRole('heading', { name: 'Modelo A' })).toBeVisible();
  expect(inspector.queryByText('Diferença na emissão')).toBeNull();
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { EvaluationResults } from '../components/EvaluationResults';
import type { Execution } from '../services/executions';

it('expõe divergência, conferência do gabarito e justificativa de não verificável', async () => {
  const record: Execution = {
    executionId: 'abc',
    prompt: 'Fatura',
    attempts: [{ index: 0, modelId: 'A', status: 'completed' }],
    judges: ['J1', 'J2', 'J3'],
    criteria: [{ id: 't', label: 'Exatidão' }],
    evaluation: {
      status: 'finished',
      checks: [{ index: 0, fields: [{ field: 'total', correct: true }] }],
      reviews: [
        {
          modelId: 'J1',
          status: 'completed',
          costMicroUsd: 0,
          durationMs: 25,
          verdict: [
            { index: 0, marks: [{ id: 't', score: null, reason: 'Gabarito insuficiente.' }] },
          ],
        },
      ],
      ranking: {
        rows: [
          {
            index: 0,
            modelId: 'A',
            position: null,
            score: null,
            marks: [
              { id: 't', label: 'Exatidão', median: null, scores: [null, 1, 3], divergent: true },
            ],
          },
        ],
        reasons: ['Há critérios sem três notas verificáveis.'],
        elapsedMs: null,
        totalCostMicroUsd: null,
      },
    },
  };
  render(<EvaluationResults record={record} />);
  expect(screen.getByRole('heading', { name: 'Classificação parcial' })).toBeVisible();
  expect(screen.getByText(/Juízes divergiram/)).toBeVisible();
  expect(screen.getByText('total: correto')).toBeVisible();
  await userEvent.click(screen.getByText('J1 · Parecer disponível'));
  expect(screen.getByText(/Gabarito insuficiente/)).toBeVisible();
  expect(screen.getByText('Exatidão: Não verificável')).toBeVisible();
});

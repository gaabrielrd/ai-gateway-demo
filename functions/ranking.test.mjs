import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeRanking } from './ranking.mjs';

function fixture() {
  const criteria = ['pedido', 'completude', 'tarefa'].map((id) => ({ id, label: id }));
  const judges = ['J1', 'J2', 'J3'];
  const attempts = [0, 1, 2].map((index) => ({
    index,
    modelId: 'modelo-' + index,
    status: index === 2 ? 'failed' : 'completed',
    costMicroUsd: 200 + index,
  }));
  const scores = [
    [4, 1, 2],
    [4, 3, 2],
    [4, 4, 2],
  ];
  const reviews = judges.map((modelId, i) => ({
    modelId,
    status: 'completed',
    costMicroUsd: 10,
    startedAt: { toMillis: () => 100 + i },
    finishedAt: { toMillis: () => 250 + i },
    verdict: [0, 1].map((index) => ({
      index,
      marks: criteria.map(({ id }, c) => ({ id, score: scores[i][c], reason: 'Evidência' })),
    })),
  }));
  return { criteria, judges, attempts, reviews, indices: [0, 1, 2], finished: true };
}
test('mediana, pesos iguais e empate independem do custo e excluem falha de geração', () => {
  const result = summarizeRanking(fixture());
  assert.deepEqual(
    result.rows.map((r) => [r.index, r.position, r.score]),
    [
      [0, 1, 3],
      [1, 1, 3],
    ],
  );
  assert.deepEqual(
    result.rows[0].marks.map((m) => m.median),
    [4, 3, 2],
  );
  assert.equal(result.rows[0].marks[1].divergent, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.elapsedMs, 152);
  assert.equal(result.totalCostMicroUsd, 30);
});
test('inclui critério próprio, preserva zero e explica parecer incompleto', () => {
  const data = fixture();
  data.criteria.push({ id: 'custom', label: 'Clareza' });
  data.reviews.forEach((r) =>
    r.verdict.forEach((v) => v.marks.push({ id: 'custom', score: 0, reason: 'Ausente' })),
  );
  assert.equal(summarizeRanking(data).rows[0].score, 2.25);
  data.reviews[0].verdict[0].marks[3].score = null;
  const partial = summarizeRanking(data);
  assert.equal(partial.rows.find((r) => r.index === 0).score, null);
  assert.ok(partial.reasons.length);
  data.reviews.pop();
  const missing = summarizeRanking(data);
  assert.ok(missing.rows.every((r) => r.position === null));
  assert.equal(missing.totalCostMicroUsd, null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from './catalog.json' with { type: 'json' };
import { availableBudget, billingMonth, planBudget, priceAttempt } from './budget.mjs';
const ids = catalog.models.filter((model) => model.output === 'text').map((m) => m.id);
const request = { task: 'summary', modelIds: ids };
test('comparação inclui a geração e o painel mesmo quando usam o mesmo modelo', () => {
  const quote = planBudget(request, ids);
  assert.equal(quote.attempts.length, 6);
  assert.equal(quote.attempts[0].ceilingMicroUsd, Math.ceil(24000 * 0.293 + 512 * 2.253));
  assert.equal(
    quote.ceilingMicroUsd,
    quote.attempts.reduce((sum, a) => sum + a.ceilingMicroUsd, 0),
  );
  assert.equal(
    planBudget({ ...request, kind: 'retry', modelIds: [ids[1]] }, ids).attempts.length,
    4,
  );
});
test('demos provisionam os dois destinos ou duas passagens pelo provedor', () => {
  const cache = planBudget({ ...request, kind: 'cache', modelIds: [ids[0]] });
  assert.equal(cache.ceilingMicroUsd, cache.attempts[0].ceilingMicroUsd * 2);
  assert.equal(
    planBudget({ ...request, kind: 'fallback', modelIds: ids.slice(0, 2) }).attempts[1].modelId,
    ids[1],
  );
});
test('preço, limites, compatibilidade e painel precisam ser conhecidos', () => {
  assert.throws(() => planBudget(request), /três juízes/);
  assert.throws(
    () => planBudget({ ...request, modelIds: [ids[0], ids[0], ids[0]] }, ids),
    /Seleção/,
  );
  const image = catalog.models.find((m) => m.id.endsWith('/flux-1-schnell'));
  assert.throws(() => priceAttempt(image, 'generation', {}), /limite/);
  assert.equal(
    priceAttempt(image, 'generation', { width: 513, height: 512, steps: 2 }).ceilingMicroUsd,
    317,
  );
  assert.throws(
    () =>
      priceAttempt({ ...image, price: {} }, 'generation', { width: 512, height: 512, steps: 1 }),
    /Preço/,
  );
});
test('saldo desconta reservas e gastos no mês de Brasília', () => {
  assert.equal(billingMonth(new Date('2026-12-01T02:59:59Z')), '2026-11');
  assert.equal(billingMonth(new Date('2026-12-01T03:00:00Z')), '2026-12');
  assert.equal(availableBudget(undefined), 5000000);
  assert.equal(availableBudget({ spentMicroUsd: 3500000, reservedMicroUsd: 500000 }), 1000000);
  assert.throws(() => availableBudget({}), /indisponível/);
});

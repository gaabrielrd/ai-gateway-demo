import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackModel, fallbackPlan, requestFallback } from './fallback-demo.mjs';
const attempt = fallbackPlan().attempts[0];
test('o destino efetivo confirma fallback e mantém a falha preparada isolada', async () => {
  const result = await requestFallback(attempt, async (url, init) => {
    assert.match(url, /chat\/completions$/);
    assert.equal(JSON.parse(init.body).model, 'dynamic/demo_fallback');
    assert.equal(
      JSON.parse(init.headers['cf-aig-metadata']).demoPrimary,
      'workers-ai/@cf/demo/unavailable',
    );
    return Response.json({
      model: fallbackModel,
      choices: [{ message: { content: 'Resposta' } }],
      usage: { prompt_tokens: 20, completion_tokens: 8 },
    });
  });
  assert.equal(result.finalModel, fallbackModel);
  assert.equal(result.rows[0].status, 'failed');
  assert.equal(result.rows[1].status, 'completed');
  assert.ok(result.costMicroUsd > 0);
});
test('indisponibilidade do segundo modelo deixa a rota sem vencedor e sem uso suposto', async () => {
  const result = await requestFallback(attempt, async () =>
    Response.json({ error: { message: 'Modelo secundário indisponível' } }, { status: 503 }),
  );
  assert.equal(result.finalModel, null);
  assert.equal(result.costMicroUsd, null);
  assert.deepEqual(result.rows, {});
  assert.match(result.error, /503/);
});

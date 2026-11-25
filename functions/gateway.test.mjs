import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from './gateway.mjs';
const conn = { accountId: 'a'.repeat(32), gatewayId: 'demo', token: 'test' };
const text = {
  modelId: '@cf/qwen/qwen2.5-coder-32b-instruct',
  prompt: 'OK?',
  limits: { outputTokens: 8 },
};
test('envia uma chamada com limites e captura o uso confirmado', async () => {
  const result = await generate(text, {
    ...conn,
    fetchImpl: async (url, init) => {
      assert.match(url, /\/ai\/v1\/chat\/completions$/);
      const payload = JSON.parse(init.body);
      assert.equal(payload.max_tokens, 8);
      assert.equal(init.headers['cf-aig-gateway-id'], 'demo');
      assert.equal(init.headers['cf-aig-max-attempts'], '1');
      return Response.json(
        {
          model: text.modelId,
          choices: [{ message: { content: 'OK' } }],
          usage: { prompt_tokens: 10, completion_tokens: 0 },
        },
        { headers: { 'cf-aig-cache-status': 'HIT' } },
      );
    },
  });
  assert.deepEqual(result.output, { type: 'text', text: 'OK' });
  assert.equal(result.effectiveModel, text.modelId);
  assert.equal(result.outputTokens, 0);
  assert.equal(result.cacheStatus, 'HIT');
  assert.ok(result.durationMs >= 0);
});
test('imagem conserva bytes e metadados ausentes', async () => {
  const image = await generate(
    {
      modelId: '@cf/leonardo/lucid-origin',
      prompt: 'A',
      limits: { width: 512, height: 512, steps: 1 },
    },
    {
      ...conn,
      fetchImpl: async (url, init) => {
        assert.ok(url.endsWith('/ai/run/@cf/leonardo/lucid-origin'));
        assert.deepEqual(JSON.parse(init.body), { prompt: 'A', steps: 1, width: 512, height: 512 });
        return Response.json({
          result: { image: Buffer.from([255, 216, 255, 217]).toString('base64') },
        });
      },
    },
  );
  assert.equal(image.output.contentType, 'image/jpeg');
  assert.equal(image.inputTokens, null);
  assert.equal(image.effectiveModel, null);
});
test('falha do provedor e corpo incompleto não viram sucesso', async () => {
  await assert.rejects(
    generate(text, { ...conn, fetchImpl: () => new Response(null, { status: 429 }) }),
    /HTTP 429/,
  );
  await assert.rejects(
    generate(text, { ...conn, fetchImpl: () => Response.json({ choices: [] }) }),
    /incompleta/,
  );
  await assert.rejects(generate({ ...text, modelId: 'desconhecido' }, conn), /inválido/);
});

test('juiz com resposta vazia preserva o uso para liquidação antes da validação do parecer', async () => {
  const result = await generate(
    { ...text, judgeContent: 'Candidato A' },
    {
      ...conn,
      fetchImpl: () =>
        Response.json({
          choices: [{ message: { content: null } }],
          usage: { prompt_tokens: 30, completion_tokens: 5 },
        }),
    },
  );
  assert.equal(result.output.text, '');
  assert.equal(result.inputTokens, 30);
  assert.equal(result.outputTokens, 5);
});

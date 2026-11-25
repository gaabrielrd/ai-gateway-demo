import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { panelsApi, criteriaFor } from './panels.mjs';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createExecution } from './executions.mjs';

test('painel identifica os critérios e preserva o critério próprio', () => {
  assert.deepEqual(
    criteriaFor('extraction', ' Data em ISO ').map((c) => c.label),
    ['Cumprimento do pedido', 'Completude', 'Exatidão dos campos extraídos', 'Data em ISO'],
  );
});

test(
  'somente administrador configura três versões visuais e a execução preserva o painel',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async (t) => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(127\.0\.0\.1|localhost):\d+$/);
    const app = initializeApp({ projectId: 'demo-ai-gateway' });
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway');
    const uid = randomUUID();
    process.env.AI_GATEWAY_ADMIN_UID = uid;
    t.after(() => delete process.env.AI_GATEWAY_ADMIN_UID);
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(x) {
        this.body = x;
        return this;
      },
    };
    await panelsApi({ method: 'GET' }, res, { uid: 'visitante' });
    assert.equal(res.code, 403);
    await panelsApi({ method: 'GET' }, res, { uid });
    const models = res.body.panels.find((p) => p.task === 'image').options;
    assert.equal(models.length, 3);
    for (const ids of [
      [models[0], models[0], models[2]],
      ['@cf/qwen/qwen2.5-coder-32b-instruct', ...models.slice(1)],
    ]) {
      await panelsApi({ method: 'POST', body: { task: 'image', modelIds: ids } }, res, { uid });
      assert.equal(res.code, 400);
    }
    await panelsApi({ method: 'POST', body: { task: 'image', modelIds: models } }, res, { uid });
    assert.deepEqual(res.body.modelIds, models);
    const id = randomUUID();
    const body = {
      task: 'image',
      executionId: id,
      prompt: 'Um vaso',
      criterion: 'Fundo azul',
      modelIds: ['@cf/leonardo/lucid-origin'],
      confirmedMicroUsd: 1000000,
      confirmedJudges: models,
    };
    await createExecution(db, { uid }, body);
    await panelsApi(
      { method: 'POST', body: { task: 'image', modelIds: [...models].reverse() } },
      res,
      { uid },
    );
    await assert.rejects(
      createExecution(db, { uid }, { ...body, executionId: randomUUID() }),
      /painel mudou/,
    );
    const record = await db.collection('users').doc(uid).collection('executions').doc(id).get();
    assert.deepEqual(record.get('judges'), models);
    assert.equal(record.get('criteria')[3].label, 'Fundo azul');
  },
);

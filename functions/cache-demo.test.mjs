import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { demoApi, runCacheDemo } from './cache-demo.mjs';

test(
  'cache reserva duas chamadas idênticas, aceita MISS duplo e preserva origem ausente',
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  },
  async (t) => {
    const app = initializeApp({ projectId: 'demo-ai-gateway' }, randomUUID());
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway'),
      uid = randomUUID(),
      path = '/api/demos/cache';
    async function api(method, suffix = '', body, owner = uid) {
      const res = {
        code: 200,
        json(data) {
          this.data = data;
        },
        status(code) {
          this.code = code;
          return this;
        },
        sendStatus(code) {
          this.code = code;
        },
      };
      await demoApi(db, { method, path: path + suffix, body }, res, { uid: owner });
      return res;
    }
    assert.equal((await api('GET')).code, 403);
    await db.doc('accessRequests/' + uid).set({ status: 'approved' });
    const { ceilingMicroUsd, prompt } = (await api('GET')).data;
    for (const statuses of [
      ['MISS', 'HIT'],
      ['MISS', 'MISS'],
      ['MISS', null],
    ]) {
      const runId = randomUUID(),
        body = { runId, confirmedMicroUsd: ceilingMicroUsd };
      assert.equal((await api('POST', '', { ...body, confirmedMicroUsd: 0 })).code, 400);
      assert.equal((await api('POST', '', body)).code, 202);
      const inputs = [];
      const run = async (params) => {
        inputs.push(params);
        return {
          output: { type: 'text', text: 'Resposta' },
          cacheStatus: statuses[inputs.length - 1],
          durationMs: inputs.length * 15,
          inputTokens: 12,
          outputTokens: 4,
          logId: null,
          effectiveModel: params.modelId,
        };
      };
      await runCacheDemo(db, { uid, runId }, run);
      await api('POST', '', body);
      await runCacheDemo(db, { uid, runId }, run);
      assert.equal(inputs.length, 2);
      assert.deepEqual(inputs[0], inputs[1]);
      assert.equal(inputs[0].prompt, prompt);
      assert.ok(inputs[0].cacheTtl > 0);
      const saved = (await api('GET', '/' + runId)).data;
      assert.equal(saved.finished, true);
      assert.deepEqual(
        Object.values(saved.rows).map((r) => r.cacheStatus),
        statuses,
      );
      assert.deepEqual(
        Object.values(saved.rows).map((r) => r.durationMs),
        [15, 30],
      );
      const second = saved.rows[1];
      assert.equal(
        second.costMicroUsd,
        second.cacheStatus === 'HIT' ? 0 : second.cacheStatus === 'MISS' ? 13 : null,
      );
    }
  },
);

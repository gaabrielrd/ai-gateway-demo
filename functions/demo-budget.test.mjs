import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { demoApi } from './cache-demo.mjs';
import { billingMonth, MONTHLY_MICRO_USD } from './budget.mjs';
import { monthlyBudgetRef } from './reservations.mjs';

test(
  'cache e fallback exigem aprovação e disputam o mesmo saldo mensal',
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  },
  async (t) => {
    const app = initializeApp({ projectId: 'demo-ai-gateway' }, randomUUID());
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway'),
      uid = randomUUID();
    const access = db.collection('accessRequests').doc(uid);
    const budget = monthlyBudgetRef(db, uid, billingMonth());
    async function call(kind, method, body, suffix = '', subject = uid) {
      const res = {
        code: 200,
        status(code) {
          this.code = code;
          return this;
        },
        json(data) {
          this.data = data;
        },
        sendStatus(code) {
          this.code = code;
        },
      };
      await demoApi(db, { path: '/api/demos/' + kind + suffix, method, body }, res, {
        uid: subject,
      });
      return res;
    }
    const runs = { cache: randomUUID(), fallback: randomUUID() },
      kinds = Object.keys(runs);
    for (const status of ['pending', 'rejected']) {
      await access.set({ status });
      for (const kind of kinds) {
        assert.equal((await call(kind, 'GET')).code, 403);
        assert.equal((await call(kind, 'POST', { runId: runs[kind] })).code, 403);
      }
    }
    assert.equal((await budget.get()).exists, false);
    await access.set({ status: 'approved' });
    const requests = await Promise.all(
      kinds.map(async (kind) => ({
        runId: runs[kind],
        confirmedMicroUsd: (await call(kind, 'GET')).data.ceilingMicroUsd,
      })),
    );
    const remaining = Math.max(...requests.map((r) => r.confirmedMicroUsd));
    await budget.set({ spentMicroUsd: MONTHLY_MICRO_USD - remaining, reservedMicroUsd: 0 });
    const responses = await Promise.all(kinds.map((kind, i) => call(kind, 'POST', requests[i])));
    assert.deepEqual(responses.map((r) => r.code).sort(), [202, 409]);
    const winner = responses.findIndex((r) => r.code === 202),
      loser = 1 - winner;
    assert.match(responses[loser].data.error, /Saldo insuficiente/);
    assert.equal((await call(kinds[winner], 'POST', requests[winner])).code, 202);
    assert.equal((await budget.get()).get('reservedMicroUsd'), requests[winner].confirmedMicroUsd);
    assert.equal(
      (await call(kinds[loser], 'GET', undefined, '/' + requests[loser].runId)).code,
      404,
    );
    const other = randomUUID();
    await db.collection('accessRequests').doc(other).set({ status: 'approved' });
    assert.equal(
      (await call(kinds[winner], 'GET', undefined, '/' + requests[winner].runId, other)).code,
      404,
    );
    for (const [i, kind] of kinds.entries()) {
      assert.equal((await call(kind, 'POST', { ...requests[i], confirmedMicroUsd: 0 })).code, 400);
    }
  },
);

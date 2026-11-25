import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { availableBudget } from './budget.mjs';
import { reserveBudget, settleAttempt, claimAttempt, monthlyBudgetRef } from './reservations.mjs';

test(
  'reservas e liquidações concorrentes no Firestore',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async (t) => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(localhost|127\.0\.0\.1):\d+$/);
    const app = initializeApp({ projectId: 'demo-ai-gateway' }, randomUUID());
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway');
    const uid = randomUUID();
    const november = new Date('2026-12-01T02:59:59Z');
    const december = new Date('2026-12-01T03:00:00Z');
    const account = monthlyBudgetRef(db, uid, '2026-11');
    await account.set({ spentMicroUsd: 4000000, reservedMicroUsd: 0 });
    const plan = {
      ceilingMicroUsd: 700000,
      attempts: [{ ceilingMicroUsd: 600000 }, { ceilingMicroUsd: 100000 }],
    };
    const request = (id) => ({ uid, executionId: id, requestHash: 'a'.repeat(64), plan });
    const results = await Promise.allSettled(
      ['first', 'second'].map((id) => reserveBudget(db, request(id), november)),
    );
    const successful = results.filter((r) => r.status === 'fulfilled');
    assert.equal(successful.length, 1);
    assert.match(results.find((r) => r.status === 'rejected').reason.message, /Saldo insuficiente/);
    const id = successful[0].value.executionId;
    assert.equal(availableBudget((await account.get()).data()), 300000);
    assert.deepEqual(await reserveBudget(db, request(id), december), successful[0].value);
    await assert.rejects(
      reserveBudget(db, { ...request(id), requestHash: 'b'.repeat(64) }, december),
      /outro pedido/,
    );
    const claims = await Promise.all([claimAttempt(db, uid, id, 0), claimAttempt(db, uid, id, 0)]);
    assert.deepEqual(claims.sort(), [false, true]);
    await settleAttempt(db, uid, id, 1, 0);
    const resumed = await reserveBudget(db, request(id), december);
    assert.equal(resumed.attempts[0].status, 'dispatched');
    assert.equal((await account.get()).get('reservedMicroUsd'), 600000);
    assert.equal(await claimAttempt(db, uid, id, 0), false);
    await assert.rejects(settleAttempt(db, uid, id, 0, 600001), /incompatível/);
    const settled = await Promise.all([
      settleAttempt(db, uid, id, 0, 500000),
      settleAttempt(db, uid, id, 0, 500000),
    ]);
    assert.ok(settled.every((r) => r.status === 'settled'));
    await assert.rejects(settleAttempt(db, uid, id, 0, 1), /outro valor/);
    assert.deepEqual((await account.get()).data(), { spentMicroUsd: 4500000, reservedMicroUsd: 0 });
    assert.equal(availableBudget((await account.get()).data()), 500000);
    assert.equal((await monthlyBudgetRef(db, uid, '2026-12').get()).exists, false);
  },
);

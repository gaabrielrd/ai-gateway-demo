import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { hideExecution, listHistory, purgeExpired } from './history.mjs';

test(
  'a expiração e a exclusão isolam autores e removem mídia e pareceres preservando gasto',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async (t) => {
    const app = initializeApp({ projectId: 'demo-ai-gateway' }, randomUUID());
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway');
    const user = db.collection('users').doc(randomUUID());
    const stranger = db.collection('users').doc(randomUUID());
    const ref = user.collection('executions').doc('comparacao');
    const createdAt = new Date('2020-01-01T00:00:00Z');
    const expiresAt = new Date(+createdAt + 30 * 86400000);
    const record = { prompt: 'Privado', task: 'image', createdAt, expiresAt };
    const manual = user.collection('executions').doc('manual');
    const review = ref.collection('rounds').doc(ref.id).collection('reviews').doc('1');
    const budget = user.collection('budgets').doc('2020-01');
    await Promise.all([
      ref.set(record),
      manual.set(record),
      review.set({ reason: 'privado' }),
      budget.set({ spentMicroUsd: 125, reservedMicroUsd: 0 }),
    ]);
    assert.deepEqual(await listHistory(db, stranger.id, createdAt), []);
    assert.equal(
      await hideExecution(stranger.collection('executions').doc(ref.id), createdAt),
      false,
    );
    assert.equal(await hideExecution(manual, createdAt), true);
    assert.deepEqual(
      (await listHistory(db, user.id, new Date(+expiresAt - 1))).map((e) => e.executionId),
      [ref.id],
    );
    assert.deepEqual(await listHistory(db, user.id, expiresAt), []);
    const prefixes = [];
    await purgeExpired(db, new Date(+expiresAt + 300000), () => ({
      deleteFiles: async ({ prefix }) => prefixes.push(prefix),
    }));
    assert.deepEqual(prefixes.sort(), [manual.path + '/', ref.path + '/'].sort());
    assert.equal((await ref.get()).exists, false);
    assert.equal((await review.get()).exists, false);
    assert.deepEqual((await budget.get()).data(), { spentMicroUsd: 125, reservedMicroUsd: 0 });
  },
);

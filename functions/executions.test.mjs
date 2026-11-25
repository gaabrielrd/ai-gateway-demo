import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createExecution, processAttempt, executionApi } from './executions.mjs';
import { retryGeneration } from './retries.mjs';
import { reserveBudget } from './reservations.mjs';
import catalog from './catalog.json' with { type: 'json' };

test(
  'execução privada retém respostas independentes e deduplica o despacho',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async (t) => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(127\.0\.0\.1|localhost):\d+$/);
    const app = initializeApp({ projectId: 'demo-ai-gateway' });
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'cf-ai-gateway');
    const identity = { uid: randomUUID() };
    const modelIds = catalog.models.filter((m) => m.output === 'text').map((m) => m.id);
    const executionId = randomUUID();
    const request = {
      modelIds,
      executionId,
      task: 'summary',
      prompt: 'Resumo',
      confirmedMicroUsd: 500000,
    };
    await assert.rejects(createExecution(db, identity, request), /aprovado/);
    await db.collection('accessRequests').doc(identity.uid).set({ status: 'approved' });
    await db.collection('judgePanels').doc('summary').set({ modelIds });
    await assert.rejects(createExecution(db, identity, { ...request, prompt: ' ' }), /inválido/);
    await assert.rejects(
      createExecution(db, identity, { ...request, confirmedMicroUsd: 1 }),
      /teto mudou/,
    );
    await Promise.all([
      createExecution(db, identity, request),
      createExecution(db, identity, request),
    ]);
    await assert.rejects(
      createExecution(db, identity, { ...request, prompt: 'diferente' }),
      /indisponível/,
    );
    const base = db.collection('users').doc(identity.uid);
    const attempts = base.collection('executions').doc(executionId).collection('attempts');
    let calls = 0;
    const run = async ({ prompt, modelId }) => {
      calls++;
      assert.equal(prompt, request.prompt);
      return {
        requestedModel: modelId,
        effectiveModel: modelId,
        provider: 'workers-ai',
        cacheStatus: 'MISS',
        inputTokens: 10,
        outputTokens: 2,
        durationMs: 25,
        output: { type: 'text', text: 'Resposta' },
      };
    };
    const params = { ...identity, executionId, index: 0 };
    await Promise.all([processAttempt(db, params, run), processAttempt(db, params, run)]);
    assert.equal(calls, 1);
    assert.equal((await attempts.doc('0').get()).get('status'), 'completed');
    assert.equal((await attempts.doc('1').get()).get('status'), 'queued');
    await processAttempt(db, { ...params, index: 1 }, async () => {
      throw new Error();
    });
    assert.equal((await attempts.doc('1').get()).get('status'), 'failed');
    const res = {
      json(value) {
        this.body = value;
      },
      sendStatus(value) {
        this.code = value;
      },
    };
    const req = { method: 'GET', path: '/api/executions/' + executionId };
    await executionApi(req, res, { uid: randomUUID() });
    assert.equal(res.code, 404);
    await executionApi(req, res, identity);
    assert.equal(res.body.attempts.length, 3);
    assert.equal(res.body.attempts[0].output.text, 'Resposta');
    assert.equal(res.body.attempts[0].costMicroUsd, 8);
    const reservation = (await base.collection('reservations').doc(executionId).get()).data();
    assert.equal(reservation.attempts[0].spentMicroUsd, 8);
    assert.equal(reservation.attempts[1].status, 'dispatched');
    const previsao = await retryGeneration(db, identity, executionId, 1);
    assert.ok(previsao.ceilingMicroUsd > reservation.attempts[1].ceilingMicroUsd);
    await assert.rejects(retryGeneration(db, identity, executionId, 0), /falha/);
    await assert.rejects(retryGeneration(db, identity, executionId, 2), /falha/);
    await assert.rejects(retryGeneration(db, identity, executionId, 1, 1), /teto mudou/);
    const retries = await Promise.all(
      [1, 2].map(() => retryGeneration(db, identity, executionId, 1, previsao.ceilingMicroUsd)),
    );
    assert.deepEqual(retries, [{ index: 3 }, { index: 3 }]);
    await processAttempt(db, { ...params, index: 3 }, run);
    await executionApi(req, res, identity);
    assert.equal(res.body.attempts.length, 4);
    assert.equal(res.body.attempts[0].output.text, 'Resposta');
    assert.equal(res.body.attempts[1].retryIndex, 3);
    assert.equal(res.body.attempts[3].modelId, modelIds[1]);
    assert.equal(res.body.attempts[3].status, 'completed');
    const retryReserve = (
      await base.collection('reservations').doc(res.body.attempts[3].reservationId).get()
    ).data();
    assert.equal(retryReserve.attempts[0].status, 'settled');
    assert.equal(retryReserve.attempts.filter((a) => a.role === 'judge').length, 3);
    assert.equal(
      (await base.collection('reservations').doc(executionId).get()).get('attempts')[1].status,
      'dispatched',
    );
    await attempts.doc('2').update({ status: 'running', startedAt: new Date() });
    await assert.rejects(retryGeneration(db, identity, executionId, 2), /falha/);
    await attempts.doc('2').update({ startedAt: new Date(Date.now() - 360000) });
    await executionApi(req, res, identity);
    assert.equal(res.body.attempts[2].status, 'failed');
    assert.ok((await retryGeneration(db, identity, executionId, 2)).ceilingMicroUsd > 0);
    // O painel visual será homologado na T15. Aqui a reserva de teste isola a persistência da mídia.
    const imageId = randomUUID();
    const imageRef = base.collection('executions').doc(imageId);
    const model = catalog.models.find((m) => m.id.endsWith('/lucid-origin'));
    const a = {
      role: 'generation',
      modelId: model.id,
      limits: { width: 512, height: 512, steps: 4 },
      ceilingMicroUsd: 7524,
    };
    await reserveBudget(db, {
      uid: identity.uid,
      executionId: imageId,
      requestHash: 'b'.repeat(64),
      plan: { ceilingMicroUsd: 7524, attempts: [a] },
      createExecution(tx) {
        tx.create(imageRef, { prompt: 'Um círculo', expiresAt: new Date(Date.now() + 60000) });
        tx.create(imageRef.collection('attempts').doc('0'), {
          ...a,
          price: model.price,
          index: 0,
          status: 'queued',
        });
      },
    });
    let saved;
    const storage = () => ({
      file: (path) => ({
        save: async (bytes) => {
          saved = { path, bytes };
        },
      }),
    });
    await processAttempt(
      db,
      { uid: identity.uid, executionId: imageId, index: 0 },
      async () => ({
        effectiveModel: null,
        provider: 'workers-ai',
        cacheStatus: 'MISS',
        inputTokens: null,
        outputTokens: null,
        durationMs: 100,
        output: { type: 'image', bytes: Buffer.from('teste'), contentType: 'image/jpeg' },
      }),
      storage,
    );
    assert.deepEqual(saved, {
      path: imageRef.path + '/attempts/0/image',
      bytes: Buffer.from('teste'),
    });
    const imageAttempt = (await imageRef.collection('attempts').doc('0').get()).data();
    assert.deepEqual(imageAttempt.output, { type: 'image', contentType: 'image/jpeg' });
    assert.equal(imageAttempt.costMicroUsd, 7524);
    await imageRef.update({ expiresAt: new Date(0) });
    await executionApi(
      { method: 'GET', path: '/api/executions/' + imageId + '/media/0' },
      res,
      identity,
    );
    assert.equal(res.code, 404);
  },
);

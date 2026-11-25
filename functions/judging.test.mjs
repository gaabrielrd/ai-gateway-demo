import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { judgeAfterGeneration, parseVerdict, verifyFields } from './judging.mjs';
import { createExecution } from './executions.mjs';
import catalog from './catalog.json' with { type: 'json' };

test('parecer exige candidato, todos os critérios, nota inteira ou não verificável e evidência', () => {
  const candidates = [{ alias: 'A', index: 4 }];
  const parse = (mark) =>
    parseVerdict(JSON.stringify({ A: { task: mark } }), candidates, [{ id: 'task' }]);
  assert.equal(parse({ score: null, reason: 'Imagem ilegível.' })[0].marks[0].score, null);
  for (const score of [-1, 5, 1.5, '3', undefined])
    assert.throws(() => parse({ score, reason: 'texto' }));
  assert.throws(() => parse({ score: 0, reason: ' ' }));
  assert.throws(() => parseVerdict('{"B":{}}', candidates, []));
  assert.throws(() => parseVerdict('{"A":{}}', candidates, [{ id: 'task' }]));
  assert.deepEqual(verifyFields('{"total":135,"data":"2026-04-15"}', '{"total":135}'), [
    { field: 'total', correct: true },
    { field: 'data', correct: false },
  ]);
  assert.equal(verifyFields('Texto sem gabarito JSON', 'abc'), null);
});

test(
  'rodada visual independente preserva pareceres válidos e contabiliza a resposta inválida',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async (t) => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(127\.0\.0\.1|localhost):\d+$/);
    const app = initializeApp({ projectId: 'demo-ai-gateway' });
    t.after(() => deleteApp(app));
    const db = getFirestore(app, 'judging-test');
    const uid = randomUUID();
    const executionId = randomUUID();
    const judges = catalog.models.filter((m) => m.acceptsImages).map((m) => m.id);
    // Usar a configuração equivalente da tarefa de imagem, sem depender de outros testes concorrentes.
    const imageModel = catalog.models.find((m) => m.imageLimits).id;
    await db.collection('judgePanels').doc('image').set({ modelIds: judges });
    await db.collection('accessRequests').doc(uid).set({ status: 'approved' });
    await createExecution(
      db,
      { uid },
      {
        task: 'image',
        prompt: 'Desenhe um círculo.',
        executionId,
        modelIds: [imageModel],
        confirmedMicroUsd: 1000000,
      },
    );
    const user = db.collection('users').doc(uid);
    const ref = user.collection('executions').doc(executionId);
    await ref
      .collection('attempts')
      .doc('0')
      .update({ status: 'completed', output: { type: 'image', contentType: 'image/png' } });
    let calls = 0;
    const run = async ({ judgeContent, modelId }) => {
      calls++;
      assert.ok(!JSON.stringify(judgeContent).includes(imageModel));
      assert.match(judgeContent[0].text, /Desenhe um círculo/);
      assert.equal(judgeContent[2].image_url.url, 'data:image/png;base64,cGl4ZWxz');
      const mark = { score: 4, reason: 'O círculo está presente.' };
      const text =
        modelId === judges[0]
          ? 'Inválido'
          : JSON.stringify({ A: { instruction: mark, completeness: mark, task: mark } });
      return {
        output: { type: 'text', text },
        effectiveModel: modelId,
        inputTokens: 100,
        outputTokens: 10,
        durationMs: 100,
        cacheStatus: 'MISS',
      };
    };
    const loadImage = async (path) => {
      assert.ok(path.endsWith('/attempts/0/image'));
      return Buffer.from('pixels');
    };
    const params = { uid, executionId, index: 0 };
    await judgeAfterGeneration(db, params, run, loadImage);
    await judgeAfterGeneration(db, params, run, loadImage);
    assert.equal(calls, 3);
    const round = ref.collection('rounds').doc(executionId);
    assert.equal((await round.get()).get('status'), 'finished');
    const reviews = (await round.collection('reviews').get()).docs.map((d) => d.data());
    assert.equal(reviews.filter((r) => r.status === 'completed').length, 2);
    assert.ok(reviews.every((r) => r.costMicroUsd > 0));
    assert.equal(reviews.find((r) => r.status === 'completed').verdict[0].marks.length, 3);
    const reservation = await user.collection('reservations').doc(executionId).get();
    assert.ok(
      reservation
        .get('attempts')
        .filter((a) => a.role === 'judge')
        .every((a) => a.status === 'settled'),
    );
  },
);

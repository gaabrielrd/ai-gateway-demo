import { listHistory, hideExecution } from './history.mjs';
import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import catalog from './catalog.json' with { type: 'json' };
import { BudgetError, attemptCost, planBudget, taskOutputs } from './budget.mjs';
import { isAdministrator } from './access.mjs';
import { reserveBudget, claimAttempt, settleAttempt } from './reservations.mjs';
import { summarizeRanking } from './ranking.mjs';
import { criteriaFor } from './panels.mjs';
import { interrupted } from './retries.mjs';
import { generate } from './gateway.mjs';

const keyPattern = /^[A-Za-z0-9_-]{1,128}$/;
export const executionPath = 'users/{uid}/executions/{executionId}/attempts/{index}';
function refFor(db, uid, id) {
  return db.collection('users').doc(uid).collection('executions').doc(id);
}

export async function createExecution(db, identity, body, now = new Date()) {
  if (
    !isAdministrator(identity) &&
    (await db.collection('accessRequests').doc(identity.uid).get()).get('status') !== 'approved'
  )
    throw new BudgetError('Acesso aprovado necessário.');
  const {
    executionId,
    task,
    prompt,
    modelIds,
    reference = '',
    criterion = '',
    confirmedMicroUsd,
  } = body ?? {};
  if (
    typeof executionId !== 'string' ||
    !keyPattern.test(executionId) ||
    typeof task !== 'string' ||
    !Object.hasOwn(taskOutputs, task) ||
    !Array.isArray(modelIds) ||
    modelIds.length > 3 ||
    !modelIds.every((id) => typeof id === 'string') ||
    !Number.isSafeInteger(confirmedMicroUsd) ||
    confirmedMicroUsd < 0 ||
    typeof prompt !== 'string' ||
    !prompt.trim() ||
    Buffer.byteLength(prompt) > 16000 ||
    (task === 'image' && [...prompt].length > 2048) ||
    ![reference, criterion].every((s) => typeof s === 'string' && Buffer.byteLength(s) <= 8000)
  )
    throw new BudgetError(
      'Pedido inválido. Confira a tarefa, os modelos, os limites de texto e o teto confirmado.',
    );
  const confirmedJudges = body.confirmedJudges;
  if (
    confirmedJudges !== undefined &&
    (!Array.isArray(confirmedJudges) ||
      confirmedJudges.length !== 3 ||
      !confirmedJudges.every((id) => typeof id === 'string'))
  )
    throw new BudgetError('Painel confirmado inválido.');
  const request = {
    task,
    prompt,
    modelIds,
    reference,
    criterion,
    confirmedMicroUsd,
    ...(confirmedJudges ? { confirmedJudges } : {}),
  };
  const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
  const ref = refFor(db, identity.uid, executionId);
  const existing = await ref.get();
  if (existing.exists) {
    if (
      existing.get('requestHash') !== requestHash ||
      existing.get('expiresAt').toMillis() <= now.getTime()
    )
      throw new BudgetError('Chave de execução indisponível.');
    return executionId;
  }
  const panel = await db.collection('judgePanels').doc(task).get();
  if (confirmedJudges && JSON.stringify(confirmedJudges) !== JSON.stringify(panel.get('modelIds')))
    throw new BudgetError('O painel mudou. Consulte novamente o orçamento.');
  const plan = planBudget({ task, modelIds }, panel.get('modelIds'));
  if (plan.ceilingMicroUsd > confirmedMicroUsd)
    throw new BudgetError('O teto mudou. Consulte novamente o orçamento.');
  await reserveBudget(
    db,
    {
      uid: identity.uid,
      executionId,
      requestHash,
      plan,
      createExecution(tx) {
        const indices = modelIds.map((_, i) => i);
        tx.create(ref.collection('rounds').doc(executionId), {
          indices,
          status: 'pending',
          revision: 0,
        });
        tx.create(ref, {
          ...request,
          activeIndices: indices,
          requestHash,
          createdAt: now,
          expiresAt: new Date(+now + 30 * 86400000),
          judges: panel.get('modelIds'),
          criteria: criteriaFor(task, criterion),
          ceilingMicroUsd: plan.ceilingMicroUsd,
        });
        plan.attempts.forEach((a, i) => {
          if (a.role === 'generation')
            tx.create(ref.collection('attempts').doc(String(i)), {
              ...a,
              index: i,
              status: 'queued',
              price: catalog.models.find((m) => m.id === a.modelId).price,
            });
        });
      },
    },
    now,
  );
  // A reserva sobrevive à exclusão e impede reaproveitar o ID de uma execução apagada.
  const saved = await ref.get();
  if (!saved.exists || saved.get('expiresAt').toMillis() <= now.getTime())
    throw new BudgetError('Chave de execução indisponível.');
  return executionId;
}

export async function processAttempt(
  db,
  { uid, executionId, index },
  run = generate,
  bucketProvider = () => getStorage().bucket(),
) {
  const ref = refFor(db, uid, executionId);
  const attemptRef = ref.collection('attempts').doc(String(index));
  const [execution, attemptSnap] = await db.getAll(ref, attemptRef);
  if (!execution.exists || !attemptSnap.exists) return;
  const attempt = attemptSnap.data();
  const reservationId = attempt.reservationId ?? executionId;
  const reservationIndex = attempt.reservationIndex ?? index;
  if (['completed', 'failed'].includes(attempt.status)) {
    if (attempt.costMicroUsd !== null)
      await settleAttempt(db, uid, reservationId, reservationIndex, attempt.costMicroUsd);
    return;
  }
  if (execution.get('expiresAt').toMillis() <= Date.now()) return;
  const claimed = await claimAttempt(db, uid, reservationId, reservationIndex, (tx) =>
    tx.update(attemptRef, { status: 'running', startedAt: new Date() }),
  );
  if (!claimed) return;
  const started = performance.now();
  let result;
  try {
    result = await run({
      modelId: attempt.modelId,
      prompt: execution.get('prompt'),
      limits: attempt.limits,
    });
  } catch {
    await attemptRef.update({
      status: 'failed',
      error: 'Falha na chamada ao gateway.',
      durationMs: Math.round(performance.now() - started),
      costMicroUsd: null,
    });
    return;
  }
  const { output, ...metrics } = result;
  const amount = attemptCost(result, attempt);
  const costMicroUsd =
    Number.isSafeInteger(amount) && amount >= 0 && amount <= attempt.ceilingMicroUsd
      ? amount
      : null;
  const outcome = {
    ...metrics,
    status: 'completed',
    costMicroUsd,
    unit: output.type === 'text' ? 'tokens' : 'tiles-and-steps',
  };
  if (output.type === 'image') {
    try {
      await bucketProvider()
        .file(attemptRef.path + '/image')
        .save(output.bytes, {
          resumable: false,
          metadata: { contentType: output.contentType, cacheControl: 'private, no-store' },
        });
      outcome.output = { type: 'image', contentType: output.contentType };
    } catch {
      outcome.status = 'failed';
      outcome.error = 'Falha ao guardar a imagem gerada.';
    }
  } else outcome.output = output;
  await attemptRef.update(outcome);
  if (costMicroUsd !== null)
    await settleAttempt(db, uid, reservationId, reservationIndex, costMicroUsd);
}

export async function executionApi(request, response, identity) {
  const db = getFirestore('cf-ai-gateway');
  if (request.method === 'POST') {
    try {
      const executionId = await createExecution(db, identity, request.body);
      return response.status(202).json({ executionId });
    } catch (error) {
      if (!(error instanceof BudgetError)) throw error;
      return response
        .status(error.message === 'Acesso aprovado necessário.' ? 403 : 400)
        .json({ error: error.message });
    }
  }
  const [, , , id, media, index] = request.path.split('/');
  if (!id) return response.json(await listHistory(db, identity.uid));
  const ref = refFor(db, identity.uid, id);
  if (request.method === 'DELETE')
    return response.sendStatus((await hideExecution(ref)) ? 204 : 404);
  const execution = await ref.get();
  if (!execution.exists || execution.get('expiresAt').toMillis() <= Date.now())
    return response.sendStatus(404);
  if (media) {
    const attempt = ref.collection('attempts').doc(index);
    const output = (await attempt.get()).get('output');
    if (output?.type !== 'image') return response.sendStatus(404);
    const [bytes] = await getStorage()
      .bucket()
      .file(attempt.path + '/image')
      .download();
    return response.type(output.contentType).send(bytes);
  }
  return response.json({
    ...(await executionSnapshot(execution)),
    canPublish: isAdministrator(identity),
  });
}

export async function executionSnapshot(execution) {
  const ref = execution.ref;
  const [attempts, rounds] = await Promise.all([
    ref.collection('attempts').orderBy('index').get(),
    ref.collection('rounds').orderBy('revision', 'desc').limit(1).get(),
  ]);
  const round = rounds.docs[0];
  const evaluation = round
    ? {
        ...round.data(),
        reviews: (await round.ref.collection('reviews').get()).docs.map((d) => d.data()),
      }
    : null;
  const { requestHash: _hash, ...record } = execution.data();
  const criteria = record.criteria ?? criteriaFor(record.task, record.criterion);
  if (evaluation)
    evaluation.ranking = summarizeRanking({
      attempts: attempts.docs.map((d) => d.data()),
      indices: evaluation.indices,
      judges: record.judges,
      criteria,
      reviews: evaluation.reviews,
      finished: evaluation.status === 'finished',
    });
  return {
    ...record,
    criteria,
    evaluation,
    executionId: ref.id,
    createdAt: record.createdAt.toDate().toISOString(),
    expiresAt: record.expiresAt.toDate().toISOString(),
    attempts: attempts.docs.map((d) => {
      const a = d.data();
      return interrupted(a)
        ? { ...a, status: 'failed', error: 'Execução interrompida. Custo em reconciliação.' }
        : a;
    }),
  };
}

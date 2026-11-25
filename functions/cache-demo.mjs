import { fallbackModel, fallbackPrompt, fallbackPlan } from './fallback-demo.mjs';
import { createHash } from 'node:crypto';
import { isAdministrator } from './access.mjs';
import { BudgetError, attemptCost, availableBudget, billingMonth, planBudget } from './budget.mjs';
import { claimAttempt, monthlyBudgetRef, reserveBudget, settleAttempt } from './reservations.mjs';
import { generate } from './gateway.mjs';

const modelId = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const prompt = 'Em uma frase em português, descreva o que um cache faz.';
const cacheTtl = 300;

export async function demoApi(db, req, res, identity) {
  const uid = identity.uid;
  const kind = req.path.split('/')[3];
  const fallback = kind === 'fallback';
  const runs = db
    .collection('users')
    .doc(uid)
    .collection(kind + 'Demos');
  if (
    !isAdministrator(identity) &&
    (await db.collection('accessRequests').doc(uid).get()).get('status') !== 'approved'
  )
    return res.status(403).json({ error: 'Acesso aprovado necessário.' });
  const id = req.path.split('/')[4];
  if (id) {
    const saved = await runs.doc(id).get();
    if (!saved.exists) return res.sendStatus(404);
    if (fallback)
      return res.json({ rows: {}, ...saved.get('outcome'), finished: saved.get('finished') });
    return res.json({ rows: saved.get('rows'), finished: saved.get('finished') });
  }
  const plan = fallback
    ? fallbackPlan()
    : planBudget({ kind: 'cache', task: 'summary', modelIds: [modelId] });
  if (req.method === 'GET') {
    const balance = await monthlyBudgetRef(db, uid, billingMonth()).get();
    return res.json({
      prompt: fallback ? fallbackPrompt : prompt,
      modelId: fallback ? fallbackModel : modelId,
      ceilingMicroUsd: plan.ceilingMicroUsd,
      availableMicroUsd: availableBudget(balance.data()),
    });
  }
  const { runId, confirmedMicroUsd } = req.body ?? {};
  if (
    typeof runId !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(runId) ||
    confirmedMicroUsd !== plan.ceilingMicroUsd
  )
    return res.status(400).json({ error: 'Consulte e confirme o teto atual.' });
  const reservationId = kind + '.' + runId;
  try {
    await reserveBudget(db, {
      uid,
      executionId: reservationId,
      plan,
      requestHash: createHash('sha256')
        .update(JSON.stringify([modelId, prompt, cacheTtl, plan]))
        .digest('hex'),
      createExecution(tx) {
        tx.create(
          runs.doc(runId),
          fallback ? { finished: false } : { prompt, cacheTtl, rows: {}, finished: false },
        );
      },
    });
  } catch (e) {
    if (!(e instanceof BudgetError)) throw e;
    return res.status(409).json({ error: e.message });
  }
  return res.status(202).json({ runId });
}

export async function runCacheDemo(db, { uid, runId }, run = generate) {
  const user = db.collection('users').doc(uid);
  const ref = user.collection('cacheDemos').doc(runId);
  const reservationId = 'cache.' + runId;
  const [demo, reservation] = await db.getAll(
    ref,
    user.collection('reservations').doc(reservationId),
  );
  if (!demo.exists || demo.get('finished')) return;
  const attempts = reservation.get('attempts');
  for (const [index, attempt] of attempts.entries()) {
    const path = 'rows.' + index;
    let row = (await ref.get()).get(path);
    if (!row) {
      const startedAt = new Date();
      const claimed = await claimAttempt(db, uid, reservationId, index, (tx) =>
        tx.update(ref, { [path]: { status: 'running', startedAt } }),
      );
      if (!claimed) throw new Error('Tentativa já despachada. Aguardar o resultado.');
      const start = performance.now();
      try {
        const result = await run({
          modelId: attempt.modelId,
          prompt: demo.get('prompt'),
          cacheTtl: demo.get('cacheTtl'),
          collectLog: true,
          limits: attempt.limits,
        });
        const { cacheStatus, durationMs, inputTokens, outputTokens, logId, effectiveModel } =
          result;
        const cost = ['MISS', 'HIT'].includes(cacheStatus) ? attemptCost(result, attempt) : null;
        row = {
          status: 'completed',
          cacheStatus,
          durationMs,
          inputTokens,
          outputTokens,
          logId,
          effectiveModel,
          costMicroUsd:
            Number.isSafeInteger(cost) && cost >= 0 && cost <= attempt.ceilingMicroUsd
              ? cost
              : null,
        };
      } catch {
        row = {
          status: 'failed',
          durationMs: Math.round(performance.now() - start),
          costMicroUsd: null,
        };
      }
      await ref.update({ [path]: row });
    } else if (row.status === 'running') {
      if (Date.now() - row.startedAt.toMillis() < 300000)
        throw new Error('Tentativa em processamento.');
      row = { status: 'failed', durationMs: null, costMicroUsd: null };
      await ref.update({ [path]: row });
    }
    if (row.costMicroUsd != null)
      await settleAttempt(db, uid, reservationId, index, row.costMicroUsd);
  }
  await ref.update({ finished: true });
}

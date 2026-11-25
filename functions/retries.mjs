import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { BudgetError, availableBudget, billingMonth, planBudget } from './budget.mjs';
import { monthlyBudgetRef, reserveBudget } from './reservations.mjs';
import { isAdministrator } from './access.mjs';
import catalog from './catalog.json' with { type: 'json' };

export function interrupted(attempt, now = Date.now()) {
  // O trabalhador tem timeout de 180 segundos. A margem também cobre atraso na gravação.
  return attempt.status === 'running' && attempt.startedAt?.toMillis() < now - 300000;
}

function retryable(attempt) {
  return (
    attempt &&
    attempt.retryIndex === undefined &&
    (attempt.status === 'failed' || interrupted(attempt))
  );
}

export async function retryGeneration(db, identity, executionId, index, confirmation) {
  if (
    !isAdministrator(identity) &&
    (await db.collection('accessRequests').doc(identity.uid).get()).get('status') !== 'approved'
  )
    throw new BudgetError('Acesso aprovado necessário.');
  const user = db.collection('users').doc(identity.uid);
  const execution = user.collection('executions').doc(executionId);
  const source = execution.collection('attempts').doc(String(index));
  const [record, original] = await db.getAll(execution, source);
  if (!record.exists || record.get('expiresAt').toMillis() <= Date.now() || !original.exists)
    throw new BudgetError('Execução ou tentativa indisponível.');
  const attempt = original.data();
  const hash = createHash('sha256')
    .update(JSON.stringify([executionId, index]))
    .digest('hex');
  // O prefixo com ponto usa um espaço de chaves reservado, fora dos IDs públicos.
  const reservationId = 'retry.' + hash;
  if (confirmation !== undefined && (!Number.isSafeInteger(confirmation) || confirmation < 0))
    throw new BudgetError('Teto confirmado inválido.');
  if (confirmation !== undefined && attempt.retryIndex !== undefined)
    return { index: attempt.retryIndex };
  if (!retryable(attempt))
    throw new BudgetError('Somente uma tentativa com falha pode ser repetida.');
  const plan = planBudget(
    { task: record.get('task'), kind: 'retry', modelIds: [attempt.modelId] },
    record.get('judges'),
  );
  if (confirmation === undefined) {
    const balance = await monthlyBudgetRef(db, identity.uid, billingMonth()).get();
    const availableMicroUsd = availableBudget(balance.data());
    return {
      availableMicroUsd,
      ceilingMicroUsd: plan.ceilingMicroUsd,
      reason:
        plan.ceilingMicroUsd > availableMicroUsd
          ? 'Saldo insuficiente para repetir e reavaliar.'
          : null,
    };
  }
  if (plan.ceilingMicroUsd > confirmation)
    throw new BudgetError('O teto mudou. Consulte novamente o orçamento.');
  await reserveBudget(db, {
    uid: identity.uid,
    executionId: reservationId,
    requestHash: hash,
    plan,
    async prepare(tx) {
      const [current, failed] = await tx.getAll(execution, source);
      if (
        !current.exists ||
        current.get('expiresAt').toMillis() <= Date.now() ||
        !retryable(failed.data())
      )
        throw new BudgetError('Tentativa indisponível.');
      return current.get('nextAttemptIndex') ?? current.get('modelIds').length;
    },
    createExecution(tx, _reservation, nextIndex) {
      const generation = plan.attempts[0];
      tx.update(execution, { nextAttemptIndex: nextIndex + 1 });
      tx.update(source, {
        retryIndex: nextIndex,
        status: 'failed',
        costMicroUsd: attempt.costMicroUsd ?? null,
      });
      tx.create(execution.collection('attempts').doc(String(nextIndex)), {
        ...generation,
        index: nextIndex,
        retryOf: index,
        reservationId,
        reservationIndex: 0,
        status: 'queued',
        price: catalog.models.find((m) => m.id === attempt.modelId).price,
      });
    },
  });
  return { index: (await source.get()).get('retryIndex') };
}

export async function retryApi(request, response, identity) {
  const [, , , id, , index, action] = request.path.split('/');
  try {
    const confirmation = action === 'quote' ? undefined : request.body?.confirmedMicroUsd;
    if (action !== 'quote' && confirmation === undefined)
      throw new BudgetError('Confirme o novo teto.');
    const result = await retryGeneration(
      getFirestore('cf-ai-gateway'),
      identity,
      id,
      Number(index),
      confirmation,
    );
    return response.status(action === 'quote' ? 200 : 202).json(result);
  } catch (e) {
    if (!(e instanceof BudgetError)) throw e;
    return response
      .status(e.message === 'Acesso aprovado necessário.' ? 403 : 400)
      .json({ error: e.message });
  }
}

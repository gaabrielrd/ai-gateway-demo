import { availableBudget, billingMonth, BudgetError } from './budget.mjs';

function operationRef(db, uid, executionId) {
  if (typeof executionId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(executionId))
    throw new BudgetError('Identificador de execução inválido.');
  return db.collection('users').doc(uid).collection('reservations').doc(executionId);
}

export function monthlyBudgetRef(db, uid, month) {
  return db.collection('users').doc(uid).collection('budgets').doc(month);
}

function validAmount(n) {
  return Number.isSafeInteger(n) && n >= 0;
}

// O chamador fornece o plano calculado nas Functions e o hash do pedido original.
export async function reserveBudget(db, { uid, executionId, requestHash, plan }, now = new Date()) {
  const operation = operationRef(db, uid, executionId);
  if (typeof requestHash !== 'string' || !/^[a-f0-9]{64}$/.test(requestHash))
    throw new BudgetError('Identificação do pedido inválida.');
  const month = billingMonth(now);
  return db.runTransaction(async (tx) => {
    const prior = (await tx.get(operation)).data();
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new BudgetError('Chave já usada para outro pedido.');
      return prior;
    }
    if (
      !plan ||
      !Array.isArray(plan.attempts) ||
      !plan.attempts.length ||
      !plan.attempts.every((a) => validAmount(a.ceilingMicroUsd)) ||
      !validAmount(plan.ceilingMicroUsd) ||
      plan.ceilingMicroUsd !== plan.attempts.reduce((sum, a) => sum + a.ceilingMicroUsd, 0)
    )
      throw new BudgetError('Plano de reserva inválido.');
    const ref = monthlyBudgetRef(db, uid, month);
    const balance = (await tx.get(ref)).data() ?? { spentMicroUsd: 0, reservedMicroUsd: 0 };
    if (availableBudget(balance) < plan.ceilingMicroUsd)
      throw new BudgetError('Saldo insuficiente.');
    const reservation = {
      executionId,
      requestHash,
      month,
      ceilingMicroUsd: plan.ceilingMicroUsd,
      attempts: plan.attempts.map((a) => ({ ...a, status: 'reserved' })),
      status: 'reserved',
    };
    tx.set(ref, { ...balance, reservedMicroUsd: balance.reservedMicroUsd + plan.ceilingMicroUsd });
    tx.create(operation, reservation);
    return reservation;
  });
}

// Somente quem recebe true pode despachar a tentativa. Um timeout no provedor mantém a reserva.
export async function claimAttempt(db, uid, executionId, index) {
  const ref = operationRef(db, uid, executionId);
  return db.runTransaction(async (tx) => {
    const reservation = (await tx.get(ref)).data();
    const attempt = getAttempt(reservation, index);
    if (attempt.status !== 'reserved') return false;
    attempt.status = 'dispatched';
    tx.update(ref, { attempts: reservation.attempts, status: 'pending' });
    return true;
  });
}

function getAttempt(reservation, index) {
  if (!Number.isInteger(index) || index < 0 || !reservation?.attempts[index])
    throw new BudgetError('Tentativa desconhecida.');
  return reservation.attempts[index];
}

// Liquidar com zero uma tentativa reservada permite cancelar trabalho comprovadamente não enviado.
export async function settleAttempt(db, uid, executionId, index, spentMicroUsd) {
  if (!validAmount(spentMicroUsd)) throw new BudgetError('Gasto apurado inválido.');
  const operation = operationRef(db, uid, executionId);
  return db.runTransaction(async (tx) => {
    const reservation = (await tx.get(operation)).data();
    const attempt = getAttempt(reservation, index);
    if (attempt.status === 'settled') {
      if (attempt.spentMicroUsd !== spentMicroUsd)
        throw new BudgetError('Tentativa já liquidada com outro valor.');
      return reservation;
    }
    if (
      spentMicroUsd > attempt.ceilingMicroUsd ||
      (attempt.status === 'reserved' && spentMicroUsd !== 0)
    )
      throw new BudgetError('Gasto incompatível com a reserva.');
    const ref = monthlyBudgetRef(db, uid, reservation.month);
    const balance = (await tx.get(ref)).data();
    if (
      !balance ||
      !validAmount(balance.spentMicroUsd) ||
      !validAmount(balance.reservedMicroUsd) ||
      balance.reservedMicroUsd < attempt.ceilingMicroUsd
    )
      throw new BudgetError('Saldo inconsistente.');
    Object.assign(attempt, { status: 'settled', spentMicroUsd });
    reservation.status = reservation.attempts.every((a) => a.status === 'settled')
      ? 'settled'
      : 'pending';
    tx.update(ref, {
      reservedMicroUsd: balance.reservedMicroUsd - attempt.ceilingMicroUsd,
      spentMicroUsd: balance.spentMicroUsd + spentMicroUsd,
    });
    tx.update(operation, { attempts: reservation.attempts, status: reservation.status });
    return reservation;
  });
}

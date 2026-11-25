import { getFirestore } from 'firebase-admin/firestore';
import { criteriaFor } from './panels.mjs';
import { monthlyBudgetRef } from './reservations.mjs';
import { isAdministrator } from './access.mjs';
import { availableBudget, billingMonth, BudgetError, planBudget, taskOutputs } from './budget.mjs';

export async function quoteBudget(request, response, identity) {
  const db = getFirestore('cf-ai-gateway');
  if (
    !isAdministrator(identity) &&
    (await db.collection('accessRequests').doc(identity.uid).get()).get('status') !== 'approved'
  )
    return response
      .status(403)
      .json({ error: 'É preciso ter acesso aprovado para consultar o orçamento.' });
  const { task, modelIds } = request.body ?? {};
  if (typeof task !== 'string' || !Object.hasOwn(taskOutputs, task))
    return response.status(400).json({ error: 'Tarefa inválida.' });
  const month = billingMonth();
  const [budget, panel] = await db.getAll(
    monthlyBudgetRef(db, identity.uid, month),
    db.collection('judgePanels').doc(task),
  );
  const availableMicroUsd = availableBudget(budget.data());
  try {
    const plan = planBudget({ task, modelIds }, panel.get('modelIds'));
    return response.json({
      month,
      availableMicroUsd,
      ...plan,
      judges: panel.get('modelIds'),
      criteria: criteriaFor(task),
      reason:
        plan.ceilingMicroUsd > availableMicroUsd ? 'Saldo insuficiente para esta execução.' : null,
    });
  } catch (error) {
    if (!(error instanceof BudgetError)) throw error;
    return response.json({
      month,
      availableMicroUsd,
      ceilingMicroUsd: null,
      reason: error.message,
    });
  }
}

import { getFirestore } from 'firebase-admin/firestore';
import { isAdministrator } from './access.mjs';
import { compatibleJudge, taskOutputs } from './budget.mjs';
import catalog from './catalog.json' with { type: 'json' };

const specific = {
  summary: 'Fidelidade aos fatos do texto de origem',
  extraction: 'Exatidão dos campos extraídos',
  image: 'Correspondência visual com os elementos do briefing',
};
export function criteriaFor(task, custom = '') {
  const criteria = [
    { id: 'instruction', label: 'Cumprimento do pedido' },
    { id: 'completeness', label: 'Completude' },
    { id: 'task', label: specific[task] },
  ];
  if (custom.trim()) criteria.push({ id: 'custom', label: custom.trim() });
  return criteria;
}
function options(task) {
  return catalog.models.filter((model) => compatibleJudge(model, task)).map((model) => model.id);
}
export async function panelsApi(request, response, identity) {
  if (!isAdministrator(identity))
    return response.status(403).json({ error: 'Acesso administrativo necessário.' });
  const panels = getFirestore('cf-ai-gateway').collection('judgePanels');
  if (request.method === 'GET') {
    const docs = await panels.get();
    return response.json({
      panels: Object.keys(taskOutputs).map((task) => ({
        task,
        options: options(task),
        modelIds: docs.docs.find((d) => d.id === task)?.get('modelIds') ?? [],
        criteria: criteriaFor(task),
      })),
    });
  }
  const { task, modelIds } = request.body ?? {};
  if (
    typeof task !== 'string' ||
    !Object.hasOwn(taskOutputs, task) ||
    !Array.isArray(modelIds) ||
    modelIds.length !== 3 ||
    new Set(modelIds).size !== 3 ||
    !modelIds.every((id) => options(task).includes(id))
  )
    return response
      .status(400)
      .json({ error: 'Selecione três versões diferentes e compatíveis com a tarefa.' });
  await panels.doc(task).set({ modelIds, updatedBy: identity.uid, updatedAt: new Date() });
  return response.json({ task, modelIds });
}

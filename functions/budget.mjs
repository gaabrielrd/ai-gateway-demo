import catalog from './catalog.json' with { type: 'json' };

export const MONTHLY_MICRO_USD = 5_000_000;
export const taskOutputs = Object.freeze({ summary: 'text', extraction: 'text', image: 'image' });

// A janela publicada limita toda a entrada, incluindo a serialização de mensagens e o painel.
const contextTokens = new Map([
  ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', 24000],
  ['@cf/mistralai/mistral-small-3.1-24b-instruct', 128000],
  ['@cf/qwen/qwen2.5-coder-32b-instruct', 32768],
]);

export class BudgetError extends Error {}

export function billingMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return ['year', 'month'].map((type) => parts.find((part) => part.type === type).value).join('-');
}

export function availableBudget(account) {
  if (account === undefined) return MONTHLY_MICRO_USD;
  const { spentMicroUsd, reservedMicroUsd } = account;
  if (![spentMicroUsd, reservedMicroUsd].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new BudgetError('Saldo mensal indisponível.');
  return Math.max(0, MONTHLY_MICRO_USD - spentMicroUsd - reservedMicroUsd);
}

function rate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new BudgetError('Preço desconhecido para uma das tentativas.');
  return value;
}

export function priceAttempt(model, role, limits) {
  const price = model.price ?? {};
  let cost;
  if (model.output === 'image') {
    const { width, height, steps } = limits;
    if (![width, height, steps].every((value) => Number.isSafeInteger(value) && value > 0))
      throw new BudgetError('Dimensões ou passos sem limite verificado.');
    cost =
      1e6 *
      (Math.ceil(width / 512) * Math.ceil(height / 512) * rate(price.per512x512Tile) +
        steps * rate(price.perStep));
  } else {
    const { inputTokens, outputTokens } = limits;
    if (![inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value > 0))
      throw new BudgetError('Limites de tokens indisponíveis.');
    cost =
      inputTokens * rate(price.perMillionInputTokens) +
      outputTokens * rate(price.perMillionOutputTokens);
  }
  const ceilingMicroUsd = Math.ceil(cost);
  if (!Number.isSafeInteger(ceilingMicroUsd)) throw new BudgetError('Teto inválido.');
  return { modelId: model.id, role, limits, ceilingMicroUsd };
}

export function planBudget(
  { task, modelIds, kind = 'comparison' },
  judges = [],
  models = catalog.models,
) {
  if (
    typeof task !== 'string' ||
    !Object.hasOwn(taskOutputs, task) ||
    !['comparison', 'retry', 'cache', 'fallback'].includes(kind)
  )
    throw new BudgetError('Operação desconhecida.');
  const compatible = models.filter((m) => m.input === 'text' && m.output === taskOutputs[task]);
  const demo = ['cache', 'fallback'].includes(kind);
  const required = { comparison: Math.min(3, compatible.length), retry: 1, cache: 1, fallback: 2 }[
    kind
  ];
  if (
    !Array.isArray(modelIds) ||
    !required ||
    modelIds.length !== required ||
    new Set(modelIds).size !== required ||
    !modelIds.every((id) => compatible.some((m) => m.id === id))
  )
    throw new BudgetError('Seleção de modelos incompatível com a tarefa.');
  if (demo && taskOutputs[task] !== 'text')
    throw new BudgetError('A demonstração requer modelos de texto.');
  if (!demo && (!Array.isArray(judges) || judges.length !== 3 || new Set(judges).size !== 3))
    throw new BudgetError('O administrador precisa configurar três juízes para a tarefa.');
  function attempt(id, role) {
    const model = models.find((m) => m.id === id);
    if (
      !model ||
      (role === 'judge' && (model.output !== 'text' || (task === 'image' && !model.acceptsImages)))
    )
      throw new BudgetError('Juiz incompatível com a tarefa.');
    const limits =
      model.output === 'image'
        ? (model.imageLimits ?? {})
        : {
            inputTokens: contextTokens.get(id),
            outputTokens: role === 'judge' ? 1024 : 512,
          };
    return priceAttempt(model, role, limits);
  }
  const generations = kind === 'cache' ? [...modelIds, ...modelIds] : modelIds;
  const attempts = generations.map((id) => attempt(id, 'generation'));
  if (!demo) attempts.push(...judges.map((id) => attempt(id, 'judge')));
  return {
    attempts,
    ceilingMicroUsd: attempts.reduce((sum, call) => sum + call.ceilingMicroUsd, 0),
  };
}

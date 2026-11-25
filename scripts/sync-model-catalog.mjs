import { readFile, writeFile, rename } from 'node:fs/promises';
const verified = JSON.parse(
  await readFile(new URL('../functions/workers-models.json', import.meta.url), 'utf8'),
);

const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!/^[a-f0-9]{32}$/.test(account) || !token)
  throw Error('Configure a conta e o token Cloudflare.');

async function list(path) {
  const rows = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/${path}?page=${page}&per_page=100`,
      {
        headers: { Authorization: 'Bearer ' + token },
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok) throw Error('Falha ao listar modelos: HTTP ' + response.status);
    const { success, result, result_info: info } = await response.json();
    if (!success || !Array.isArray(result) || info?.page !== page) throw Error('Página inválida.');
    rows.push(...result);
    if (!result.length || page * info.per_page >= info.total_count) break;
  }
  if (!rows.length) throw Error('Catálogo vazio.');
  return rows;
}

function normalize(id, provider, task, createdAt, context, inputRate, outputRate, chat) {
  const output = task === 'Text Generation' ? 'text' : task === 'Text-to-Image' ? 'image' : task;
  const priced = [inputRate, outputRate].every((rate) => Number.isFinite(rate) && rate >= 0);
  const enabled =
    chat && output === 'text' && priced && Number.isSafeInteger(context) && context > 0;
  return {
    id,
    provider,
    input: ['text', 'image'].includes(output) ? 'text' : 'other',
    output,
    createdAt: createdAt ?? '',
    price: priced ? { perMillionInputTokens: inputRate, perMillionOutputTokens: outputRate } : {},
    ...(enabled
      ? { contextTokens: context }
      : { budgetRestriction: 'Formato de execução ou teto de custo ainda sem suporte.' }),
  };
}

const overrides = new Map(verified.models.map((m) => [m.id, m]));
const models = new Map();
for (const m of await list('models/search')) {
  const props = Object.fromEntries(m.properties.map((p) => [p.property_id, p.value]));
  const rates = Array.isArray(props.price) ? props.price : [];
  const price = (unit) => rates.find((p) => p.unit === unit && p.currency === 'USD')?.price;
  const model = normalize(
    m.name,
    'workers-ai',
    m.task.name,
    m.created_at,
    Number(props.context_window),
    price('per M input tokens'),
    price('per M output tokens'),
    true,
  );
  models.set(
    m.name,
    overrides.has(m.name) ? { ...overrides.get(m.name), createdAt: model.createdAt } : model,
  );
}
for (const m of await list('catalog/models')) {
  if (models.has(m.model_id)) continue;
  const rates =
    m.model_providers?.flatMap((p) => (p.rates ?? []).flatMap((t) => t.rates ?? [])) ?? [];
  function maxRate(key) {
    const prices = rates
      .filter((r) => (r.key === key || r.key?.endsWith('_' + key)) && r.unit === 'per_1m_tokens')
      .map((r) => r.value);
    return prices.length ? Math.max(...prices) : undefined;
  }
  const tokenOnly =
    m.model_providers?.every((p) => p.rates?.length) &&
    rates.length > 0 &&
    rates.every((r) => r.unit === 'per_1m_tokens' && Number.isFinite(r.value) && r.value >= 0);
  models.set(
    m.model_id,
    normalize(
      m.model_id,
      m.provider_id ?? m.model_id.split('/')[0],
      m.task,
      m.created_at,
      m.context_length,
      maxRate('input_tokens'),
      maxRate('output_tokens'),
      tokenOnly && m.request_formats?.includes('chat-completions'),
    ),
  );
}
const file = new URL('../functions/catalog.json', import.meta.url);
const temporary = new URL(file.href + '.' + process.pid);
await writeFile(
  temporary,
  JSON.stringify(
    {
      ...verified,
      verifiedOn: new Date().toISOString().slice(0, 10),
      priceSource: 'https://developers.cloudflare.com/ai/models/',
      models: [
        ...verified.models.map((m) => models.get(m.id)).filter(Boolean),
        ...[...models.values()].filter((m) => !overrides.has(m.id)),
      ],
    },
    null,
    2,
  ) + '\n',
);
await rename(temporary, file);
console.log(models.size + ' modelos no catálogo.');

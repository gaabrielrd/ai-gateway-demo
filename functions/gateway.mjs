import catalog from './catalog.json' with { type: 'json' };

function tokens(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// Credenciais e parâmetros de conexão são fornecidos somente pelo servidor.
export async function generate(
  { modelId, prompt, limits, cacheTtl },
  {
    accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId = process.env.CLOUDFLARE_GATEWAY_ID,
    token = process.env.CLOUDFLARE_API_TOKEN,
    fetchImpl = fetch,
    models = catalog.models,
  } = {},
) {
  if (!/^[a-f0-9]{32}$/.test(accountId) || !gatewayId || !token)
    throw new Error('Gateway sem configuração.');
  const model = models.find((m) => m.id === modelId);
  if (!model || typeof prompt !== 'string' || !prompt.trim())
    throw new Error('Modelo ou prompt inválido.');
  const image = model.output === 'image';
  const headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    'cf-aig-gateway-id': gatewayId,
    'cf-aig-max-attempts': '1',
    'cf-aig-collect-log-payload': 'false',
    ...(cacheTtl ? { 'cf-aig-cache-ttl': String(cacheTtl) } : { 'cf-aig-skip-cache': 'true' }),
  };
  let body;
  if (image) {
    if (
      !Number.isInteger(limits.steps) ||
      limits.steps < 1 ||
      limits.steps > 8 ||
      [...prompt].length > 2048
    )
      throw new Error('Limites de imagem inválidos.');
    body = { prompt, steps: limits.steps };
    if (model.imageLimits) {
      if (
        limits.width !== model.imageLimits.width ||
        limits.height !== model.imageLimits.height ||
        limits.steps > model.imageLimits.steps
      )
        throw new Error('Dimensões ou passos incompatíveis com a reserva.');
      Object.assign(body, { width: limits.width, height: limits.height });
    }
  } else {
    if (
      !Number.isInteger(limits.outputTokens) ||
      limits.outputTokens < 1 ||
      limits.outputTokens > 1024
    )
      throw new Error('Limite de saída inválido.');
    body = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: limits.outputTokens,
    };
  }
  const path = image ? '/run/' + modelId : '/v1/chat/completions';
  const start = performance.now();
  const response = await fetchImpl(
    'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai' + path,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
      redirect: 'error',
    },
  );
  if (!response.ok) throw new Error('Gateway respondeu HTTP ' + response.status + '.');
  const data = await response.json();
  const durationMs = Math.round(performance.now() - start);
  let output;
  if (image) {
    const encoded = data.result?.image;
    if (typeof encoded !== 'string' || !encoded.length || !/^[A-Za-z0-9+/]+=*$/.test(encoded))
      throw new Error('Imagem incompleta no gateway.');
    const bytes = Buffer.from(encoded, 'base64');
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    if (!jpeg && !png) throw new Error('Formato de imagem desconhecido.');
    output = { type: 'image', contentType: jpeg ? 'image/jpeg' : 'image/png', bytes };
  } else {
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('Resposta de texto incompleta.');
    output = { type: 'text', text };
  }
  return {
    requestedModel: modelId,
    effectiveModel: typeof data.model === 'string' ? data.model : null,
    provider: model.provider,
    durationMs,
    cacheStatus: response.headers.get('cf-aig-cache-status'),
    logId: response.headers.get('cf-aig-log-id'),
    inputTokens: tokens(data.usage?.prompt_tokens),
    outputTokens: tokens(data.usage?.completion_tokens),
    output,
  };
}

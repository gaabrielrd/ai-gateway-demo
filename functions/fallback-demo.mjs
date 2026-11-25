import catalog from './catalog.json' with { type: 'json' };
import { attemptCost, priceAttempt } from './budget.mjs';
import { claimAttempt, settleAttempt } from './reservations.mjs';

export const fallbackModel = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const fallbackPrompt = 'Explique fallback em uma frase.';
const primary = '@cf/demo/unavailable';
const route = 'dynamic/demo_fallback';
export function fallbackPlan() {
  const model = catalog.models.find((m) => m.id === fallbackModel);
  const attempt = priceAttempt(model, 'generation', {
    inputTokens: model.contextTokens,
    outputTokens: 64,
  });
  return { attempts: [attempt], ceilingMicroUsd: attempt.ceilingMicroUsd };
}

export async function requestFallback(attempt, fetchImpl = fetch) {
  const start = performance.now();
  const res = await fetchImpl(
    'https://api.cloudflare.com/client/v4/accounts/' +
      process.env.CLOUDFLARE_ACCOUNT_ID +
      '/ai/v1/chat/completions',
    {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(90000),
      headers: {
        Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
        'Content-Type': 'application/json',
        'cf-aig-gateway-id': process.env.CLOUDFLARE_GATEWAY_ID,
        'cf-aig-skip-cache': 'true',
        'cf-aig-max-attempts': '1',
        'cf-aig-collect-log-payload': 'false',
        'cf-aig-metadata': JSON.stringify({ demoPrimary: 'workers-ai/' + primary }),
      },
      body: JSON.stringify({
        model: route,
        messages: [{ role: 'user', content: fallbackPrompt }],
        max_tokens: attempt.limits.outputTokens,
      }),
    },
  );
  const data = await res.json().catch(() => null);
  const durationMs = Math.round(performance.now() - start);
  const trace = {
    durationMs,
    httpStatus: res.status,
    logId: res.headers.get('cf-aig-log-id'),
    finalModel: null,
    costMicroUsd: null,
  };
  if (!res.ok || !data?.choices?.[0]?.message?.content)
    return {
      ...trace,
      rows: {},
      error:
        'A rota não entregou uma resposta. HTTP ' +
        res.status +
        '. Etapas individuais não informadas.',
    };
  if (data.model !== fallbackModel)
    return {
      ...trace,
      rows: {},
      error: 'A rota retornou uma versão diferente da configurada.',
      finalModel: typeof data.model === 'string' ? data.model : null,
    };
  const usage = data.usage ?? {};
  const count = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : null);
  const metrics = {
    inputTokens: count(usage.prompt_tokens),
    outputTokens: count(usage.completion_tokens),
    effectiveModel: data.model,
    output: { type: 'text' },
  };
  const amount = attemptCost(metrics, attempt);
  const costMicroUsd =
    Number.isSafeInteger(amount) && amount >= 0 && amount <= attempt.ceilingMicroUsd
      ? amount
      : null;
  return {
    ...trace,
    finalModel: data.model,
    costMicroUsd,
    rows: {
      0: {
        modelId: primary,
        status: 'failed',
        error:
          'Destino indisponível preparado para a demonstração. O gateway seguiu para o fallback.',
      },
      1: {
        modelId: data.model,
        status: 'completed',
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        costMicroUsd,
      },
    },
  };
}

export async function runFallbackDemo(db, { uid, runId }, run = requestFallback) {
  const user = db.collection('users').doc(uid),
    ref = user.collection('fallbackDemos').doc(runId);
  const operation = 'fallback.' + runId;
  const [doc, reservation] = await db.getAll(ref, user.collection('reservations').doc(operation));
  if (!doc.exists || doc.get('finished')) return;
  let outcome = doc.get('outcome');
  if (!outcome) {
    const claimed = await claimAttempt(db, uid, operation, 0, (tx) =>
      tx.update(ref, { startedAt: new Date() }),
    );
    if (claimed) {
      try {
        outcome = await run(reservation.get('attempts')[0]);
      } catch {
        outcome = {
          rows: {},
          costMicroUsd: null,
          finalModel: null,
          error: 'Sem resposta confirmada do gateway.',
        };
      }
    } else {
      if (!doc.get('startedAt') || Date.now() - doc.get('startedAt').toMillis() < 180000)
        throw new Error('Rota em andamento.');
      outcome = {
        rows: {},
        costMicroUsd: null,
        finalModel: null,
        error: 'A execução foi interrompida.',
      };
    }
    await ref.update({ outcome });
  }
  if (outcome.costMicroUsd != null)
    await settleAttempt(db, uid, operation, 0, outcome.costMicroUsd);
  await ref.update({ finished: true });
}

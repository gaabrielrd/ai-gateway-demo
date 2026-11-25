import { test, expect, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  const { createServer } = await import('vite');
  server = await createServer({
    server: { host: '127.0.0.1', port: 0, hmr: false },
    logLevel: 'error',
  });
  await server.listen();
  origin = server.resolvedUrls!.local[0];
});
test.afterAll(async () => {
  await server?.close();
});

async function login(page: Page, uid: string) {
  // A substituição é feita pelo navegador do teste, no limite do SDK Firebase.
  await page.route('**/services/firebaseSession.ts*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
    let session=null;
    export async function enterWithGoogle(){return session={accessToken:'e2e',subject:${JSON.stringify(uid)},scope:[],expiresAt:Date.now()+3600000};}
    export async function currentFirebaseSession(){return session;}
    export async function leaveFirebaseSession(){session=null;}
  `,
    }),
  );
  await page.goto(origin + 'acesso');
  await page.getByRole('button', { name: 'Entrar com Google' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}
test('solicitante envia pedido e acompanha a aprovação decidida em outra sessão', async ({
  browser,
  page,
}) => {
  const admin = await browser.newPage();
  let status = 'none';
  const email = 'autora@example.test';
  await page.route('**/api/access', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ reason: '' });
      status = 'pending';
    }
    await route.fulfill({ json: { status } });
  });
  await page.route('**/api/admin/access', (r) => r.fulfill({ status: 403, json: {} }));
  await admin.route('**/api/access', (r) => r.fulfill({ json: { status: 'approved' } }));
  await admin.route('**/api/admin/access', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ id: 'autora', decision: 'approved' });
      status = 'approved';
      await route.fulfill({ json: { status } });
      return;
    }
    await route.fulfill({
      json: { requests: status === 'pending' ? [{ id: 'autora', email, reason: '' }] : [] },
    });
  });
  await login(page, 'autora');
  await page.getByRole('button', { name: 'Solicitar acesso' }).click();
  await expect(page.getByText('Pendente', { exact: true })).toBeVisible();
  await login(admin, 'admin');
  await admin.getByRole('button', { name: 'Aprovar ' + email }).click();
  await expect(admin.getByText('Nenhuma solicitação pendente.')).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar situação' }).click();
  await expect(page.getByText('Aprovado', { exact: true })).toBeVisible();
  await page.route('**/api/executions', (r) => r.fulfill({ json: [] }));
  await page.getByRole('link', { name: 'Meu histórico' }).click();
  await expect(page.getByText('Seu histórico está vazio.')).toBeVisible();
  await page.route('**/api/demos/cache', async (r) => {
    await r.fulfill({
      json:
        r.request().method() === 'GET'
          ? {
              modelId: 'Alpha',
              prompt: 'Repita.',
              availableMicroUsd: 5000000,
              ceilingMicroUsd: 1000,
            }
          : { runId: 'teste' },
    });
  });
  await page.route('**/api/demos/cache/teste', (r) =>
    r.fulfill({
      json: {
        finished: true,
        rows: {
          0: { status: 'completed', cacheStatus: 'MISS', durationMs: 100, costMicroUsd: 5 },
          1: { status: 'completed', cacheStatus: 'HIT', durationMs: 8, costMicroUsd: 0 },
        },
      },
    }),
  );
  await page.getByRole('link', { name: 'Cache', exact: true }).click();
  await page.getByRole('button', { name: 'Consultar previsão' }).click();
  await page.getByRole('button', { name: 'Confirmar e executar duas chamadas' }).click();
  await expect(page.getByText('Origem: cache', { exact: true })).toBeVisible();
  await admin.close();
});

test('usuário aprovado confirma a previsão e recebe as saídas dos três modelos', async ({
  page,
}) => {
  await page.route('**/api/access', (r) => r.fulfill({ json: { status: 'approved' } }));
  await page.route('**/api/admin/access', (r) => r.fulfill({ status: 403, json: {} }));
  await login(page, 'aprovada');
  await page.getByRole('link', { name: 'Comparar modelos' }).click();
  const options = page.getByRole('checkbox');
  await expect(options.nth(2)).toBeVisible();
  for (const choice of (await options.all()).slice(0, 3)) await choice.check();
  let models: string[] = [];
  await page.route('**/api/budget/quote', async (r) => {
    models = (r.request().postDataJSON() as { modelIds: string[] }).modelIds;
    expect(models).toHaveLength(3);
    await r.fulfill({
      json: {
        availableMicroUsd: 5000000,
        ceilingMicroUsd: 200000,
        reason: null,
        judges: ['A', 'B', 'C'],
      },
    });
  });
  const prompt = 'Compare o uso de cache.';
  let id = '',
    reads = 0;
  await page.route('**/api/executions', async (r) => {
    const payload = r.request().postDataJSON() as { executionId: string };
    expect(payload).toMatchObject({
      prompt,
      modelIds: models,
      confirmedMicroUsd: 200000,
      confirmedJudges: ['A', 'B', 'C'],
    });
    id = payload.executionId;
    await r.fulfill({ status: 202, json: { executionId: id } });
  });
  await page.route('**/api/executions/*', async (r) => {
    expect(
      r
        .request()
        .url()
        .endsWith('/' + id),
    ).toBe(true);
    reads++;
    await r.fulfill({
      json: {
        executionId: id,
        prompt,
        attempts: models.map((modelId, index) =>
          reads === 1
            ? { modelId, index, status: 'queued' }
            : {
                modelId,
                index,
                status: 'completed',
                output: { type: 'text', text: 'Resposta ' + (index + 1) },
                durationMs: 50 + index,
              },
        ),
      },
    });
  });
  await page.getByRole('button', { name: 'Consultar orçamento' }).click();
  await page.getByLabel('Prompt', { exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page.getByText('Na fila', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Resposta 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
});

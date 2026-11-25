import { expect, test } from '@playwright/test';

test('abre o comparador público e seleciona três modelos por teclado', async ({ page }) => {
  await page.goto('/comparar');
  await expect(page.getByRole('heading', { name: 'Comparar modelos' })).toBeVisible();
  const choices = page.getByRole('checkbox');
  await expect(choices.nth(2)).toBeVisible();
  for (const choice of (await choices.all()).slice(0, 3)) {
    await choice.focus();
    await choice.press('Space');
  }
  await expect(page.getByText('3 de 3 selecionadas')).toBeVisible();
  await expect(page.getByText(/Entre com Google para consultar seu saldo/)).toBeVisible();
});

test('preserva a rota de fallback', async ({ page }) => {
  await page.goto('/rota-que-nao-existe');
  await expect(page.getByRole('heading', { name: /página não encontrada/i })).toBeVisible();
});

test('o catálogo mostra os modelos de imagem compatíveis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto('/comparar');
  await page.getByLabel('Tarefa').selectOption('Geração de imagem');
  await expect(page.getByRole('checkbox', { name: /flux/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: /lucid-origin/ }).check();
  await expect(page.getByText('1 de 1 selecionadas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('visitante reabre benchmark parcial e inspeciona modelos e pareceres pelo teclado', async ({
  page,
}) => {
  const id = 'a'.repeat(64);
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  await page.route('**/api/gallery', async (route) => {
    reads++;
    if (reads === 1) {
      await ready;
      await route.fulfill({ status: 503, json: { error: 'Falha na galeria' } });
    } else await route.fulfill({ json: [{ id, title: 'Ensaio de exemplo' }] });
  });
  await page.route('**/api/gallery/' + id, (route) =>
    route.fulfill({
      json: {
        executionId: id,
        title: 'Ensaio de exemplo',
        prompt: 'Descreva o ensaio.',
        judges: ['juiz A', 'juiz B', 'juiz C'],
        attempts: ['Alpha', 'Beta', 'Gama'].map((modelId, index) => ({
          modelId,
          index,
          status: 'completed',
          output: { type: 'text', text: 'Saída ' + modelId },
        })),
        evaluation: {
          status: 'finished',
          reviews: [],
          ranking: {
            rows: [],
            reasons: ['Faltam pareceres válidos.'],
            totalCostMicroUsd: null,
            elapsedMs: null,
          },
        },
      },
    }),
  );
  await page.goto('/galeria');
  await expect(page.getByRole('status')).toHaveText(/Carregando benchmarks/);
  release();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('link', { name: 'Ensaio de exemplo' }).click();
  await expect(page.getByText('Classificação parcial', { exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Beta' });
  await row.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary').getByText('Saída Beta')).toBeVisible();
  await page.getByRole('button', { name: 'Pareceres', exact: true }).click();
  const summary = page.locator('summary').filter({ hasText: 'juiz B · Parecer ausente' });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Usar este prompt' }).click();
  await expect(page.getByText('Descreva o ensaio.')).toBeVisible();
  await page.goto('/comparar');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

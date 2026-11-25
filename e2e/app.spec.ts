import { expect, test } from '@playwright/test';

test('abre o comparador público e seleciona três modelos por teclado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Comparar modelos' })).toBeVisible();
  const choices = page.getByRole('checkbox');
  await expect(choices).toHaveCount(3);
  for (const choice of await choices.all()) {
    await choice.focus();
    await choice.press('Space');
  }
  await expect(page.getByText('3 de 3 selecionadas')).toBeVisible();
  await expect(page.getByText(/Entre com Google para consultar seu saldo/)).toBeVisible();
});

test('preserva a rota de fallback', async ({ page }) => {
  await page.goto('/rota-que-nao-existe');
  await expect(page.getByRole('heading', { name: /pagina nao encontrada/i })).toBeVisible();
});

test('o catálogo de imagens cabe na tela do celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Tarefa').selectOption('Geração de imagem');
  await expect(page.getByRole('checkbox', { name: /flux/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: /lucid-origin/ }).check();
  await expect(page.getByText('1 de 1 selecionadas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

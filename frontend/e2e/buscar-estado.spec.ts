import { expect, test } from '@playwright/test';

test.describe('Buscar estado (E2E, app real)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Buscar estado' }).click();
  });

  test('seleciona SP e vê os agregados e o 1º colocado do ranking (Taboão da Serra)', async ({
    page,
  }) => {
    await page.getByLabel('Estado (UF)').selectOption({ label: 'São Paulo (SP)' });

    const secao = page.getByRole('region', { name: /Agregados de São Paulo/i });
    await expect(secao).toBeVisible();
    await expect(secao).toContainText('44.411.238');
    await expect(secao).toContainText('248.219,49 km²');

    const ranking = page.getByRole('list', { name: /Municípios ranqueados/i });
    await expect(ranking.getByRole('listitem').first()).toContainText('Taboão da Serra');
    await expect(ranking.getByRole('listitem').first()).toContainText('13.416,96 hab/km²');
  });

  test('UF grande (MG): navegar para a página 2 mantém a ordem de densidade decrescente', async ({
    page,
  }) => {
    await page.getByLabel('Estado (UF)').selectOption({ label: 'Minas Gerais (MG)' });

    const ranking = page.getByRole('list', { name: /Municípios ranqueados/i });
    await expect(ranking.getByRole('listitem')).toHaveCount(20);
    const primeiroMunicipioPagina1 = await ranking.getByRole('listitem').first().textContent();

    await page.getByRole('button', { name: 'Próxima' }).click();

    await expect(page.getByText('Página 2 de')).toBeVisible();
    const primeiroMunicipioPagina2 = await ranking.getByRole('listitem').first().textContent();
    expect(primeiroMunicipioPagina2).not.toBe(primeiroMunicipioPagina1);
  });

  test('UF pequena (Roraima): ranking mostra todos os municípios numa página, sem paginação', async ({
    page,
  }) => {
    await page.getByLabel('Estado (UF)').selectOption({ label: 'Roraima (RR)' });

    const ranking = page.getByRole('list', { name: /Municípios ranqueados/i });
    await expect(ranking.getByRole('listitem')).toHaveCount(15);
    await expect(page.getByRole('button', { name: 'Próxima' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Anterior' })).toHaveCount(0);
  });

  test('trocar de UF reseta o ranking para a página 1', async ({ page }) => {
    await page.getByLabel('Estado (UF)').selectOption({ label: 'Minas Gerais (MG)' });
    await page.getByRole('button', { name: 'Próxima' }).click();
    await expect(page.getByText('Página 2 de')).toBeVisible();

    await page.getByLabel('Estado (UF)').selectOption({ label: 'São Paulo (SP)' });

    const ranking = page.getByRole('list', { name: /Municípios ranqueados/i });
    await expect(ranking.getByRole('listitem').first()).toContainText('Taboão da Serra');
    await expect(page.getByRole('button', { name: 'Próxima' })).toBeVisible();
  });

  test('voltar para a aba "Buscar cidade" mostra a tela de cidade e oculta a de estado', async ({
    page,
  }) => {
    await page.getByLabel('Estado (UF)').selectOption({ label: 'São Paulo (SP)' });
    await expect(page.getByRole('region', { name: /Agregados de São Paulo/i })).toBeVisible();

    await page.getByRole('tab', { name: 'Buscar cidade' }).click();

    await expect(page.getByRole('heading', { name: 'Buscar cidade' })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Buscar estado' })).not.toBeVisible();
    await expect(page.getByLabel('Estado (UF)')).not.toBeVisible();
  });
});

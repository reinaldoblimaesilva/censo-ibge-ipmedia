import { expect, test } from '@playwright/test';

test.describe('Buscar cidade (E2E, app real)', () => {
  test('busca "sao paulo", seleciona o resultado e vê os agregados de referência', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('combobox').fill('sao paulo');

    const opcao = page.getByRole('option', { name: 'São Paulo — SP' });
    await expect(opcao).toBeVisible();
    await opcao.click();

    const secao = page.getByRole('region', { name: /Agregados de São Paulo/i });
    await expect(secao).toBeVisible();
    await expect(secao).toContainText('11.451.999');
    await expect(secao).toContainText('27.301');
    await expect(secao).toContainText('1.521,202 km²');
    await expect(secao).toContainText('7.528,26 hab/km²');
    await expect(secao).toContainText('27.037');
    await expect(secao).toContainText('254');
    await expect(secao).toContainText('5.380.188');
    await expect(secao).toContainText('6.060.887');
    await expect(secao).toContainText('10.924');
  });

  test('busca de homônimo "sao domingos" retorna 5 resultados de UFs distintas', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('combobox').fill('sao domingos');

    const opcoes = page.getByRole('option');
    await expect(opcoes).toHaveCount(5);

    const rotulos = await opcoes.allTextContents();
    expect(new Set(rotulos).size).toBe(5);
    for (const rotulo of rotulos) {
      expect(rotulo).toMatch(/^São Domingos — [A-Z]{2}$/);
    }
  });

  test('mostra mensagem de "nenhum município encontrado" para termo sem correspondência', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('combobox').fill('municipioinexistentezz');

    await expect(page.getByText('nenhum município encontrado')).toBeVisible();
  });

  test('texto com 1 caractere não dispara busca (lista não aparece)', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('combobox').fill('s');

    await page.waitForTimeout(500);
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByText('nenhum município encontrado')).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';

test('ouvre Racine et vérifie le titre', async ({ page }) => {
  await page.goto('/index.html');
  // Version-agnostique : le numéro courant vit dans app.js/index.html
  // (docs/STRUCTURE_CONTRACT.md — Contrat de version), pas dans les tests.
  await expect(page).toHaveTitle(/^Racine V\d+\.\d+(\.\d+)?$/);
});

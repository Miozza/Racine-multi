import { test, expect } from '@playwright/test';

test('ouvre Racine et vérifie le titre', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Racine V4\.5\.22/);
});

import { test, expect } from '@playwright/test';

test('ouvre Racine et vérifie le titre', async ({ page }) => {
  await page.goto('/index.html');
  // Version-agnostique : le numéro courant vit dans app.js/index.html
  // (docs/STRUCTURE_CONTRACT.md — Contrat de version), pas dans les tests.
  await expect(page).toHaveTitle(/^Racine V\d+\.\d+(\.\d+)?$/);
});

// Le conditionnement non fait — vérifié SUR L'ÉCRAN, pas sur la chaîne HTML.
//
// Pourquoi ce test existe : le garde-fou node (dev/wod_skip_checks.js) vérifiait
// que l'attribut `hidden` était présent dans le HTML produit, et la surface
// s'ouvrait quand même dépliée. `display` posé sur une classe bat le
// `display:none` que [hidden] tient du navigateur — sa spécificité est plus
// faible. Un test sans navigateur ne pouvait pas le voir. Celui-ci le voit.
test('le conditionnement non fait est replié, puis se déplie et s\'annule', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    const gate = document.getElementById('racineGate');
    if(gate) gate.remove();
    (window as any).switchView('results');
  });

  const surface = page.locator('.wod-skip').first();
  await expect(surface).toBeAttached();

  // 1. Replié : un seul lien visible, discret. Les motifs attendent.
  await expect(surface.locator('[data-skip-open]')).toBeVisible();
  await expect(surface.locator('.wod-skip-reasons')).toBeHidden();
  await expect(surface.locator('.wod-skip-done')).toBeHidden();

  // 2. Déplié : les trois motifs, et le lien d'ouverture s'efface.
  await surface.locator('[data-skip-open]').click();
  await expect(surface.locator('.wod-skip-reasons')).toBeVisible();
  await expect(surface.locator('[data-skip-reason]')).toHaveCount(3);
  await expect(surface.locator('[data-skip-open]').first()).toBeHidden();

  // 3. Motif choisi : l'état s'affiche, la carte passe en retrait, et la ligne
  //    collectée ne porte AUCUNE donnée de performance.
  await surface.locator('[data-skip-reason="chaleur"]').click();
  await expect(surface.locator('.wod-skip-state')).toHaveText(/Non fait — Chaleur extrême/);
  await expect(page.locator('.sf-card.is-skipped')).toHaveCount(1);

  const ligne = await page.evaluate(() => {
    const res = (window as any).collectSessionResults();
    return Object.keys(res).map(k => [k, res[k]]).find(([k]) => String(k).startsWith('wod_'))?.[1];
  });
  expect(ligne).toMatchObject({ skipped: '1', skipReason: 'Chaleur extrême' });
  expect(ligne).not.toHaveProperty('rpe');
  expect(ligne).not.toHaveProperty('result');
  expect(ligne).not.toHaveProperty('rounds');

  // 4. Retour en arrière : le résultat du WOD revient.
  await surface.locator('[data-skip-undo]').click();
  await expect(page.locator('.sf-card.is-skipped')).toHaveCount(0);
  const revenue = await page.evaluate(() => {
    const res = (window as any).collectSessionResults();
    return Object.keys(res).map(k => [k, res[k]]).find(([k]) => String(k).startsWith('wod_'))?.[1];
  });
  expect(revenue).toHaveProperty('rpe');
  expect(revenue).not.toHaveProperty('skipped');
});

#!/usr/bin/env node
/*
  Racine - garde-fou structurel : empeche l'ajout de nouvelles regex de noms
  de mouvement en dehors de scripts/charge/movement_tuning.js.
  Voir docs/STRUCTURE_CONTRACT.md — Domaine charge — Regle de tuning par mouvement.

  Usage :
    node dev/movement_tuning_boundary_checks.js
*/
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

// Fichiers surveilles : la logique de decision ne doit plus contenir de
// regex de nom de mouvement en dur. Le nombre autorise est fige juste apres
// le refactor de 2026-07-26 (voir le plan associe) ; toute regex de mouvement
// ajoutee au-dela doit d'abord passer par movement_tuning.js.
const watchedFiles = [
  'scripts/charge/suggestion.js',
  'scripts/charge/historique.js'
];
const allowedCount = {
  // 2 faux positifs connus de l'heuristique : coachIsDeloadWeekOrContext()
  // teste du texte de contexte/intention libre (primaryIntent/kind/
  // blockTitle/label de semaine), pas un nom de mouvement. Voir
  // docs/STRUCTURE_CONTRACT.md — Regle de tuning par mouvement.
  'scripts/charge/suggestion.js': 2,
  // 1 faux positif connu : coachShouldPreferContextMatch() teste des tags
  // d'intention de seance (ctx.intents[]), pas un nom de mouvement — code
  // explicitement conserve tel quel par la Tache 4.
  'scripts/charge/historique.js': 1
};

// Heuristique : une regex litterale utilisee comme test de nom de mouvement
// ressemble a /mot ou expression\s*(en minuscules)/ suivie de .test(
const movementRegexPattern = /\/[a-z][a-z0-9 |]*\/\.test\(/g;

let failed = 0;
watchedFiles.forEach(file => {
  const full = path.join(root, file);
  const src = fs.readFileSync(full, 'utf8');
  const matches = src.match(movementRegexPattern) || [];
  const count = matches.length;
  const allowed = allowedCount[file] || 0;
  if(count > allowed){
    failed++;
    console.error(file+' : '+count+' regex de mouvement inline detectee(s) (autorise : '+allowed+').');
    matches.forEach(m => console.error('  '+m));
    console.error('  -> deplacer ce seuil dans scripts/charge/movement_tuning.js (voir STRUCTURE_CONTRACT.md).');
  }
});

if(failed){
  console.error(failed+' fichier(s) en violation de la regle de tuning par mouvement.');
  process.exit(1);
}
console.log('Regle de tuning par mouvement respectee : aucune regex de mouvement hors movement_tuning.js.');

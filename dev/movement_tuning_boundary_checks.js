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
// regex de nom de mouvement en dur. La liste ci-dessous est figee juste apres
// le refactor de 2026-07-26 (voir le plan associe) ; toute regex de mouvement
// ajoutee au-dela doit d'abord passer par movement_tuning.js.
const watchedFiles = [
  'scripts/charge/suggestion.js',
  'scripts/charge/historique.js'
];
// Allowlist explicite (pas un compte) : les seuls textes de regex tolerees
// dans les fichiers surveilles, avec leur justification. Comparaison par
// SET exact — si une regex disparait, l'entree devient orpheline (a purger
// ici) ; si une regex NON listee apparait (nouvelle OU substituee a une
// existante), le check echoue. Ca ferme la faille "echanger un faux positif
// contre une vraie regex de mouvement" du simple comptage precedent.
const allowedPatterns = {
  'scripts/charge/suggestion.js': [
    // coachIsDeloadWeekOrContext() teste du texte de contexte/intention libre
    // (primaryIntent/kind/blockTitle/note/text/format), pas un nom de
    // mouvement. Voir docs/STRUCTURE_CONTRACT.md — Regle de tuning par mouvement.
    '/deload|recuperation|recovery|reset/.test(',
    // Meme fonction, second test : sur le libelle/objectif de la semaine
    // courante (buildWeekInfo()), toujours pas un nom de mouvement.
    '/deload|facile|easy|recuperation|recovery|reset/.test('
  ],
  'scripts/charge/historique.js': [
    // coachShouldPreferContextMatch() teste des tags d'intention de seance
    // (ctx.intents[]), pas un nom de mouvement — code explicitement
    // conserve tel quel par la Tache 4.
    '/wod|technique|light|recovery|recall|progression/.test('
  ]
};

// Heuristique : toute regex litterale immediatement suivie de .test( est un
// candidat. Le charset [a-zA-Z0-9 |.*()_'-] couvre les formes de nom de
// mouvement observees (mots, alternatives, wildcards, groupes, tirets,
// majuscules — ex. /lateral raise.*(cable)/.test() ), tout en excluant par
// construction les regex techniques a base d'echappements (/\bkg\b/i,
// /\s*main/i) ou de symboles seuls (/⚠/) : ces formes-la ne commencent pas
// par une lettre et/ou utilisent un flag apres le "/" fermant, donc ne
// matchent pas ce pattern. Le check ne pretend pas classifier semantiquement
// chaque match — seulement le comparer a l'allowlist ci-dessus ; toute
// nouvelle regex candidate doit etre revue a la main (humain ou agent).
const movementRegexPattern = /\/[a-zA-Z][a-zA-Z0-9 |.*()_'-]*\/\s*\.test\(/g;

let failed = 0;
watchedFiles.forEach(file => {
  const full = path.join(root, file);
  const src = fs.readFileSync(full, 'utf8');
  const matches = src.match(movementRegexPattern) || [];
  const allowed = allowedPatterns[file] || [];
  const unexpected = matches.filter(m => !allowed.includes(m));
  if(unexpected.length){
    failed++;
    console.error(file+' : '+unexpected.length+' regex de mouvement inline non allowlistee(s) detectee(s).');
    unexpected.forEach(m => console.error('  '+m));
    console.error('  -> deplacer ce seuil dans scripts/charge/movement_tuning.js (voir STRUCTURE_CONTRACT.md),');
    console.error('     ou, si c\'est un nouveau faux positif legitime (texte de contexte, pas un nom de');
    console.error('     mouvement), l\'ajouter explicitement a allowedPatterns dans ce script avec sa justification.');
  }
});

if(failed){
  console.error(failed+' fichier(s) en violation de la regle de tuning par mouvement.');
  process.exit(1);
}
console.log('Regle de tuning par mouvement respectee : aucune regex de mouvement hors movement_tuning.js.');

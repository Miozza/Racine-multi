#!/usr/bin/env node
/*
  Racine — garde-fous : mouvements faits hors programme (écran Résultats).

  Pourquoi ce fichier : `scripts/session/extra_movements.js` écrit dans
  `state.history` et n'était couvert par AUCUNE validation. Ces séries comptent
  comme de la capacité réelle — elles nourrissent `movementRefs`,
  `athlete_state` et CoachBrainMemory par le chemin normal. Une erreur ici ne
  se voit pas à l'écran : elle fausse silencieusement les charges suggérées.

  Le script exécute le VRAI module dans un bac à sable ; seules les
  dépendances qui ne sont pas le sujet sont simulées (catalogue, moteur de
  charges, cache de résultats).

  Contrat protégé (cf. l'en-tête du module, docs/DATA_FLOW_CONTRACT.md) :
    1. Clé de résultat = nom EXACT du catalogue. C'est ce qui branche
       ast.movements[label], movementRefs et Brain sans une ligne de plus.
    2. Contexte neutre : aucun `kind`, aucun titre de bloc. Une intention
       (technique/light/wod) ferait tomber ces séries dans le contexte de
       progression limitée, alors que c'est de la capacité réelle.
    3. Marqueur `isExtra` : l'historique doit savoir que la série n'était pas
       au programme, sinon elle est traitée comme une prescription.
    4. Anti-collision : un mouvement déjà dans la séance du jour n'est jamais
       proposé — sa clé de résultat écraserait la saisie programmée. La
       comparaison passe par le libellé du moteur, pas la chaîne brute.
    5. Retirer un mouvement purge sa saisie du cache, sinon une valeur
       fantôme repart dans la séance sauvegardée.
    6. La liste ne vit que le temps de l'écran Résultats.

  Usage : node dev/extra_movements_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }
function scenario(nom, fn){
  try{ fn(); }
  catch(e){ console.error('FAIL:', nom + ' — exception : ' + (e && e.message ? e.message : String(e))); failures++; }
}

// ── Bac à sable ────────────────────────────────────────────────────────────
// `canon()` du module passe par RacineMovementSwaps : c'est lui qui décide que
// deux libellés différents désignent le même mouvement. On le simule fidèlement
// (repli sur le nom brut) pour que l'anti-collision soit testée pour de vrai.
function boot(){
  const sandbox = {
    guidedResultCache: {},
    console: { log(){}, warn(){}, error(){} },
    document: { getElementById: () => null, querySelector: () => null,
                querySelectorAll: () => [], createElement: () => ({ style:{}, classList:{add(){},remove(){}},
                appendChild(){}, addEventListener(){}, querySelector: () => null, querySelectorAll: () => [] }) },
    RacineMovementSwaps: {
      movementCatalog: () => ['Back Squat', 'Bulgarian Split Squat', 'Lateral Raise DB', 'Face Pull']
    },
    // C'est CE global que canon() appelle — pas RacineMovementSwaps. Deux
    // libellés différents qui retombent sur le même mouvement : le cas qui doit
    // déclencher l'anti-collision sans être une égalité de chaînes.
    movementLabelFromKeyOrName: n => (/^db bench$/i.test(String(n).trim()) ? 'DB Bench Press' : String(n).trim()),
    CoachProfiles: { getActiveId: () => 'p_test' },
    CoachCharge: { suggestForExercise: () => '135' },
    parseTargetReps: () => ({ min: 8, max: 8 })
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/session/extra_movements.js'), sandbox);
  return { sandbox, X: sandbox.CoachExtraMovements };
}

// Ce que renvoie collectSessionExercises() pour la séance du jour.
const seanceDuJour = [
  { key: 'Back Squat', name: 'Back Squat', isWod: false },
  { key: 'wod_Metcon', name: 'WOD — Metcon', isWod: true }
];

// ── 1. Un mouvement ajouté arrive au journal sous le bon nom ───────────────
scenario('item construit pour le journal', () => {
  const { X } = boot();
  assert(X.add('Face Pull') === true, 'un mouvement du catalogue s\'ajoute');
  const items = X.buildItems(seanceDuJour);
  assert(items.length === 1, 'un item est produit pour la saisie');
  const it = items[0];
  assert(it.key === 'Face Pull' && it.name === 'Face Pull',
    'la clé de résultat est le nom EXACT du catalogue — c\'est ce qui branche movementRefs et Brain');
  assert(it.isExtra === true,
    'le marqueur isExtra part avec l\'item : l\'historique doit savoir que ce n\'était pas au programme');
  assert(it.kind === '' && it.blockTitle === '',
    'CONTEXTE NEUTRE : aucun kind ni titre de bloc, sinon ces séries tombent en progression limitée');
  assert(it.isWod === false, 'un mouvement hors programme n\'est jamais traité comme un WOD');
  assert(it.suggested === '135', 'une suggestion de charge est demandée au moteur, comme pour un mouvement prévu');
});

// ── 2. Anti-collision : la saisie programmée est prioritaire ───────────────
scenario('anti-collision avec la séance du jour', () => {
  const { X } = boot();
  X.add('Back Squat');            // déjà au programme aujourd'hui
  X.add('Face Pull');             // pas au programme
  const items = X.buildItems(seanceDuJour);
  const noms = items.map(i => i.name);
  assert(noms.indexOf('Back Squat') < 0,
    'un mouvement déjà au programme ne produit AUCUN item — sa clé écraserait la saisie prévue');
  assert(noms.indexOf('Face Pull') >= 0, 'les autres passent normalement');
  assert(X.list().indexOf('Back Squat') >= 0,
    'il reste dans la liste choisie : c\'est buildItems() qui filtre, pas une suppression silencieuse');
});
scenario('collision par libellé du moteur, pas par chaîne brute', () => {
  const { X } = boot();
  // « DB Bench » et « DB Bench Press » sont deux chaînes différentes qui
  // retombent sur le même mouvement : la collision doit être vue quand même.
  X.add('DB Bench');
  const items = X.buildItems([{ key: 'DB Bench Press', name: 'DB Bench Press', isWod: false }]);
  assert(items.length === 0,
    'deux libellés qui désignent le même mouvement collisionnent (comparaison par libellé moteur)');
});

// ── 3. Doublons et entrées vides ───────────────────────────────────────────
scenario('doublons et entrées vides', () => {
  const { X } = boot();
  assert(X.add('Face Pull') === true, 'premier ajout accepté');
  assert(X.add('face pull') === false, 'le même mouvement à la casse près est refusé');
  assert(X.add('  Face Pull  ') === false, 'le même mouvement avec des espaces est refusé');
  assert(X.add('') === false && X.add(null) === false, 'un nom vide est refusé');
  assert(X.list().length === 1, 'un seul mouvement retenu');
  assert(X.buildItems([]).length === 1, 'et un seul item produit — aucune ligne dupliquée dans le journal');
});

// ── 4. Retrait : la saisie ne doit pas survivre en fantôme ─────────────────
scenario('retrait purge la saisie du cache', () => {
  const { sandbox, X } = boot();
  X.add('Face Pull');
  X.add('Lateral Raise DB');
  sandbox.guidedResultCache['Face Pull'] = { load: '30', reps: '12', rpe: '8' };
  sandbox.guidedResultCache['Back Squat'] = { load: '225', reps: '5', rpe: '8' };

  X.remove('Face Pull');
  assert(X.list().indexOf('Face Pull') < 0, 'le mouvement quitte la liste');
  assert(sandbox.guidedResultCache['Face Pull'] === undefined,
    'sa saisie est purgée — sinon une valeur fantôme repart dans la séance sauvegardée');
  assert(sandbox.guidedResultCache['Back Squat'] !== undefined,
    'la saisie des AUTRES mouvements est intacte : la purge est ciblée, jamais en masse');
});

// ── 5. clear() : la liste ne vit que le temps de l'écran Résultats ─────────
scenario('clear vide tout et purge', () => {
  const { sandbox, X } = boot();
  X.add('Face Pull'); X.add('Lateral Raise DB');
  sandbox.guidedResultCache['Face Pull'] = { load: '30' };
  sandbox.guidedResultCache['Back Squat'] = { load: '225' };

  X.clear();
  assert(X.list().length === 0, 'la liste est vidée');
  assert(X.buildItems(seanceDuJour).length === 0, 'plus aucun item produit');
  assert(sandbox.guidedResultCache['Face Pull'] === undefined, 'les saisies hors programme sont purgées');
  assert(sandbox.guidedResultCache['Back Squat'] !== undefined,
    'la séance programmée n\'est PAS touchée par clear() (CLAUDE.md § 2.1 : aucune purge en masse)');
});

// ── 6. list() rend une copie ───────────────────────────────────────────────
scenario('list() ne fuit pas l\'état interne', () => {
  const { X } = boot();
  X.add('Face Pull');
  const l = X.list();
  l.push('Injecté');
  assert(X.list().length === 1,
    'modifier le tableau rendu par list() ne modifie pas la liste interne');
});

// ── 7. Aucun stockage propre ───────────────────────────────────────────────
scenario('aucune clé de stockage créée', () => {
  const src = read('scripts/session/extra_movements.js');
  assert(!/localStorage/.test(src),
    'le module ne crée aucune clé de stockage : ce qui survit passe par state.history');
  assert(!/\.clear\(\)\s*;?\s*$/m.test(src.replace(/api\.clear = function/g, '')) || !/localStorage\.clear/.test(src),
    'aucune suppression en masse (CLAUDE.md § 2.1)');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

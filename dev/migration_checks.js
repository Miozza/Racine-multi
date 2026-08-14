#!/usr/bin/env node
/*
  Racine — garde-fous : migration one-shot vers le profil multi.

  Pourquoi ce fichier : `scripts/migrate_bertin.js` écrit dans le localStorage
  d'un athlète réel et n'était couvert par AUCUNE validation. CLAUDE.md § 2.1
  est catégorique — la source de vérité est le stockage local, il n'existe
  aucune copie serveur, toute perte est définitive. Une migration est
  exactement le genre de code qui peut détruire un historique entier en un
  appel, et le contrat exige qu'elle soit vérifiée sur des données réelles.

  Ce script n'imite pas la migration : il EXÉCUTE le vrai
  `scripts/migrate_bertin.js` par-dessus le vrai `scripts/profiles/storage.js`,
  dans un faux localStorage. Ce qui passe ici est ce que fera le navigateur.

  Contrat protégé :
    1. Une migration nominale ne perd aucune séance : l'historique legacy
       arrive intact, séance pour séance, dans les clés du nouveau profil.
    2. Un profil Bertin qui existe déjà n'est JAMAIS écrasé — c'est la seule
       chose qui sépare « relancer la migration par erreur » de « perdre
       deux ans d'entraînement ».
    3. La migration est idempotente : deux appels ne créent qu'un profil.
    4. L'ordre des clés legacy va du plus récent au plus ancien. Inverser cet
       ordre ne planterait rien — ça restaurerait silencieusement de vieilles
       données par-dessus les bonnes.
    5. Sans données legacy, le profil est créé vide sans rien détruire.
    6. Les charges personnalisées suivent, et vont dans LEUR clé (jamais
       mélangées à l'état).
    7. Aucun fichier de data/ n'est écrit (CLAUDE.md § 2.2).
    8. `migrateBertinFromFiles()` est un filet de récupération qui ÉCRASE
       volontairement l'état du profil. Ce comportement est épinglé ici pour
       qu'il reste un choix conscient et documenté, jamais une surprise.

  Usage : node dev/migration_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

// Un scénario qui lève doit produire un ÉCHEC lisible, pas une pile d'appels.
// Sans ça, une migration qui perd tout fait planter le script — et un harnais
// de mutation qui compte les lignes « FAIL » conclut que tout va bien.
function scenario(nom, fn){
  try{ fn(); }
  catch(e){
    console.error('FAIL:', nom + ' — exception : ' + (e && e.message ? e.message : String(e)));
    failures++;
  }
}

// ── Bac à sable : vrai code, faux stockage ─────────────────────────────────
// Le faux localStorage est volontairement minimal et fidèle : des chaînes,
// rien d'autre — c'est ce que fournit le navigateur, et c'est ce qui fait
// remonter les oublis de JSON.stringify.
function boot(){
  const store = new Map();
  const sandbox = {
    localStorage: {
      getItem: k => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => { store.set(String(k), String(v)); },
      removeItem: k => { store.delete(String(k)); },
      get length(){ return store.size; }
    },
    console: { log(){}, warn(){}, error(){} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/profiles/storage.js'), sandbox);
  vm.runInContext(read('scripts/migrate_bertin.js'), sandbox);
  return { sandbox, store, P: sandbox.CoachProfiles };
}

// Un historique réaliste : ce sont ces objets-là qu'on ne doit jamais perdre.
function legacyState(nbSeances){
  const history = [];
  for(let i = 0; i < nbSeances; i++){
    history.push({date: '2026-0' + ((i % 9) + 1) + '-15', day: 'lundi', week: (i % 6) + 1,
      results: {'Back Squat': {load: String(225 + i * 5), reps: '5', rpe: '8'}}});
  }
  return {week: 3, day: 'mardi', history: history,
    movements: {'Back Squat': {}, 'Bench Press': {}},
    movementRefs: {'back_squat__strength': {load: 315}}};
}

// ── 1. Migration nominale : aucune séance perdue ───────────────────────────
scenario('migration nominale', () => {
  const {sandbox, store, P} = boot();
  const legacy = legacyState(12);
  store.set('coachBertinState', JSON.stringify(legacy));
  store.set('coachBertinCustomCharges', JSON.stringify({'Back Squat': 315}));

  const id = sandbox.migrateBertin();
  assert(typeof id === 'string' && id.length > 0, 'migrateBertin() rend l\'identifiant du profil créé');

  const keys = P.storageKeysFor(id);
  const migre = JSON.parse(store.get(keys.state));
  assert(migre.history.length === 12, 'les 12 séances arrivent dans le profil (vu ' + migre.history.length + ')');
  assert(JSON.stringify(migre.history) === JSON.stringify(legacy.history),
    'l\'historique est identique séance pour séance — rien n\'est réécrit au passage');
  assert(JSON.stringify(migre.movementRefs) === JSON.stringify(legacy.movementRefs),
    'les références de charges suivent intactes');
  assert(store.get(keys.charges) === JSON.stringify({'Back Squat': 315}),
    'les charges personnalisées vont dans LEUR clé, pas mélangées à l\'état');
  assert(P.getActiveId() === id, 'le profil migré devient le profil actif');
  const bertins = P.list().filter(p => p.name === 'Bertin');
  assert(bertins.length === 1 && bertins[0].onboarded === true,
    'un seul profil Bertin, marqué comme déjà passé par l\'accueil');
});

// ── 2. LE garde-fou : un profil existant n'est jamais écrasé ───────────────
scenario('profil existant préservé', () => {
  const {sandbox, store, P} = boot();
  store.set('coachBertinState', JSON.stringify(legacyState(20)));
  const premier = sandbox.migrateBertin();
  const keys = P.storageKeysFor(premier);

  // L'athlète s'entraîne : son historique dépasse maintenant le legacy.
  const vecu = legacyState(37);
  vecu.marqueur = 'donnees_vecues';
  store.set(keys.state, JSON.stringify(vecu));

  // Puis quelqu'un relance la migration — la fausse manœuvre qu'on redoute.
  const second = sandbox.migrateBertin();
  assert(second === premier, 'relancer la migration rend le profil existant au lieu d\'en créer un autre');
  assert(P.list().filter(p => p.name === 'Bertin').length === 1,
    'aucun second profil Bertin n\'est créé (idempotent)');

  const apres = JSON.parse(store.get(keys.state));
  assert(apres.marqueur === 'donnees_vecues' && apres.history.length === 37,
    'LES 37 SÉANCES VÉCUES SURVIVENT — la migration relancée n\'écrase rien');
});

// ── 3. Ordre des clés legacy : le plus récent gagne ────────────────────────
// Inverser cet ordre ne planterait pas : ça restaurerait silencieusement des
// données de 2024 par-dessus les bonnes. C'est le pire type de régression —
// invisible jusqu'à ce qu'on cherche une séance qui a disparu.
scenario('ordre des clés legacy', () => {
  const {sandbox, store, P} = boot();
  const recent = legacyState(30); recent.marqueur = 'recent';
  const vieux = legacyState(4);   vieux.marqueur = 'vieux';
  store.set('coachBertinState', JSON.stringify(recent));   // clé la plus récente
  store.set('coachBertinV41', JSON.stringify(vieux));      // clé la plus ancienne

  const id = sandbox.migrateBertin();
  const migre = JSON.parse(store.get(P.storageKeysFor(id).state));
  assert(migre.marqueur === 'recent' && migre.history.length === 30,
    'la clé legacy la plus récente est choisie, pas la plus ancienne');
});
{
  // Et quand SEULE une vieille clé existe, elle est bien lue : le repli marche.
  const {sandbox, store, P} = boot();
  const vieux = legacyState(6); vieux.marqueur = 'v41_seul';
  store.set('coachBertinV41', JSON.stringify(vieux));
  const id = sandbox.migrateBertin();
  const migre = JSON.parse(store.get(P.storageKeysFor(id).state));
  assert(migre && migre.marqueur === 'v41_seul',
    'une installation restée sur une vieille clé est quand même migrée');
}

// ── 4. Absence de legacy, et JSON corrompu : on ne détruit rien ────────────
scenario('repli sur vieille clé', () => {
  const {sandbox, store, P} = boot();
  const id = sandbox.migrateBertin();
  assert(typeof id === 'string', 'sans données legacy, le profil est créé quand même');
  assert(store.get(P.storageKeysFor(id).state) === undefined,
    'aucun état vide n\'est écrit par-dessus la clé du profil');
});
{
  const {sandbox, store, P} = boot();
  store.set('coachBertinState', '{ceci n\'est pas du JSON');
  const id = sandbox.migrateBertin();
  assert(typeof id === 'string', 'un localStorage legacy corrompu ne fait pas planter la migration');
  assert(store.get(P.storageKeysFor(id).state) === undefined,
    'et rien de corrompu n\'est recopié dans le profil');
}

// ── 5. migrateData=false : création sans migration ─────────────────────────
scenario('absence de legacy', () => {
  const {sandbox, store, P} = boot();
  store.set('coachBertinState', JSON.stringify(legacyState(9)));
  const id = sandbox.migrateBertin(false);
  assert(store.get(P.storageKeysFor(id).state) === undefined,
    'migrateBertin(false) crée le profil sans toucher aux données');
  assert(P.getActiveId() === id, 'et l\'active quand même');
});

// ── 6. migrateBertinFromFiles : filet de récupération qui ÉCRASE ───────────
// Comportement volontaire — c'est la seule porte de restauration depuis des
// exports data/ quand le localStorage legacy a disparu. Épinglé ici pour que
// ça reste un choix conscient : quiconque lit ce test sait que la fonction
// remplace l'état du profil, historique compris.
scenario('legacy corrompu', () => {
  const {sandbox, store, P} = boot();
  const id0 = sandbox.migrateBertin(false);
  const keys = P.storageKeysFor(id0);
  store.set(keys.state, JSON.stringify({history: [{date: '2026-01-01'}], marqueur: 'avant'}));

  const id = sandbox.migrateBertinFromFiles(
    {movements: {'Back Squat': {}}},
    {week: 5, day: 'jeudi'},
    [{date: '2026-05-01'}, {date: '2026-05-03'}],
    {'Back Squat': 300}
  );
  assert(id === id0, 'la restauration depuis fichiers réutilise le profil Bertin existant');
  const apres = JSON.parse(store.get(keys.state));
  assert(apres.history.length === 2 && apres.week === 5 && apres.athleteState,
    'les trois fichiers (athlete_state + cycle_state + resultats) sont fusionnés dans l\'état');
  assert(apres.marqueur === undefined,
    'ATTENDU : la restauration REMPLACE l\'état existant — c\'est un filet de dernier recours, pas une fusion');
  assert(store.get(keys.charges) === JSON.stringify({'Back Squat': 300}),
    'les charges des fichiers suivent');
});

// ── 6b. L'activation compte vraiment quand le profil préexiste ─────────────
// Piège découvert par mutation : CoachProfiles.create() active déjà le profil
// qu'il crée, donc « le profil est actif après migration » passait sans que le
// setActive final soit testé. Ici Bertin existe DÉJÀ et un autre profil est
// actif — c'est le seul cas où la ligne d'activation fait un vrai travail, et
// c'est le cas réel d'une restauration sur un appareil déjà utilisé.
scenario('activation quand un autre profil est actif', () => {
  const {sandbox, store, P} = boot();
  sandbox.migrateBertin(false);                 // Bertin existe
  const autre = P.create({name: 'Stéphanie'});  // ...et devient le profil actif
  assert(P.getActiveId() === autre, 'départ : c\'est l\'autre profil qui est actif');

  const id = sandbox.migrateBertinFromFiles({movements: {}}, {week: 2}, [{date: '2026-06-01'}], null);
  assert(P.getActiveId() === id && id !== autre,
    'après restauration, Bertin redevient le profil actif — sinon l\'athlète rouvre l\'app sur le mauvais profil');
});

// ── 7. Aucun fichier de data/ n'est touché (CLAUDE.md § 2.2) ───────────────
scenario('migrateData=false', () => {
  const src = read('scripts/migrate_bertin.js');
  const ecritures = src.match(/writeFile|fs\.|data\/[a-z_]+\.json['"]\s*,/g) || [];
  assert(ecritures.length === 0,
    'migrate_bertin.js n\'écrit dans aucun fichier de data/ — la migration va au localStorage');
  assert(!/localStorage\.clear\(\)|\.clear\(\)/.test(src),
    'aucune suppression en masse de clés (CLAUDE.md § 2.1)');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

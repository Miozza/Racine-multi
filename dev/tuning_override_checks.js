#!/usr/bin/env node
/*
  Racine - garde-fou de la surcharge de tuning par profil
  (scripts/charge/tuning_override.js).

  Ce que ce script epingle, parametre par parametre :
    · le chemin declare existe reellement dans COACH_MOVEMENT_TUNING et pointe
      un NOMBRE (un chemin mort ne se verrait jamais a l'ecran);
    · les bornes de l'app encadrent la valeur d'usine (min <= usine <= max);
    · une valeur hors bornes est ramenee dedans, jamais injectee telle quelle;
    · ecrire puis remettre a l'usine restaure exactement la valeur livree;
    · la surcharge est un calque : elle n'ecrase jamais la reference d'usine.

  Puis les proprietes d'ensemble : aucune regex ni tableau surchargeable,
  isolation entre profils, aller-retour par le stockage, plafonds manuels
  bornes, et la cle de stockage placee sous le prefixe balaye par l'export de
  profil (c'est ce qui fait voyager la calibration sans code supplementaire).

  Voir docs/superpowers/plans/2026-08-24-plafond-et-surcharge-tuning.md.

  Usage :
    node dev/tuning_override_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }

function makeContext(profileKey){
  const ctx = {
    console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
    setTimeout: function(fn){ if(typeof fn==='function') fn(); },
    clearTimeout: function(){},
    document: { getElementById: function(){ return null; } },
    navigator: {},
    localStorage: { _s:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} },
    APP_VERSION: 'TEST',
    CoachState: { storageKeys: function(){ return {state: profileKey, charges: 'racineCharges::x'}; } }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ['scripts/charge/movement_tuning.js','scripts/charge/tuning_override.js']
    .forEach(file => vm.runInNewContext(read(file), ctx, { filename: file }));
  return ctx;
}

let checks = 0, failed = 0;
function assert(cond, msg){
  checks++;
  if(!cond){ failed++; console.error(' ✗ ' + msg); }
}
// vm : les litteraux regex du script charge appartiennent au realm du contexte,
// pas au RegExp injecte ici — instanceof y est toujours faux. On teste donc la
// marque de type, seule lecture fiable a travers un realm.
function isRegExp(v){ return Object.prototype.toString.call(v) === '[object RegExp]'; }

function readPath(root_, p){
  let node = root_;
  for(const part of String(p).split('.')){
    if(!node || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

const ctx = makeContext('racineState::p_admin');
const O = ctx.window.CoachTuningOverride;
const T = ctx.window.COACH_MOVEMENT_TUNING;

// ─── 1. Table de parametres ────────────────────────────────────────────────
assert(Array.isArray(O.PARAMS) && O.PARAMS.length > 0, 'La table PARAMS existe.');
assert(O.PARAMS.length === 23, 'La table declare 23 parametres (' + O.PARAMS.length + ').');
const seen = {};
O.PARAMS.forEach(p => { seen[p.path] = (seen[p.path] || 0) + 1; });
assert(Object.keys(seen).length === O.PARAMS.length, 'Aucun chemin declare deux fois.');

// ─── 2. Contrat, parametre par parametre ───────────────────────────────────
O.PARAMS.forEach(p => {
  const factory = O.factoryValue(p.path);
  const live = readPath(T, p.path);

  assert(typeof live === 'number', p.path + ' : le chemin pointe une valeur numerique vivante.');
  assert(typeof factory === 'number', p.path + ' : la valeur d\'usine a bien ete capturee.');
  assert(!!p.label && !!p.group, p.path + ' : porte un libelle et un groupe lisibles.');
  assert(Number(p.min) <= Number(p.max), p.path + ' : bornes ordonnees.');
  assert(factory >= Number(p.min) && factory <= Number(p.max), p.path + ' : la valeur d\'usine tient dans ses bornes.');
  assert(Number(p.step) > 0, p.path + ' : un pas d\'ajustement est declare.');

  // Hors bornes : ramene dedans, jamais injecte tel quel.
  const tooHigh = O.set(p.path, Number(p.max) + 1000);
  assert(tooHigh !== null && tooHigh <= Number(p.max), p.path + ' : une valeur trop haute est ramenee au plafond.');
  assert(readPath(T, p.path) <= Number(p.max), p.path + ' : le moteur ne recoit jamais au-dessus du plafond.');
  const tooLow = O.set(p.path, Number(p.min) - 1000);
  assert(tooLow !== null && tooLow >= Number(p.min), p.path + ' : une valeur trop basse est ramenee au plancher.');
  assert(readPath(T, p.path) >= Number(p.min), p.path + ' : le moteur ne recoit jamais sous le plancher.');

  // Texte : refuse, sans rien casser dans le moteur.
  const before = readPath(T, p.path);
  assert(O.set(p.path, 'beaucoup') === null, p.path + ' : une valeur non numerique est refusee.');
  assert(readPath(T, p.path) === before, p.path + ' : un refus ne modifie pas le moteur.');

  // Retour a l'usine : exactement la valeur livree.
  O.clear(p.path);
  assert(readPath(T, p.path) === factory, p.path + ' : « Usine » restaure exactement la valeur livree.');
  assert(O.isChanged(p.path) === false, p.path + ' : revenu a l\'usine, plus rien n\'est marque comme modifie.');
  assert(O.factoryValue(p.path) === factory, p.path + ' : la reference d\'usine survit aux ecritures (calque, pas ecrasement).');
});

// ─── 3. Rien d'autre que des scalaires ─────────────────────────────────────
O.PARAMS.forEach(p => {
  const live = readPath(T, p.path);
  assert(!isRegExp(live), p.path + ' : jamais une regex (non serialisable en JSON).');
  assert(!Array.isArray(live), p.path + ' : jamais un tableau (fusion ambigue).');
});
assert(O.set('isolationPatterns', ['x']) === null, 'Un chemin non declare est refuse, meme s\'il existe dans la table.');
assert(Array.isArray(T.isolationPatterns) && isRegExp(T.isolationPatterns[0]),
  'Les motifs de mouvements restent des regex intactes.');
assert(O.set('maxJumpBase.overrides', 5) === null, 'Un tableau d\'overrides n\'est pas surchargeable.');
assert(Array.isArray(T.maxJumpBase.overrides), 'Les overrides par mouvement restent un tableau.');

// ─── 4. Stockage : la calibration voyage avec le profil ────────────────────
assert(O.storageKey().indexOf('racineState::p_admin::') === 0,
  'La cle vit SOUS la cle d\'etat du profil (prefixe balaye par l\'export de profil).');
assert(O.storageKey().indexOf(O.VERSION) > 0, 'La cle porte une version de format.');
assert(O.isActive() === false, 'Un profil sans reglage n\'a aucune calibration active.');
O.set('brainGate.damping', 0.5);
assert(O.isActive() === true, 'Un reglage pose rend la calibration active.');
const stored = JSON.parse(ctx.localStorage.getItem(O.storageKey()));
assert(!!stored && typeof stored.params === 'object', 'Le stockage contient un bloc params.');
assert(stored.params['brainGate.damping'] === 0.5, 'Le reglage est bien ecrit dans le stockage.');
assert(!!stored.updatedAt, 'Le stockage est horodate.');
assert(JSON.stringify(stored).indexOf('/') === -1 || !/\\\\/.test(JSON.stringify(stored)),
  'Le stockage reste du JSON simple (ni regex ni echappement exotique).');

// Relecture par un moteur neuf partageant le meme stockage : meme calibration.
const reborn = makeContext('racineState::p_admin');
reborn.localStorage._s = ctx.localStorage._s;
reborn.window.CoachTuningOverride.apply();
assert(reborn.window.COACH_MOVEMENT_TUNING.brainGate.damping === 0.5,
  'Au rechargement, la calibration du profil est reappliquee.');

// ─── 5. Isolation entre profils ────────────────────────────────────────────
const other = makeContext('racineState::p_client');
other.localStorage._s = ctx.localStorage._s;   // meme localStorage, autre profil actif
other.window.CoachTuningOverride.apply();
assert(other.window.COACH_MOVEMENT_TUNING.brainGate.damping === other.window.CoachTuningOverride.factoryValue('brainGate.damping'),
  'Un autre profil garde les valeurs d\'usine : la calibration ne le suit pas.');
assert(other.window.CoachTuningOverride.isActive() === false, 'Un autre profil n\'herite d\'aucune calibration.');
assert(other.window.CoachTuningOverride.storageKey() !== O.storageKey(), 'Deux profils, deux cles de calibration.');

// ─── 6. Plafonds manuels ───────────────────────────────────────────────────
O.reset();
assert(Object.keys(O.ceilings()).length === 0, 'Reset : plus aucun plafond manuel.');
assert(T.ceiling && Object.keys(T.ceiling.manual).length === 0, 'Reset : la table vivante des plafonds est vide.');
assert(O.setCeiling('Lateral Raise DB', 35) === true, 'Un plafond manuel s\'ajoute.');
assert(T.ceiling.manual['Lateral Raise DB'] === 35, 'Le plafond manuel arrive dans la table vivante du moteur.');
assert(O.setCeiling('', 35) === false, 'Un plafond sans mouvement est refuse.');
assert(O.setCeiling('Back Squat', 0) === false, 'Un plafond a zero est refuse.');
assert(O.setCeiling('Back Squat', -50) === false, 'Un plafond negatif est refuse.');
assert(O.setCeiling('Back Squat', 99999) === false, 'Un plafond absurde est refuse.');
assert(O.setCeiling('Back Squat', 'lourd') === false, 'Un plafond non numerique est refuse.');
assert(Object.keys(O.ceilings()).length === 1, 'Aucun plafond refuse n\'a ete enregistre.');
O.removeCeiling('Lateral Raise DB');
assert(Object.keys(O.ceilings()).length === 0, 'Un plafond manuel se retire.');
assert(Object.keys(T.ceiling.manual).length === 0, 'Le retrait atteint aussi la table vivante.');

// ─── 7. Stockage corrompu : le moteur reste sain ───────────────────────────
ctx.localStorage.setItem(O.storageKey(), '{ ceci n\'est pas du JSON');
O.apply();
O.PARAMS.forEach(p => {
  assert(readPath(T, p.path) === O.factoryValue(p.path),
    p.path + ' : stockage illisible, valeur d\'usine servie.');
});
ctx.localStorage.setItem(O.storageKey(), JSON.stringify({params:{'chemin.inconnu': 3}, ceilings:{}}));
O.apply();
assert(O.isActive() === false, 'Un stockage qui ne contient que de l\'inconnu ne compte pas comme une calibration.');
ctx.localStorage.setItem(O.storageKey(), JSON.stringify({params:{'brainGate.damping': 99, 'chemin.inconnu': 3}, ceilings:{'Back Squat': -1}}));
O.apply();
assert(T.brainGate.damping <= 1, 'Stockage trafique : la valeur reste bornee.');
assert(O.read().params['brainGate.damping'] <= 1, 'La lecture elle-meme borne : rien de hors bornes ne circule.');
assert(!Object.prototype.hasOwnProperty.call(O.read().params, 'chemin.inconnu'),
  'La lecture ecarte les chemins non declares au lieu de les promener.');
assert(readPath(T, 'chemin.inconnu') === undefined, 'Stockage trafique : aucun chemin inconnu n\'est cree.');
assert(Object.keys(T.ceiling.manual).length === 0, 'Stockage trafique : aucun plafond invalide n\'entre dans le moteur.');
O.reset();

// ─── 8. Le moteur lit la table a l'execution, pas au chargement ────────────
// C'est la condition qui rend cette surcharge possible sans toucher aux
// fichiers de decision : si un module capturait COACH_MOVEMENT_TUNING dans une
// variable au chargement, sa copie ne verrait jamais la calibration.
['scripts/charge/suggestion.js','scripts/charge/historique.js','scripts/charge/scaling.js',
 'scripts/charge/brain_stats.js','scripts/charge/mouvements.js'].forEach(file => {
  const src = read(file);
  const reads = (src.match(/window\.COACH_MOVEMENT_TUNING/g) || []).length;
  assert(reads > 0, file + ' : lit la table de tuning.');
  assert(!/^\s*var\s+[A-Za-z_$][\w$]*\s*=\s*window\.COACH_MOVEMENT_TUNING\s*;?\s*$/m.test(src),
    file + ' : ne capture pas la table au chargement (lecture a l\'execution seulement).');
});

if(failed){
  console.error('\nÉCHEC tuning_override_checks.js — ' + failed + ' controle(s) sur ' + checks + '.');
  process.exit(1);
}
console.log('OK tuning_override_checks.js — ' + checks + ' controles.');

#!/usr/bin/env node
/*
  Racine — garde-fous : notes de séance par mouvement.

  Pourquoi ce fichier : `scripts/session/voice_note.js` écrit dans
  `guidedResultCache`, qui part dans `collectSessionResults()` puis dans
  `state.history`. Il n'était couvert par AUCUNE validation, alors qu'il porte
  un bug déjà corrigé une fois — une note écrite lundi S1 réapparaissait sous
  le même mouvement le mercredi ou en S2, parce que le cache n'est indexé que
  par nom de mouvement et survit tant que la page est ouverte. Rien
  n'empêchait ce bug de revenir.

  Le script exécute le VRAI module par-dessus un faux `guidedResultCache` et
  les vraies portes `getGuidedResult`/`setGuidedResult`, avec la même
  sémantique qu'en session.

  Contrat protégé :
    1. Une note appartient à UNE séance : programme + semaine + jour. Changer
       l'un des trois retire les notes du contexte précédent.
    2. Deux observations sur le même mouvement s'AJOUTENT (séparateur « · »),
       elles ne se remplacent pas — et le tout reste UNE SEULE CHAÎNE, format
       attendu par renderHistory() et l'export.
    3. Un retrait écrit une chaîne vide : ignorée par collectSessionResults(),
       donc la note disparaît aussi de la séance sauvegardée.
    4. L'abandon d'une séance ne touche QUE les notes — jamais les poids, reps
       ou RPE saisis (CLAUDE.md § 2.1 : aucune suppression en masse).
    5. Bornes de taille : une observation et une note totale sont plafonnées,
       le stockage local est un quota partagé avec tout l'historique.
    6. Aucune clé de stockage propre, aucun audio : texte seulement.

  Usage : node dev/voice_note_checks.js
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
// getGuidedResult / setGuidedResult sont reproduits à l'identique du domaine
// session : c'est par eux que tout passe, et c'est leur sémantique (le cache
// n'est indexé QUE par nom de mouvement) qui rend la portée de séance
// nécessaire.
function boot(contexte){
  const cache = {};
  const sandbox = {
    guidedResultCache: cache,
    state: contexte || { cycle: { goal: 'force' }, week: 1, day: 'lundi' },
    console: { log(){}, warn(){}, error(){} },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
                addEventListener(){}, createElement: () => ({ style:{}, classList:{add(){},remove(){}},
                appendChild(){}, addEventListener(){}, querySelectorAll: () => [] }) },
    getGuidedResult(key, field, fallback){
      if(cache[key] && cache[key][field] !== undefined) return cache[key][field];
      return fallback;
    },
    setGuidedResult(key, field, value){
      if(!cache[key]) cache[key] = {};
      cache[key][field] = String(value);
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/session/voice_note.js'), sandbox);
  return { sandbox, cache, V: sandbox.CoachVoiceNote };
}

// ── 1. Deux observations s'ajoutent, elles ne se remplacent pas ────────────
scenario('concaténation des observations', () => {
  const { V, cache } = boot();
  V.appendNote('Back Squat', 'dos rond sur la dernière');
  V.appendNote('Back Squat', 'genou qui rentre à droite');
  const note = V.readNote('Back Squat');
  assert(note.indexOf('dos rond') >= 0 && note.indexOf('genou qui rentre') >= 0,
    'les DEUX observations sont là — la seconde ne remplace pas la première');
  assert(note === 'dos rond sur la dernière' + V.SEPARATOR + 'genou qui rentre à droite',
    'séparées par « · », dans l\'ordre de saisie');
  assert(typeof cache['Back Squat'].note === 'string',
    'la note reste UNE SEULE CHAÎNE — c\'est le format qu\'attendent renderHistory() et l\'export');
  assert(V.noteParts(note).length === 2, 'et se relit en deux observations');
});

scenario('saisies vides et espaces', () => {
  const { V } = boot();
  V.appendNote('Bench Press', '   ');
  assert(V.readNote('Bench Press') === '', 'une observation vide n\'écrit rien');
  V.appendNote('Bench Press', '  bonne  vitesse  ');
  assert(V.readNote('Bench Press') === 'bonne vitesse',
    'les espaces multiples sont normalisés, le texte est nettoyé');
});

// ── 2. Retrait : la note doit disparaître AUSSI de la séance sauvegardée ───
scenario('retrait d\'une observation', () => {
  const { V, cache } = boot();
  V.appendNote('Deadlift', 'A'); V.appendNote('Deadlift', 'B'); V.appendNote('Deadlift', 'C');
  V.removeNoteAt('Deadlift', 1);
  assert(V.readNote('Deadlift') === 'A' + V.SEPARATOR + 'C', 'seule l\'observation visée part');
  V.removeNoteAt('Deadlift', 9);
  assert(V.readNote('Deadlift') === 'A' + V.SEPARATOR + 'C', 'un index hors bornes ne casse rien');
  V.removeNoteAt('Deadlift', 0); V.removeNoteAt('Deadlift', 0);
  assert(V.readNote('Deadlift') === '' && cache['Deadlift'].note === '',
    'la dernière retirée laisse une CHAÎNE VIDE — ignorée par collectSessionResults(), donc rien ne part dans la séance');
});

scenario('effacement complet', () => {
  const { V, cache } = boot();
  V.appendNote('Row', 'X'); V.appendNote('Row', 'Y');
  V.clearNote('Row');
  assert(V.readNote('Row') === '' && cache['Row'].note === '', 'clearNote() vide la note du mouvement');
});

// ── 3. LE bug déjà corrigé une fois : la portée de séance ──────────────────
// Le cache n'est indexé QUE par nom de mouvement et survit tant que la page
// est ouverte. Sans portée, une note de lundi S1 réapparaît mercredi.
scenario('une note appartient à UNE séance', () => {
  const { sandbox, V } = boot({ cycle: { goal: 'force' }, week: 1, day: 'lundi' });
  V.buttonHtml('Back Squat', 'Back Squat');   // ancre le contexte de départ
  V.appendNote('Back Squat', 'note du lundi S1');
  assert(V.readNote('Back Squat') === 'note du lundi S1', 'la note existe dans sa séance');

  sandbox.state.day = 'mercredi';             // autre jour, même programme
  V.buttonHtml('Back Squat', 'Back Squat');
  assert(V.readNote('Back Squat') === '',
    'CHANGEMENT DE JOUR : la note de lundi ne réapparaît pas mercredi');
});

scenario('la semaine fait aussi partie de la séance', () => {
  const { sandbox, V } = boot({ cycle: { goal: 'force' }, week: 1, day: 'lundi' });
  V.buttonHtml('Bench Press', 'Bench Press');
  V.appendNote('Bench Press', 'note S1');
  sandbox.state.week = 2;
  V.buttonHtml('Bench Press', 'Bench Press');
  assert(V.readNote('Bench Press') === '', 'CHANGEMENT DE SEMAINE : la note de S1 ne suit pas en S2');
});

scenario('le programme fait aussi partie de la séance', () => {
  const { sandbox, V } = boot({ cycle: { goal: 'force' }, week: 1, day: 'lundi' });
  V.buttonHtml('Front Squat', 'Front Squat');
  V.appendNote('Front Squat', 'note programme force');
  sandbox.state.cycle = { goal: 'hypertrophie' };
  V.buttonHtml('Front Squat', 'Front Squat');
  assert(V.readNote('Front Squat') === '', 'CHANGEMENT DE PROGRAMME : la note ne traverse pas');
});

scenario('même séance : la note reste', () => {
  const { V } = boot({ cycle: { goal: 'force' }, week: 3, day: 'jeudi' });
  V.buttonHtml('Power Clean', 'Power Clean');
  V.appendNote('Power Clean', 'bonne réception');
  V.buttonHtml('Power Clean', 'Power Clean');   // même contexte, plusieurs rendus
  V.buttonHtml('Power Clean', 'Power Clean');
  assert(V.readNote('Power Clean') === 'bonne réception',
    'DANS la même séance, re-rendre la vue ne perd pas la note');
});

scenario('la clé de contexte prend les trois dimensions', () => {
  const { sandbox, V } = boot({ cycle: { goal: 'force' }, week: 4, day: 'vendredi' });
  const k = V.sessionContextKey();
  assert(k.indexOf('force') >= 0 && k.indexOf('4') >= 0 && k.indexOf('vendredi') >= 0,
    'programme, semaine et jour composent la clé de séance');
  sandbox.state.week = 5;
  assert(V.sessionContextKey() !== k, 'changer une seule dimension change la clé');
});

// ── 4. L'abandon ne touche QUE les notes ──────────────────────────────────
scenario('abandon de séance : poids et reps intacts', () => {
  const { cache, V } = boot();
  cache['Back Squat'] = { load: '225', reps: '5', rpe: '8' };
  V.appendNote('Back Squat', 'à surveiller');
  cache['Bench Press'] = { load: '155', reps: '8', rpe: '7' };

  V.dropSessionNotes();
  assert(cache['Back Squat'].note === '', 'la note part');
  assert(cache['Back Squat'].load === '225' && cache['Back Squat'].reps === '5' && cache['Back Squat'].rpe === '8',
    'POIDS, REPS ET RPE SURVIVENT — l\'abandon des notes n\'est pas une purge du cache');
  assert(cache['Bench Press'].load === '155' && cache['Bench Press'].note === undefined,
    'un mouvement sans note n\'est pas touché du tout');
});

// ── 5. Bornes de taille (quota localStorage partagé avec l'historique) ─────
scenario('bornes de taille', () => {
  const { V } = boot();
  V.appendNote('Squat', 'x'.repeat(5000));
  assert(V.readNote('Squat').length <= 1200,
    'une observation démesurée est plafonnée — le quota local est partagé avec tout l\'historique');

  // Le plafond PAR OBSERVATION doit mordre indépendamment du plafond total :
  // sans lui, deux observations bavardes mangent tout le budget et les
  // suivantes sont rognées. Quatre observations moyennes doivent toutes tenir.
  const { V: V3 } = boot();
  for(let i = 0; i < 4; i++) V3.appendNote('Squat', 'observation ' + i + ' ' + 'y'.repeat(400));
  assert(V3.noteParts(V3.readNote('Squat')).length === 4,
    'quatre observations bavardes tiennent toutes — chacune est bornée avant d\'entrer, pas la note à la fin');
  const { V: V2 } = boot();
  for(let i = 0; i < 40; i++) V2.appendNote('Squat', 'observation numéro ' + i + ' avec du texte de remplissage');
  assert(V2.readNote('Squat').length <= 1200, 'et le total par mouvement aussi');
});

// ── 6. Texte seulement : aucun stockage propre, aucun audio ───────────────
scenario('aucun stockage propre, aucun audio', () => {
  // Ne lire que les lignes EXÉCUTABLES : l'en-tête du module explique
  // justement pourquoi il n'utilise ni localStorage ni MediaRecorder, donc une
  // recherche sur le fichier entier se déclenche sur l'interdiction elle-même.
  // (Le même faux positif s'était produit sur le « npm ci » du workflow CI.)
  const code = read('scripts/session/voice_note.js')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))   // lignes entièrement commentées
    .map(l => l.replace(/(?<!:)\/\/.*$/, ''))       // commentaires en fin de ligne
    .join('\n');
  assert(!/localStorage/.test(code),
    'aucune clé de stockage créée : tout passe par guidedResultCache puis state.history');
  assert(!/MediaRecorder|getUserMedia|webkitSpeechRecognition/.test(code),
    'aucun audio enregistré ni reconnaissance vocale — texte seulement, des blobs satureraient le quota');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

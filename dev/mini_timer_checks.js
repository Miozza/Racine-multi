#!/usr/bin/env node
/*
  Racine — garde-fous : mini-chrono de la barre du haut (EMOM hors WOD + repos).

  Pourquoi ce fichier : un EMOM programmé ailleurs qu'en bloc `kind:"wod"`
  n'avait aucun chrono, et la correction touche trois endroits qui peuvent
  dériver séparément — la détection (quel bloc mérite un chrono, et de quelle
  durée), le comportement (cycle de minute, priorité sur le repos) et le coût
  d'affichage (le mini-chrono ne doit RIEN prendre aux cartes d'exercice).

  Le script exécute le VRAI module `scripts/session/mini_timer.js` dans un bac
  à sable sans DOM ni horloge réelle, et fait tourner sa détection sur les VRAIS
  programmes du catalogue.

  Contrat protégé :
    1. Un EMOM se déclare par « EMOM » SUIVI D'UN NOMBRE. Jamais par le mot
       AMRAP seul : « 3×AMRAP propre » (22 supersets d'accessoires) et
       « AMRAP @ 205 lb » (tests de fin de bloc) sont des séries menées à
       l'échec, pas des blocs au chrono.
    2. La durée vient de ce nombre, JAMAIS de `block.time` — qui est le créneau
       du bloc (12 min pour un EMOM de 8).
    3. Un bloc `kind:"wod"` n'arme jamais le mini-chrono : le chrono géant est
       déjà là et l'heure reste l'heure.
    4. Deux chronos, deux endroits : l'EMOM prend la barre du haut, le repos se
       décompte dans le chiffre de SA ligne. Ils peuvent donc tourner ensemble —
       deux comptes à rebours ne se contredisent que s'ils occupent le même
       espace. Le décompte RECOUVRE la consigne du programme, il ne l'écrase
       jamais : quitter le repos la rend telle quelle.
    5. Ré-armer le même bloc ne redémarre rien : sortir d'un EMOM en cours et y
       revenir doit le retrouver où il en est.
    6. COÛT ZÉRO PIXEL : l'EMOM écrit dans la boîte de l'heure
       (#guidedLiveClock) et le repos dans un chiffre déjà présent — jamais un
       nœud ajouté au flux de la carte. C'est ce qui protège les charges, reps,
       RPE et recommandations de poids.
    7. Aucune clé de stockage : il meurt avec la séance.

  Usage : node dev/mini_timer_checks.js
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
// Ni DOM ni horloge : les tics sont donnés à la main par api.tick(), donc la
// logique se vérifie à la seconde près sans attendre.
function boot(){
  const bips = [];
  const sandbox = {
    console: { log(){}, warn(){}, error(){} },
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {},
    bipCountdown: () => bips.push('countdown'),
    bipStart:     () => bips.push('start'),
    bipEmom:      () => bips.push('emom'),
    bipEnd:       () => bips.push('end'),
    vibrate:      () => {},
    resumeAudio:  () => {},
    guidedSoundMuted: () => false
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/session/mini_timer.js'), sandbox);
  return { M: sandbox.CoachMiniTimer, bips };
}

// Avance le chrono de n secondes.
function run(M, n){ for(let i = 0; i < n; i++) M.tick(); }

// ── 1. Détection sur le VRAI catalogue ─────────────────────────────────────
scenario('détection sur les programmes réels', () => {
  const { M } = boot();

  // Les programmes tournent dans leur propre bac à sable : seul `charge()` est
  // simulé (le moteur de charges n'est pas le sujet ici).
  const ps = { console:{log(){},warn(){},error(){}}, charge:(n,l)=>l, chargeText:x=>x,
               displayChargeText:x=>x, movements:{}, state:{} };
  ps.window = ps;
  vm.createContext(ps);
  for(const f of fs.readdirSync(path.join(root, 'programs'))){
    if(!f.endsWith('.js')) continue;
    try{ vm.runInContext(read('programs/' + f), ps); }catch(e){ /* programme non autonome : ignoré */ }
  }
  const P = ps.COACH_BERTIN_PROGRAMS || {};
  assert(Object.keys(P).length > 20, 'le catalogue réel est chargé (' + Object.keys(P).length + ' programmes)');

  let emom = 0, wodVus = 0, amrapSeries = 0, dureeDuBloc = 0;
  const parProgramme = {};
  for(const id of Object.keys(P)){
    const p = P[id];
    if(typeof p.getBlocks !== 'function') continue;
    const days = p.days || [];
    const nw = (p.weekLabels && p.weekLabels.length) || 8;
    for(let w = 1; w <= nw; w++) for(const d of days){
      let bs = [];
      try{ bs = p.getBlocks(d, w) || []; }catch(e){ continue; }
      bs.forEach(b => {
        if(!b) return;
        const hit = M.detect(b);
        if(b.kind === 'wod'){ if(hit) wodVus++; return; }

        // « 3×AMRAP propre » / « AMRAP @ 205 lb » : des séries à l'échec, pas
        // des blocs au chrono. Aucune ne doit produire de mini-chrono.
        const serieAmrap = (b.exercises || []).some(e => /AMRAP/i.test(String(e.format || ''))
                                                    && !/\bEMOM\s*\d/i.test(String(e.format || '')));
        if(serieAmrap && !hit) amrapSeries++;
        else if(serieAmrap && hit) amrapSeries -= 1000;   // rend l'échec visible

        if(!hit) return;
        emom++;
        (parProgramme[id] = parProgramme[id] || 0)
        parProgramme[id]++;

        // La durée vient du « EMOM n », jamais du créneau du bloc.
        const blocSec = (String(b.time || '').match(/(\d+)\s*min/) || [])[1];
        if(blocSec && Number(blocSec) * 60 !== hit.seconds) dureeDuBloc++;
      });
    }
  }

  assert(emom >= 30, 'les blocs EMOM hors WOD du catalogue sont détectés (' + emom + ' occurrences)');
  assert(Object.keys(parProgramme).length >= 5,
    'la détection ne dépend pas d\'un seul programme (' + Object.keys(parProgramme).length + ' programmes concernés)');
  assert(parProgramme.phase2_fable5 >= 7,
    'le vendredi de phase2_fable5 — le cas signalé — est couvert sur toutes ses semaines');
  assert(wodVus === 0, 'AUCUN bloc kind:"wod" n\'arme le mini-chrono : le chrono géant est déjà là');
  assert(amrapSeries > 0,
    'les séries « AMRAP propre » ne produisent aucun chrono (' + amrapSeries + ' blocs correctement ignorés)');
  assert(dureeDuBloc > 0,
    'au moins un bloc a un créneau différent de son EMOM, et c\'est l\'EMOM qui gagne (' + dureeDuBloc + ' cas)');
});

// ── 2. Détection — le cas exact signalé ────────────────────────────────────
scenario('le bloc du vendredi, tel qu\'il est écrit dans le programme', () => {
  const { M } = boot();
  const bloc = {
    time:'12 min', title:'A. Power Clean vitesse', tag:'Effort dynamique', kind:'main',
    exercises:[{name:'Power Clean', format:'EMOM 8 : 2 Power Clean', load:'160-170 lb', rest:'le reste de la minute', note:''}]
  };
  const hit = M.detect(bloc);
  assert(!!hit, 'un EMOM déclaré dans le FORMAT d\'un exercice est détecté (block.text est vide ici)');
  assert(hit.seconds === 8 * 60,
    'durée = 8 min, prise dans « EMOM 8 » — pas les 12 min du créneau de bloc');
  assert(hit.intervalSec === 60, 'cycle d\'une minute');
});
scenario('détection dans le texte du bloc', () => {
  const { M } = boot();
  const hit = M.detect({time:'8 min', kind:'conditioning',
    text:'EMOM 8 facile : minute 1 = 6 ring rows ; minute 2 = 8 push-ups.'});
  assert(hit && hit.seconds === 8 * 60, 'un bloc sans exercices, avec l\'EMOM dans son texte, est détecté');
});
scenario('ce qui ne doit RIEN déclencher', () => {
  const { M } = boot();
  assert(M.detect({kind:'main', time:'20 min', exercises:[{format:'AMRAP @ 205 lb'}]}) === null,
    'un test « AMRAP @ 205 lb » n\'est pas un bloc au chrono');
  assert(M.detect({kind:'accessory', time:'14 min', exercises:[{format:'3×AMRAP propre'}]}) === null,
    'une série menée à l\'échec n\'est pas un bloc au chrono');
  assert(M.detect({kind:'wod', time:'8 min', text:'EMOM 8 : min 1 = 12 cal Row.'}) === null,
    'un bloc WOD garde son chrono géant et son heure');
  assert(M.detect({kind:'main', time:'12 min', exercises:[{format:'5×3'}]}) === null,
    'un bloc de force classique n\'a pas de chrono');
  assert(M.detect({kind:'main', text:'EMOM 0 : rien'}) === null, 'une durée nulle est refusée');
  assert(M.detect({kind:'main', text:'EMOM 999'}) === null, 'une durée aberrante est refusée');
  assert(M.detect(null) === null && M.detect({}) === null, 'un bloc absent ou vide ne casse rien');
});

// ── 3. Cycle de minute et alertes ──────────────────────────────────────────
scenario('départ différé puis cycle de minute', () => {
  const { M, bips } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'v|1|1');
  assert(M.state().duration === 480 && !M.state().running, 'armé, à l\'arrêt, prêt à partir');

  M.start();
  assert(M.state().countdown === 10, 'départ différé de 10 s — on ne peut pas taper et être sous la barre en même temps');
  run(M, 9);
  assert(M.state().countdown === 1 && !M.state().running, 'toujours en compte à rebours à 1 s');
  run(M, 1);
  assert(M.state().running && M.state().elapsed === 0, 'le chrono part à zéro quand le rebours est fini');
  assert(bips.indexOf('start') >= 0, 'un signal marque le départ');

  run(M, 30);
  assert(M.cycleIndex() === 1 && M.cycleTotal() === 8, 'toujours dans la minute 1 sur 8 à 30 s');
  assert(M.cycleRemaining() === 30, '30 s restantes DANS la minute — pas le temps total');
  run(M, 30);
  assert(M.cycleIndex() === 2, 'la minute 2 commence à 60 s');
  assert(M.cycleRemaining() === 60, 'le cycle repart à 60 s, pas au temps total');
  assert(bips.filter(b => b === 'emom').length === 1, 'un seul bip de changement de minute');
});
scenario('paliers de couleur, identiques au chrono WOD', () => {
  const { M } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.start(); run(M, 10);   // rebours terminé, elapsed = 0

  // Les paliers sont épinglés à leur FRONTIÈRE, pas au milieu : c'est le seul
  // endroit où un seuil déplacé se voit. Testé une seconde avant et une
  // seconde après chaque bascule.
  assert(M.minuteState() === null, 'aucune alerte en début de minute');
  run(M, 29); assert(M.minuteState() === null, 'toujours rien à 31 s restantes');
  run(M, 1);  assert(M.minuteState() && M.minuteState().cls === 'emom-blue', 'bleu à 30 s restantes, pas avant');
  run(M, 19); assert(M.minuteState().cls === 'emom-blue', 'encore bleu à 11 s restantes');
  run(M, 1);  assert(M.minuteState().cls === 'emom-yellow', 'jaune à 10 s restantes, pas à 11');
  run(M, 6);  assert(M.minuteState().cls === 'emom-yellow', 'encore jaune à 4 s restantes');
  run(M, 1);  assert(M.minuteState().cls === 'emom-red', 'rouge à 3 s restantes, pas à 4');
  run(M, 3);  assert(M.minuteState().cls === 'emom-go', 'GO au changement de minute');
});
scenario('fin de l\'EMOM', () => {
  const { M, bips } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 2'}), 'k');
  M.start(); run(M, 10 + 120);
  assert(!M.state().running && M.state().finished, 'le chrono s\'arrête tout seul à la fin');
  assert(M.state().elapsed === 120, 'il ne dépasse jamais sa durée');
  run(M, 60);
  assert(M.state().elapsed === 120 && M.cycleIndex() === 2,
    'et il reste arrêté : une minute de plus ne le fait pas repartir en minute 3 sur 2');
  assert(bips.indexOf('end') >= 0, 'la fin a son propre signal');
  assert(bips.filter(b => b === 'emom').length === 1,
    'aucun bip de minute sur le dernier tic : la fin a déjà le sien');
  assert(M.minuteState() === null, 'plus aucune alerte de couleur une fois terminé');
});

// ── 4. Affichage — les deux fentes de l'heure ──────────────────────────────
scenario('ce qui s\'écrit dans la boîte de l\'heure', () => {
  const { M } = boot();
  assert(M.faceText() === null && M.ownsClockSlot() === false,
    'sans mini-chrono armé, l\'heure reste l\'heure');

  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  assert(M.ownsClockSlot() === true, 'armé, il prend la place de l\'heure');
  let f = M.faceText();
  assert(f.hm === 'EMOM' && f.sec === '8', 'à l\'arrêt : « EMOM » et la durée en minutes');

  M.start();
  f = M.faceText();
  assert(f.hm === 'PRÊT' && f.sec === '10', 'pendant le rebours : le décompte de départ');

  run(M, 10 + 22);
  f = M.faceText();
  assert(f.hm === '1/8', 'en marche : minute courante sur total');
  assert(f.sec === '38', 'secondes restantes DANS la minute — la seule chose qu\'on lit en action');
  assert(f.tone === 'run', 'hors alerte, le compteur garde son ton normal');
});
scenario('les chiffres virent avec la carte', () => {
  const { M } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.start(); run(M, 10);
  // Le ton du compteur et la classe de la carte doivent désigner le MÊME état à
  // chaque instant : deux couleurs différentes pour un seul évènement, c'est le
  // petit signal qu'on regarde en dernier qui ment.
  [[30, 'emom-blue'], [20, 'emom-yellow'], [7, 'emom-red'], [3, 'emom-go']].forEach(([pas, attendu]) => {
    run(M, pas);
    assert(M.faceText().tone === attendu && M.minuteState().cls === attendu,
      'à ' + attendu + ' : le compteur et la carte disent la même chose');
  });
});
scenario('les deux fentes restent courtes', () => {
  const { M } = boot();
  // La boîte de l'heure affiche « 12:45 » + « 30 ». Rien de plus long ne doit
  // y entrer, sinon la barre du haut déborde.
  M.armEmom(M.detect({kind:'main', text:'EMOM 12'}), 'k');
  M.start(); run(M, 10);
  for(let i = 0; i < 12 * 60; i++){
    const f = M.faceText();
    assert2(f.hm.length <= 6, 'étiquette ≤ 6 caractères à t=' + i + ' (« ' + f.hm + ' »)');
    assert2(f.sec.length <= 5, 'nombre ≤ 5 caractères à t=' + i + ' (« ' + f.sec + ' »)');
    M.tick();
  }
  assert(true, 'sur un EMOM 12 entier, aucune valeur affichée ne dépasse la largeur de l\'heure');
});
// Variante silencieuse : 720 lignes « ok » noieraient le reste.
function assert2(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } }

// ── 5. Repos et priorité ───────────────────────────────────────────────────
// Le repos ne vit plus dans la barre du haut : il se décompte dans le chiffre
// de SA ligne, à côté du mouvement qu'il concerne. Les deux chronos occupent
// donc deux espaces distincts et peuvent tourner ensemble.
function ligneRepos(){
  return {innerHTML:'<button data-rest-sec="150">2:30</button>',
          classList:{_s:new Set(), add(c){this._s.add(c);}, remove(){ for(const c of arguments) this._s.delete(c); },
                     contains(c){ return this._s.has(c); }}};
}
scenario('le repos se décompte dans sa ligne', () => {
  const { M, bips } = boot();
  const host = ligneRepos();
  const origine = host.innerHTML;

  assert(M.startRest(150, 'Power Clean#0', host) === true, 'un temps chiffré démarre un repos');
  assert(M.restState().running === true, 'il part tout de suite : le repos a déjà commencé');
  assert(M.ownsClockSlot() === false,
    'la barre du haut n\'est PAS prise : l\'heure reste l\'heure pendant un repos');
  assert(M.restFaceText() === '2:30', 'la ligne affiche le temps restant');
  assert(host.innerHTML.indexOf('2:30') >= 0 && host.classList.contains('is-running'),
    'c\'est bien la ligne « Repos » qui est repeinte, sur place');

  for(let i = 0; i < 90; i++) M.restTick();
  assert(M.restFaceText() === '1:00', 'le décompte descend');
  for(let i = 0; i < 45; i++) M.restTick();
  assert(M.restFaceText() === '15', 'sous une minute, les secondes seules');

  for(let i = 0; i < 15; i++) M.restTick();
  assert(M.restState().running === false && M.restFaceText() === 'GO', 'à zéro, la ligne dit GO');
  assert(bips.length > 0, 'la fin du repos est signalée');

  M.stopRest();
  assert(host.innerHTML === origine && !host.classList.contains('is-running'),
    'la consigne du programme est RENDUE telle quelle : le décompte la recouvre, il ne l\'écrase pas');
  assert(M.startRest(0, 'k', host) === false, 'une consigne non chiffrée ne lance rien');
});
scenario('EMOM et repos tournent ensemble', () => {
  const { M } = boot();
  const host = ligneRepos();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.start(); run(M, 10 + 5);

  // Deux comptes à rebours ne se contredisent que s'ils occupent le même
  // espace. Depuis qu'ils sont dans deux endroits distincts, la règle de
  // priorité qui les faisait s'exclure n'a plus d'objet.
  assert(M.startRest(60, 'k', host) === true,
    'un repos démarre pendant un EMOM : ils ne se disputent plus la même place');
  assert(M.state().mode === 'emom' && M.state().running, 'l\'EMOM continue sans être touché');
  assert(M.ownsClockSlot() === true, 'l\'EMOM garde la barre du haut');
  assert(M.restState().running === true, 'le repos tourne dans sa ligne');

  run(M, 5);
  for(let i = 0; i < 5; i++) M.restTick();
  assert(M.state().elapsed === 10 && M.restState().elapsed === 5,
    'les deux avancent indépendamment, chacun à son rythme');
});
scenario('un seul repos à la fois', () => {
  const { M } = boot();
  const a = ligneRepos(), b = ligneRepos();
  const origineA = a.innerHTML;
  M.startRest(90, 'A#0', a);
  M.startRest(60, 'B#1', b);
  assert(M.restState().key === 'B#1' && M.restState().duration === 60, 'le second repos remplace le premier');
  assert(a.innerHTML === origineA && !a.classList.contains('is-running'),
    'la première ligne a repris sa consigne : aucun décompte fantôme ne reste derrière');
});

// ── Lecture des consignes de repos ─────────────────────────────────────────
// `coachRestPicks` décide quel morceau d'une consigne est un temps décomptable.
// Une erreur ici se voit à deux endroits : un temps qui ne se lance pas, ou un
// nombre qui n'en est pas un et qui devient un minuteur.
scenario('les trois formes de consigne du catalogue', () => {
  const sandbox = {console:{log(){},warn(){},error(){}}};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/app_helpers.js'), sandbox);
  const picks = sandbox.coachRestPicks, long = sandbox.coachRestLongestSeconds;
  const temps = t => picks(t).filter(x => x.sec > 0).map(x => x.sec);

  assert(String(temps('1:00-2:30')) === '60,150', 'une plage m:ss donne ses DEUX bornes, séparément');
  assert(long('1:00-2:30') === 150,
    'et c\'est la borne LONGUE qui fait foi : « au moins 1:00, jusqu\'à 2:30 » — partir sur la basse pousse à reprendre trop tôt');
  assert(String(temps('1:00')) === '60', 'un temps seul donne un temps');
  assert(String(temps('0:30 avant C2')) === '30', 'le texte de contexte n\'est pas un temps');
  assert(picks('0:30 avant C2').some(x => x.sec === 0 && /avant C2/.test(x.text)),
    'ce texte est conservé tel quel : la consigne reste lisible');

  // 380 occurrences du catalogue sont écrites en secondes, sans « : ».
  // `parseRestToSeconds` les ignorait toutes.
  assert(String(temps('90 sec')) === '90', 'une consigne en secondes est lue');
  assert(String(temps('60-90 sec')) === '60,90', 'une plage en secondes donne ses deux bornes');
  assert(String(temps('90–120 sec')) === '90,120', 'le tiret demi-cadratin des programmes est reconnu');
  assert(long('90-150 sec') === 150, 'la borne longue gagne aussi en secondes');

  ['le reste de la minute', 'au besoin', 'qualité', '—', ''].forEach(t => {
    assert(temps(t).length === 0 && long(t) === 0, 'rien à décompter dans « ' + t + ' »');
  });

  // Bornes : sous 5 s ce n'est pas un repos, au-delà de 15 min c'est une faute
  // de saisie. Un nombre isolé sans unité n'est jamais un temps.
  assert(temps('3 sec').length === 0, 'trois secondes ne sont pas un repos');
  assert(temps('40:00').length === 0, 'quarante minutes de repos sont une erreur de saisie');
  assert(temps('3 séries lourdes').length === 0, 'un nombre sans unité de temps n\'est pas un repos');
  // Le nombre ne compte que s'il PRÉCÈDE l'unité. Sans cette contrainte, la
  // présence de « sec » quelque part ferait de tous les autres nombres de la
  // ligne des minuteurs.
  // Le nombre témoin doit dépasser la borne basse (5 s), sinon c'est elle qui
  // rejette l'intrus et l'assertion ne prouve plus rien.
  assert(String(temps('8 séries, 60 sec')) === '60',
    'dans « 8 séries, 60 sec », seul 60 est un temps — le 8 n\'en est pas un');
});
scenario('toutes les consignes réelles du catalogue', () => {
  const sandbox = {console:{log(){},warn(){},error(){}}};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/app_helpers.js'), sandbox);

  const ps = { console:{log(){},warn(){},error(){}}, charge:(n,l)=>l, chargeText:x=>x,
               displayChargeText:x=>x, movements:{}, state:{} };
  ps.window = ps;
  vm.createContext(ps);
  for(const f of fs.readdirSync(path.join(root, 'programs'))){
    if(!f.endsWith('.js')) continue;
    try{ vm.runInContext(read('programs/' + f), ps); }catch(e){}
  }
  const P = ps.COACH_BERTIN_PROGRAMS || {};
  const consignes = new Set();
  for(const id of Object.keys(P)){
    const p = P[id];
    if(typeof p.getBlocks !== 'function') continue;
    for(let w = 1; w <= ((p.weekLabels && p.weekLabels.length) || 8); w++)
      for(const d of (p.days || [])){
        let bs = [];
        try{ bs = p.getBlocks(d, w) || []; }catch(e){ continue; }
        bs.forEach(b => (b.exercises || []).forEach(e => { if(e.rest) consignes.add(String(e.rest)); }));
      }
  }
  assert(consignes.size > 50, consignes.size + ' consignes distinctes dans le catalogue');

  let lancables = 0, texte = 0, incoherent = 0;
  consignes.forEach(t => {
    const segs = sandbox.coachRestPicks(t);
    const l = sandbox.coachRestLongestSeconds(t);
    // Le texte rendu doit être EXACTEMENT la consigne : découper ne réécrit rien.
    if(segs.map(x => x.text).join('') !== t) incoherent++;
    if(l > 0) lancables++; else texte++;
  });
  assert(incoherent === 0, 'aucune consigne n\'est réécrite par le découpage : le texte rendu est identique à la source');
  assert(lancables >= 75, lancables + ' consignes sur ' + consignes.size + ' sont lançables');
  assert(texte <= 6, 'seules les consignes vraiment non chiffrées restent du texte (' + texte + ')');
});

// ── 6. Navigation entre blocs ──────────────────────────────────────────────
scenario('revenir sur un EMOM en cours ne le remet pas à zéro', () => {
  const { M } = boot();
  const cfg = M.detect({kind:'main', text:'EMOM 8'});
  M.armEmom(cfg, 'vendredi|1|1');
  M.start(); run(M, 10 + 90);
  const t = M.state().elapsed;
  assert(t === 90, 'le chrono est à 1:30');

  M.armEmom(cfg, 'vendredi|1|1');   // re-rendu du même bloc
  assert(M.state().elapsed === t && M.state().running,
    'ré-armer le MÊME bloc ne redémarre rien — sortir et revenir retrouve le chrono où il en est');

  M.armEmom(M.detect({kind:'main', text:'EMOM 6'}), 'vendredi|1|4');
  assert(M.state().elapsed === 0 && M.state().duration === 360,
    'un AUTRE bloc arme bien un chrono neuf');
});
scenario('le repos se raccroche à sa ligne après un re-rendu', () => {
  const { M } = boot();
  const host = ligneRepos();
  M.startRest(90, 'Back Squat#0', host);
  for(let i = 0; i < 20; i++) M.restTick();
  assert(M.restRemaining() === 70, 'le repos est à 1:10');

  // Re-rendu du MÊME bloc : la ligne est recréée, le repos doit la retrouver.
  const neuve = ligneRepos();
  const racine = {querySelector(sel){
    return sel.indexOf('Back Squat#0') >= 0 ? {querySelector(){ return neuve; }} : null;
  }};
  assert(M.rebindRest(racine) === true, 'il se raccroche à la ligne recréée');
  assert(M.restRemaining() === 70 && M.restState().running,
    'et il ne repart pas de zéro : un tap ailleurs qui redessine la carte ne coupe pas la pause');
  assert(neuve.innerHTML.indexOf('1:10') >= 0, 'la nouvelle ligne affiche le décompte en cours');

  // Bloc suivant : plus de ligne pour ce repos, il s'arrête.
  assert(M.rebindRest({querySelector(){ return null; }}) === false, 'sur un autre bloc, il ne se raccroche pas');
  assert(M.restState().mode === '' && !M.restRunning(),
    'et il s\'arrête : un repos appartient au mouvement en face duquel il est écrit');
});
scenario('contrôles', () => {
  const { M } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.toggle(); assert(M.state().countdown === 10, 'un tap démarre');
  M.toggle(); assert(!M.state().running && !M.state().countdown, 'un deuxième tap met en pause');
  M.start(); run(M, 10 + 20); M.pause();
  // En pause : la même face, éteinte par le ton. Un libellé « PAUSE » aurait
  // été le plus large gabarit du bloc et aurait rapetissé l'affichage courant.
  assert(M.faceText().hm === '1/8' && M.faceText().tone === 'paused',
    'en pause, la face ne change pas — seul le ton l\'éteint');
  M.reset();
  M.start(); run(M, 10 + 40);
  M.pause(); assert(M.state().elapsed === 40, 'la pause garde le temps écoulé');
  M.reset(); assert(M.state().elapsed === 0 && !M.state().running, 'l\'appui long remet à zéro');
});

// ── 7. Coût zéro pixel et absence de stockage ──────────────────────────────
// Contrôle EXÉCUTÉ, pas une lecture du source : on fait peindre le module dans
// un DOM espion et on regarde ce qu'il a réellement touché. Une interdiction
// textuelle de `createElement` serait fausse — le gabarit de mesure de police
// est un nœud, mais hors flux, donc sans coût.
scenario('le mini-chrono ne prend aucune hauteur aux cartes', () => {
  const ajoutes = [];
  const carte = {
    ecrit: [],
    className: 'guided-card kind-main',
    classList: {_s:new Set(), add(c){this._s.add(c);}, remove(){ for(const c of arguments) this._s.delete(c); },
                contains(c){ return this._s.has(c); }},
    setAttribute(n){ carte.ecrit.push('attr:' + n); },
    removeAttribute(){},
    set innerHTML(v){ carte.ecrit.push('innerHTML'); },
    appendChild(){ carte.ecrit.push('appendChild'); }
  };
  // La largeur mesurée dépend du texte : sans ça, tous les gabarits feraient la
  // même largeur et la stabilité de la taille ne serait pas testable. L'échelle
  // est choisie pour que toutes les tailles calculées tombent ENTRE les bornes
  // MINI_MIN_PX/MINI_MAX_PX : un écrêtage aux bornes masquerait la variation.
  const taillesPosees = [];
  function faireElement(){
    const n = {style:{setProperty(prop, val){ if(prop === 'font-size') taillesPosees.push(val); }},
            classList:{add(){},remove(){},contains(){return false;}},
            setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; }, innerHTML:'',
            textContent:'', addEventListener(){}, parentNode:null};
    n.getBoundingClientRect = function(){
      return {width: n.textContent ? n.textContent.length * 100 : 340, height:52};
    };
    return n;
  }
  const horloge = faireElement();
  horloge.parentNode = {getBoundingClientRect(){ return {width:340, height:52}; }};
  // La bande du haut, avec sa hauteur naturelle : c'est le budget que le
  // mini-chrono ne doit jamais dépasser.
  const BANDE_H = 52;
  horloge.closest = sel => (sel === '.guided-top'
    ? {offsetHeight:BANDE_H, getBoundingClientRect(){ return {width:340, height:BANDE_H}; }}
    : null);

  const sandbox = {
    console:{log(){},warn(){},error(){}},
    setInterval:()=>1, clearInterval:()=>{}, setTimeout:()=>1, clearTimeout:()=>{},
    vibrate(){}, resumeAudio(){}, guidedSoundMuted:()=>true,
    getComputedStyle:()=>({fontFamily:'Orbitron', fontWeight:'950', letterSpacing:'0em',
                           paddingLeft:'10px', paddingRight:'10px', gap:'10px', columnGap:'10px'}),
    document:{
      getElementById(id){ return id === 'guidedLiveClock' ? horloge : (id === 'guidedSession' ? {querySelector:()=>carte} : null); },
      createElement(){ const n = faireElement(); return n; },
      body:{ appendChild(n){ ajoutes.push(n); n.parentNode = {getBoundingClientRect(){ return {width:340,height:52}; }}; } }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('scripts/session/mini_timer.js'), sandbox);
  const M = sandbox.CoachMiniTimer;

  M.armEmom(M.detect({kind:'main', text:'EMOM 12'}), 'k');
  M.start();
  for(let i = 0; i < 200; i++) M.tick();   // rebours, plusieurs minutes, alertes

  assert(carte.ecrit.filter(x => x === 'innerHTML' || x === 'appendChild').length === 0,
    'la carte ne reçoit AUCUN contenu : sa hauteur, donc celle des charges/reps/RPE, ne peut pas bouger');
  assert(carte.ecrit.some(x => x === 'attr:data-emom-warning'),
    'la carte ne reçoit que son alerte de couleur — un attribut, pas un élément');
  assert(ajoutes.length <= 1,
    'un seul nœud créé en tout : le gabarit qui sert à mesurer la police');

  // RÈGLE VERROUILLÉE, la même que le chrono WOD : la taille se calcule sur un
  // GABARIT — le plus large affichage que ce bloc peut produire — jamais sur le
  // texte du moment. Sinon les chiffres changeraient de taille à chaque
  // seconde (« 1/9 3 » puis « 1/9 12 »), illisible en action.
  // BUDGET DE HAUTEUR. La largeur seule ne suffit pas : une police assez grande
  // fait grandir la bande, qui pousse la carte et reprend la hauteur promise aux
  // charges et aux reps. Mesuré en vrai à 69 px : bande +12 px, carte 721 → 709.
  const finales = taillesPosees.filter(v => v !== '26px');   // 26px = la passe de mesure
  const maxPose = Math.max(...finales.map(v => parseFloat(v)));
  assert(maxPose * 0.9 <= BANDE_H - 1,
    'la police tient dans la hauteur de la bande (' + maxPose + 'px × 0.9 ≤ ' + BANDE_H + ') : la bande ne grandit pas, donc la carte ne rétrécit pas');

  const distinctes = [...new Set(finales)];
  assert(finales.length > 100, 'la taille est bien repeinte à chaque seconde (' + finales.length + ' passes)');
  assert(distinctes.length === 1,
    'une seule taille sur tout le bloc : ' + distinctes.join(', ') + ' — elle ne saute pas d\'une seconde à l\'autre');

  // Géométrie où c'est la HAUTEUR qui borne, pas la largeur : sans ça le
  // plafond de hauteur ne serait jamais éprouvé — la largeur le devancerait.
  const posees = [];
  const BANDE = 52;
  function elLarge(){
    const n = {style:{setProperty(prop, val){ if(prop === 'font-size') posees.push(parseFloat(val)); }},
               classList:{add(){},remove(){},contains(){return false;}},
               setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; },
               innerHTML:'', textContent:'', addEventListener(){}, parentNode:null};
    // Caractères étroits : la largeur autorise une police énorme.
    n.getBoundingClientRect = function(){
      return {width: n.textContent ? n.textContent.length * 25 : 340, height:BANDE};
    };
    return n;
  }
  const h2 = elLarge();
  h2.parentNode = {getBoundingClientRect(){ return {width:340, height:BANDE}; }};
  h2.closest = sel => (sel === '.guided-top'
    ? {offsetHeight:BANDE, getBoundingClientRect(){ return {width:340, height:BANDE}; }}
    : null);
  const sb2 = {
    console:{log(){},warn(){},error(){}},
    setInterval:()=>1, clearInterval:()=>{}, setTimeout:()=>1, clearTimeout:()=>{},
    vibrate(){}, resumeAudio(){}, guidedSoundMuted:()=>true,
    getComputedStyle:()=>({fontFamily:'Orbitron', fontWeight:'950', letterSpacing:'0em',
                           paddingLeft:'0px', paddingRight:'0px', gap:'6px', columnGap:'6px'}),
    document:{ getElementById(id){ return id === 'guidedLiveClock' ? h2 : null; },
               createElement(){ return elLarge(); },
               body:{ appendChild(n){ n.parentNode = {getBoundingClientRect(){ return {width:340,height:BANDE}; }}; } } }
  };
  sb2.window = sb2;
  vm.createContext(sb2);
  vm.runInContext(read('scripts/session/mini_timer.js'), sb2);
  sb2.CoachMiniTimer.armEmom(sb2.CoachMiniTimer.detect({kind:'main', text:'EMOM 8'}), 'k');
  sb2.CoachMiniTimer.start();
  for(let i = 0; i < 30; i++) sb2.CoachMiniTimer.tick();
  const finalesLarge = posees.filter(v => v > 26);
  const plafond = Math.max(...finalesLarge);
  assert(finalesLarge.length > 0, 'une taille est bien calculée dans cette géométrie');
  assert(plafond * 0.9 <= BANDE - 1,
    'quand la largeur autoriserait plus, c\'est la HAUTEUR de la bande qui borne (' + plafond + 'px × 0.9 ≤ ' + (BANDE - 1) + ')');
  assert(plafond > 40, 'et le plafond reste généreux (' + plafond + 'px) : on borne, on ne bride pas');

  const src = read('scripts/session/mini_timer.js');
  assert(/getElementById\(['"]guidedLiveClock['"]\)/.test(src),
    'il écrit dans la boîte de l\'heure — c\'est ce qui rend le coût nul');
  assert(/position\s*=\s*'fixed'/.test(src) && /left\s*=\s*'-9999px'/.test(src),
    'le gabarit de mesure est hors flux et hors écran : il ne coûte aucune hauteur');

  const view = read('scripts/session/view.js');
  assert(!/html\s*\+=[^\n]*(miniTimer|CoachMiniTimer)/.test(view),
    'la vue ne rend jamais le mini-chrono dans le HTML de la carte');
  assert(/CoachMiniTimer\.detect\(b\)/.test(view) && /kind===["']wod["']/.test(view),
    'la détection est branchée hors de la branche WOD');

  const app = read('app.js');
  assert(/CoachMiniTimer\s*&&\s*CoachMiniTimer\.ownsClockSlot\(\)/.test(app),
    'l\'heure cède la place au mini-chrono au lieu d\'écrire par-dessus à contretemps');

  // La ligne « Repos » EST le minuteur : sans ces accroches, plus rien à taper.
  assert(/coachRestPicks\(e\.rest\)/.test(view),
    'la ligne Repos est découpée par le lecteur partagé, pas par une regex locale');
  assert(/guided-rest-pick[\s\S]*data-rest-sec=/.test(view),
    'chaque temps écrit devient sa propre cible, à l\'endroit où il est écrit');
  assert(/data-rest-longest=/.test(view) && /data-rest-key=/.test(view),
    'la ligne porte sa borne longue (repli) et sa clé (pour se raccrocher après un re-rendu)');
  assert(/CoachMiniTimer\.startRest\([\s\S]{0,120}?,\s*host\s*\)/.test(view),
    'le décompte est envoyé dans la ligne elle-même, pas dans la barre du haut');
  assert(/CoachMiniTimer\.rebindRest\(/.test(view),
    'un repos en cours est raccroché à chaque rendu');
});
scenario('aucune clé de stockage', () => {
  // Commentaires retirés : ils PARLENT de localStorage, ils ne l'utilisent pas.
  const src = read('scripts/session/mini_timer.js')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\/\/.*$/, '')).join('\n');
  assert(!/localStorage/.test(src), 'le mini-chrono ne crée aucune clé : il meurt avec la séance');
  assert(!/\.clear\(\)/.test(src), 'aucune suppression en masse (CLAUDE.md § 2.1)');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

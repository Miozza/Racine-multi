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
    4. L'EMOM est prioritaire sur le repos : deux comptes à rebours au même
       endroit se contrediraient.
    5. Ré-armer le même bloc ne redémarre rien : sortir d'un EMOM en cours et y
       revenir doit le retrouver où il en est.
    6. COÛT ZÉRO PIXEL : le mini-chrono écrit dans la boîte de l'heure
       (#guidedLiveClock), jamais dans le flux de la carte. C'est ce qui protège
       les charges, reps, RPE et recommandations de poids.
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
  assert(f.hm === 'DÉPART' && f.sec === '10', 'pendant le rebours : le décompte de départ');

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
scenario('minuteur de repos', () => {
  const { M, bips } = boot();
  assert(M.startRest(60, 'r') === true, 'un repos chiffré démarre');
  assert(M.state().running === true, 'un repos part tout de suite : il a déjà commencé');
  let f = M.faceText();
  assert(f.hm === 'REPOS' && f.sec === '1:00', 'affichage « REPOS » + temps restant');
  run(M, 45);
  assert(M.faceText().sec === '15', 'sous une minute, les secondes seules');
  run(M, 15);
  assert(M.ownsClockSlot() === false,
    'le repos fini rend la barre à l\'heure : il n\'a plus rien à dire');
  assert(bips.indexOf('end') >= 0, 'la fin du repos est signalée');
  assert(M.startRest(0, 'r') === false, 'une consigne non chiffrée ne lance rien');
});
scenario('l\'EMOM est prioritaire sur le repos', () => {
  const { M } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.start(); run(M, 10 + 5);
  assert(M.startRest(60, 'r') === false,
    'pendant un EMOM en cours, un repos ne peut pas prendre la place : deux comptes à rebours se contrediraient');
  assert(M.state().mode === 'emom' && M.state().running, 'l\'EMOM continue sans être touché');

  M.pause();
  assert(M.startRest(60, 'r') === true, 'EMOM en pause : le repos peut prendre la barre');
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
scenario('changer de bloc ne coupe pas un repos qui tourne', () => {
  const { M } = boot();
  M.startRest(90, 'r'); run(M, 20);
  assert(M.leaveBlock() === false && M.state().mode === 'rest',
    'le repos survit au changement de bloc : c\'est le mouvement qui change, pas la pause');
  M.disarm();
  assert(M.ownsClockSlot() === false, 'quitter la séance rend la barre à l\'heure');
});
scenario('contrôles', () => {
  const { M } = boot();
  M.armEmom(M.detect({kind:'main', text:'EMOM 8'}), 'k');
  M.toggle(); assert(M.state().countdown === 10, 'un tap démarre');
  M.toggle(); assert(!M.state().running && !M.state().countdown, 'un deuxième tap met en pause');
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
  const distinctes = [...new Set(taillesPosees)];
  assert(taillesPosees.length > 100, 'la taille est bien repeinte à chaque seconde (' + taillesPosees.length + ' passes)');
  assert(distinctes.length === 1,
    'une seule taille sur tout le bloc : ' + distinctes.join(', ') + ' — elle ne saute pas d\'une seconde à l\'autre');

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

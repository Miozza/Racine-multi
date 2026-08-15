#!/usr/bin/env node
/*
  Racine — garde-fous : son des chronos.

  Pourquoi ce fichier : les bips sont le seul retour de l'app quand l'athlète ne
  regarde PAS l'écran — sous une barre, en plein WOD. Une régression y est
  silencieuse au sens propre : rien ne casse, on ne l'entend simplement plus, et
  on s'en aperçoit une séance plus tard.

  Deux pannes réelles sont à l'origine de ces contrôles :
    - « pas de bip au premier chargement, puis ça marche » : `ctx.resume()` est
      ASYNCHRONE. Au tout premier geste, les bips programmés à `ctx.currentTime`
      tombaient dans le vide avant l'ouverture de la sortie. Le remède iOS est
      un tampon d'un échantillon MUET joué dans le geste lui-même.
    - « le son est trop aigu » : une onde carrée emporte ses harmoniques impairs
      jusqu'à l'aigu. C'est le timbre qui agresse, pas le volume — d'où un
      passe-bas et une transposition, choisis par l'athlète.

  Contrat protégé :
    1. Le déblocage muet existe et ne joue QU'UNE FOIS par contexte.
    2. Trois voix, un défaut, et le défaut est la plus grave : le réglage par
       défaut doit être le plus discret, pas le plus agressif.
    3. Les voix sont ordonnées et transposent TOUT du même facteur : les
       mélodies gardent leurs intervalles, seul le registre change.
    4. Plancher de fréquence : un haut-parleur de téléphone ne restitue presque
       rien sous ~260 Hz. Transposer sous ce plancher rendrait un bip inaudible
       au lieu de discret.
    5. Aucun bip ne contourne le mode muet, et le mode muet ne crée AUCUN nœud
       audio (pas un volume à zéro).
    6. Les cinq signaux restent appelés par les chronos : rebours, départ,
       minute EMOM, fin, fin de repos. Aucun ne doit disparaître en silence.

  Usage : node dev/sound_checks.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failures = 0;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }
function scenario(nom, fn){
  try{ fn(); }
  catch(e){ console.error('FAIL:', nom + ' — exception : ' + (e && e.message ? e.message : String(e))); failures++; }
}

// app.js dépend de tout le reste de l'app : on en extrait le domaine audio et
// on l'EXÉCUTE seul, avec un contexte Web Audio simulé qui enregistre ce qui est
// réellement créé et joué. Le contrat se vérifie donc sur le vrai code.
function bootAudio(){
  const src = read('app.js');
  const debut = src.indexOf('var audioCtx = null;');
  const fin = src.indexOf('// ─── Timer WOD ─');
  if(debut < 0 || fin < 0 || fin <= debut) throw new Error('domaine audio introuvable dans app.js');

  const journal = {oscillators:[], unlocks:0, sources:0, filtres:[], chaine:[], compresseurs:0};
  function param(){ return {setValueAtTime(v){ this.value = v; }, value:0}; }
  const ctx = {
    state:'running', currentTime:0,
    resume(){ ctx.state = 'running'; },
    createOscillator(){
      const o = {type:'sine', frequency:param(), connect(){}, start(){ journal.oscillators.push({f:o.frequency.value, type:o.type}); }, stop(){}};
      return o;
    },
    // On enregistre vers QUOI chaque nœud se branche : créer un filtre puis
    // l'oublier dans le câblage laisserait passer un son non filtré.
    createGain(){
      const g = {gain:{setValueAtTime(){}, exponentialRampToValueAtTime(){}},
                 connect(cible){ journal.chaine.push(cible && cible.__kind ? cible.__kind : 'sortie'); }};
      return g;
    },
    createBiquadFilter(){
      const f = {__kind:'passe-bas', type:'', frequency:param(), Q:param(), connect(){}};
      journal.filtres.push(f);
      return f;
    },
    createDynamicsCompressor(){
      journal.compresseurs++;
      return {threshold:param(), knee:param(), ratio:param(), attack:param(), release:param(), connect(){}, context:ctx};
    },
    createBuffer(ch, len, rate){ return {length:len, sampleRate:rate, getChannelData(){ return new Float32Array(len); }}; },
    createBufferSource(){
      const s = {buffer:null, connect(){}, start(){
        // Le tampon de déblocage fait UN échantillon et ne sonne pas ; un
        // tampon de bruit en fait des milliers et sonne. Ne pas les confondre.
        if(s.buffer && s.buffer.length === 1) journal.unlocks++;
        else journal.sources++;
      }};
      return s;
    },
    destination:{}
  };

  const sandbox = {
    console:{log(){},warn(){},error(){}}, Math, Number, String, Boolean, Object, Array, JSON, Float32Array,
    setTimeout(fn){ if(typeof fn === 'function') fn(); return 1; },
    state:{}, save(){},
    AudioContext: function(){ return ctx; }
  };
  sandbox.window = sandbox;
  const vm = require('vm');
  vm.createContext(sandbox);
  vm.runInContext(src.slice(debut, fin), sandbox, {filename:'app.js#audio'});
  return {S:sandbox, journal, ctx};
}

// ── 1. Le déblocage muet — la panne « premier chargement » ─────────────────
scenario('déblocage audio', () => {
  const {S, journal} = bootAudio();
  assert(journal.unlocks === 0, 'aucun déblocage tant que rien n\'est demandé');
  S.resumeAudio();
  assert(journal.unlocks === 1,
    'resumeAudio() joue un tampon MUET : sans lui, les premiers bips partent avant l\'ouverture de la sortie (bug du premier chargement)');
  S.resumeAudio(); S.resumeAudio();
  assert(journal.unlocks === 1, 'et une seule fois : pas un tampon à chaque appel');
  assert(journal.oscillators.length === 0, 'le déblocage ne produit AUCUN son');
});

// ── 2. Les voix ────────────────────────────────────────────────────────────
scenario('palette de voix', () => {
  const {S} = bootAudio();
  const V = S.COACH_BEEP_VOICES;
  const ids = Object.keys(V);
  assert(ids.length >= 4, 'plusieurs voix proposées (' + ids.join(', ') + ')');
  ids.forEach(id => {
    assert(V[id].label && V[id].hint, 'la voix « ' + id + ' » se présente avec un nom et une intention');
    assert(V[id].pitch > 0 && V[id].gain > 0 && typeof V[id].render === 'function',
      'la voix « ' + id + ' » a son registre, son niveau ET sa propre synthèse');
  });

  // Le point de tout l'exercice : ce sont des FAMILLES DE SONS, pas la même
  // onde transposée. Deux voix qui partagent leur synthèse seraient le même
  // bip plus ou moins grave — exactement ce qu'on cherchait à quitter.
  const rendus = new Set(ids.map(id => V[id].render));
  assert(rendus.size === ids.length,
    'chaque voix a une synthèse DIFFÉRENTE (' + rendus.size + ' sur ' + ids.length + ') : pas une transposition de la même onde');

  const defaut = S.COACH_BEEP_VOICE_DEFAULT;
  assert(V[defaut], 'la voix par défaut existe (' + defaut + ')');
  const pitches = ids.map(id => V[id].pitch);
  assert(V[defaut].pitch === Math.min.apply(null, pitches),
    'LE DÉFAUT EST LA PLUS GRAVE : on n\'impose pas le réglage le plus agressif à quelqu\'un qui n\'a rien demandé');
  assert(Math.max.apply(null, pitches) <= 0.7,
    'toutes les voix restent dans un registre bas (max ×' + Math.max.apply(null, pitches) + ') : c\'était la demande');

  // Les gains sont calibrés sur la CRÊTE, pas sur l'énergie : viser une énergie
  // égale est inatteignable — un maillet qui s'éteint en 0,3 s ne peut pas
  // porter autant qu'une onde tenue, et pousser le gain ne fait que saturer le
  // limiteur. Ce garde-fou empêche seulement qu'une voix parte à des valeurs
  // absurdes en croyant gagner du volume (mesuré : ×30 sur Bloc pour 0 dB).
  assert(ids.every(id => V[id].gain > 0 && V[id].gain <= 4),
    'aucun gain de voix ne part dans des valeurs qui ne feraient que saturer le limiteur');

  // Le plancher lui-même est une valeur physique, pas un réglage libre : un
  // haut-parleur de téléphone ne restitue presque rien sous ~200 Hz. L'abaisser
  // rendrait les bips graves inaudibles sans qu'aucun autre contrôle ne bronche.
  assert(S.COACH_BEEP_FLOOR_HZ >= 200 && S.COACH_BEEP_FLOOR_HZ <= 400,
    'le plancher reste dans ce qu\'un haut-parleur de téléphone sait produire (' + S.COACH_BEEP_FLOOR_HZ + ' Hz)');
});
scenario('chaque voix sonne, et reste dans les clous', () => {
  const {S, journal} = bootAudio();
  const V = S.COACH_BEEP_VOICES, plancher = S.COACH_BEEP_FLOOR_HZ;
  Object.keys(V).forEach(id => {
    S.state.guidedSoundVoice = id;
    journal.oscillators.length = 0; journal.sources = 0; journal.chaine.length = 0;
    S.bipCountdown(); S.bipStart(); S.bipEmom(); S.bipEnd(); S.bipRestDone();
    const sonne = journal.oscillators.length + journal.sources;
    assert(sonne >= 5, 'la voix « ' + V[id].label + ' » produit bien du son (' + sonne + ' sources)');
    assert(journal.oscillators.every(o => o.f >= plancher - 0.01),
      'la voix « ' + V[id].label + ' » ne descend jamais sous ' + plancher + ' Hz : plus bas, un haut-parleur de téléphone ne restitue rien');
  });
});
scenario('la transposition garde les mélodies', () => {
  const {S, journal} = bootAudio();
  function fondamentales(voix){
    S.state.guidedSoundVoice = voix;
    journal.oscillators.length = 0;
    S.bipStart(); S.bipEnd();
    // Un timbre peut empiler des partiels : seule la note la plus grave de
    // chaque évènement est la fondamentale.
    return journal.oscillators.map(o => o.f).filter((f, i, a) => a.indexOf(f) === i).sort((a, b) => a - b);
  }
  const V = S.COACH_BEEP_VOICES, ids = Object.keys(V);
  ids.forEach(id => {
    const n = fondamentales(id);
    assert(n.length > 0, 'la voix « ' + V[id].label + ' » joue des notes');
    assert(n[0] >= S.COACH_BEEP_FLOOR_HZ - 0.01, 'sa note la plus grave respecte le plancher (' + Math.round(n[0]) + ' Hz)');

    // Le registre est RÉELLEMENT appliqué : la note la plus grave du rebours
    // (880 Hz au programme) doit valoir 880 × pitch, plancher compris.
    S.state.guidedSoundVoice = id;
    journal.oscillators.length = 0;
    S.bipCountdown();
    const f0 = Math.min.apply(null, journal.oscillators.map(o => o.f));
    const attendu = Math.max(S.COACH_BEEP_FLOOR_HZ, 880 * V[id].pitch);
    assert(Math.abs(f0 - attendu) < 0.01,
      '« ' + V[id].label + ' » transpose bien : 880 Hz → ' + Math.round(f0) + ' Hz');
  });
  // La montée du départ et la descente de la fin appartiennent aux APPELANTS :
  // changer de voix ne doit pas changer le sens d'un signal.
  const src = read('app.js');
  assert(/function bipStart\(\)\{playBeep\(660[\s\S]{0,80}playBeep\(880/.test(src),
    'le départ monte (660 → 880) et c\'est l\'appelant qui le décide, pas la voix');
  assert(/function bipEnd\(\)\{playBeep\(440[\s\S]{0,80}playBeep\(330/.test(src),
    'la fin descend (440 → 330), quelle que soit la voix choisie');
});
scenario('choisir une voix', () => {
  const {S} = bootAudio();
  assert(S.coachBeepVoiceId() === S.COACH_BEEP_VOICE_DEFAULT, 'sans choix enregistré, c\'est le défaut qui sert');
  const autre = Object.keys(S.COACH_BEEP_VOICES).filter(id => id !== S.COACH_BEEP_VOICE_DEFAULT)[0];
  assert(S.setCoachBeepVoice(autre) === true && S.state.guidedSoundVoice === autre, 'un choix est retenu dans l\'état du profil');
  assert(S.coachBeepVoiceId() === autre, 'et il est relu');
  assert(S.setCoachBeepVoice('nawak') === false && S.state.guidedSoundVoice === autre,
    'une voix inconnue est refusée sans écraser le choix en place');
  S.state.guidedSoundVoice = 'inexistante';
  assert(S.coachBeepVoiceId() === S.COACH_BEEP_VOICE_DEFAULT,
    'un état corrompu retombe sur le défaut au lieu de casser le son');
});

// ── 3. Le muet, et les signaux qui doivent rester branchés ─────────────────
scenario('muet et branchements', () => {
  const timer = read('scripts/session/timer.js');
  ['bipCountdown', 'bipStart', 'bipEmom', 'bipEnd'].forEach(fn => {
    const rx = new RegExp('guidedSoundMuted\\(\\)[^\\n]*' + fn + '\\(\\)');
    assert(rx.test(timer), fn + ' ne se joue jamais sans passer par le test du muet');
  });
  assert(/muet[\s\S]{0,200}aucun n(œ|oe)ud/i.test(timer),
    'le contrat du muet est écrit là où il s\'applique : aucun nœud audio créé, pas un volume à zéro');

  // Les cinq signaux doivent rester appelés quelque part : un chrono qui perd
  // son bip ne lève aucune erreur, il devient juste muet.
  const tous = ['app.js', 'scripts/session/timer.js', 'scripts/session/mini_timer.js'].map(read).join('\n');
  [['bipCountdown', 'rebours'], ['bipStart', 'départ'], ['bipEmom', 'minute EMOM'],
   ['bipEnd', 'fin'], ['bipRestDone', 'fin de repos']].forEach(([fn, quoi]) => {
    const appels = (tous.match(new RegExp(fn + '\\b', 'g')) || []).length;
    assert(appels >= 3, 'le signal de ' + quoi + ' est défini ET utilisé (' + appels + ' occurrences)');
  });

  const ui = read('scripts/profiles/ui.js');
  // Viser le BOUTON, pas la sous-chaîne : « racine-voice-row » contient
  // « racine-voice » et faisait passer l'assertion même sans bouton.
  assert(/<button type="button" class="racine-voice/.test(ui),
    'Réglages rend bien un BOUTON par voix');
  assert(/data-voice="'\+esc\(id\)/.test(ui),
    'et chaque bouton porte l\'identifiant de sa voix');
  assert(/COACH_BEEP_VOICES/.test(ui),
    'la liste vient de la palette du moteur : ajouter une voix l\'ajoute à l\'écran, sans retoucher Réglages');
  assert(/querySelectorAll\("\[data-voice\]"\)|closest\("\[data-voice\]"\)/.test(ui),
    'et le panneau écoute ces boutons');
  assert(/playBeepVoicePreview/.test(ui),
    'le tap JOUE la voix : « doux » ou « clair » ne veut rien dire sans l\'entendre');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

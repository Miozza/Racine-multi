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

  const journal = {oscillators:[], unlocks:0, filtres:[], chaine:[], compresseurs:0};
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
    createBuffer(){ return {}; },
    createBufferSource(){ return {buffer:null, connect(){}, start(){ journal.unlocks++; }}; },
    destination:{}
  };

  const sandbox = {
    console:{log(){},warn(){},error(){}}, Math, Number, String, Boolean, Object, Array, JSON,
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
  assert(ids.length === 3, 'trois voix proposées (' + ids.join(', ') + ')');
  ids.forEach(id => {
    assert(V[id].label && V[id].hint, 'la voix « ' + id +' » se présente avec un nom et une intention');
    assert(V[id].pitch > 0 && V[id].tone > 0 && V[id].gain > 0, 'la voix « ' + id + ' » est complètement définie');
  });

  const defaut = S.COACH_BEEP_VOICE_DEFAULT;
  assert(V[defaut], 'la voix par défaut existe (' + defaut + ')');
  const pitches = ids.map(id => V[id].pitch);
  assert(V[defaut].pitch === Math.min.apply(null, pitches),
    'LE DÉFAUT EST LA PLUS GRAVE : on n\'impose pas le réglage le plus agressif à quelqu\'un qui n\'a rien demandé');

  // Ordonnées : plus la voix monte, plus elle est brillante et forte.
  const tri = ids.slice().sort((a, b) => V[a].pitch - V[b].pitch);
  for(let i = 1; i < tri.length; i++){
    assert(V[tri[i]].tone >= V[tri[i-1]].tone && V[tri[i]].gain >= V[tri[i-1]].gain,
      'la voix « ' + V[tri[i]].label + ' » est plus brillante ET plus forte que « ' + V[tri[i-1]].label + ' »');
  }
});
scenario('la transposition garde les mélodies', () => {
  const {S, journal} = bootAudio();
  function notes(voix){
    S.state.guidedSoundVoice = voix;
    journal.oscillators.length = 0;
    S.bipCountdown(); S.bipStart(); S.bipEmom(); S.bipEnd(); S.bipRestDone();
    return journal.oscillators.map(o => o.f);
  }
  const clair = notes('clair'), doux = notes('doux');
  assert(clair.length === doux.length && clair.length >= 9, 'les deux voix jouent le MÊME nombre de notes (' + clair.length + ')');

  const V = S.COACH_BEEP_VOICES, plancher = S.COACH_BEEP_FLOOR_HZ;
  let transposees = 0, plancheres = 0;
  clair.forEach((f, i) => {
    const attendu = Math.max(plancher, f * V.doux.pitch);
    assert(Math.abs(doux[i] - attendu) < 0.01, 'note ' + (i+1) + ' : ' + f + ' Hz → ' + Math.round(doux[i]) + ' Hz');
    if(doux[i] > plancher + 0.01) transposees++; else plancheres++;
  });
  assert(transposees >= 6, 'la plupart des notes sont réellement transposées, pas rabotées au plancher');
  assert(doux.every(f => f >= plancher - 0.01),
    'AUCUNE note ne descend sous le plancher : sous ~260 Hz un haut-parleur de téléphone ne restitue rien, le bip serait inaudible et non discret');
  assert(doux.every((f, i) => f <= clair[i] + 0.01), 'la voix douce ne monte jamais au-dessus de la claire');
});
scenario('le passe-bas suit la note', () => {
  const {S, journal} = bootAudio();
  S.state.guidedSoundVoice = 'doux';
  journal.filtres.length = 0; journal.oscillators.length = 0;
  S.bipEmom();
  assert(journal.filtres.length === journal.oscillators.length && journal.filtres.length > 0,
    'chaque bip passe par son filtre : c\'est le timbre qui agressait, pas le volume');
  assert(journal.filtres.every(f => f.type === 'lowpass'), 'un passe-bas, qui coupe l\'aigu');
  assert(journal.chaine.length > 0 && journal.chaine.every(c => c === 'passe-bas'),
    'et il est RÉELLEMENT dans la chaîne : le son passe par lui, il n\'est pas créé puis contourné');
  const f0 = journal.oscillators[0].f, coupe = journal.filtres[0].frequency.value;
  assert(coupe > f0 && coupe <= S.COACH_BEEP_TONE_MAX,
    'la coupure est au-dessus de la fondamentale (' + Math.round(f0) + ' → ' + Math.round(coupe) + ' Hz) : on garde la puissance, on enlève le cri');
  assert(coupe >= S.COACH_BEEP_TONE_MIN, 'et jamais sous ' + S.COACH_BEEP_TONE_MIN + ' Hz, sinon le bip devient sourd');
});
scenario('choisir une voix', () => {
  const {S} = bootAudio();
  assert(S.coachBeepVoiceId() === S.COACH_BEEP_VOICE_DEFAULT, 'sans choix enregistré, c\'est le défaut qui sert');
  assert(S.setCoachBeepVoice('clair') === true && S.state.guidedSoundVoice === 'clair', 'un choix est retenu dans l\'état du profil');
  assert(S.coachBeepVoiceId() === 'clair', 'et il est relu');
  assert(S.setCoachBeepVoice('nawak') === false && S.state.guidedSoundVoice === 'clair',
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
  assert(/class="racine-voice[\s\S]{0,120}?data-voice="/.test(ui),
    'Réglages rend bien un bouton par voix, porteur de son identifiant');
  assert(/querySelectorAll\("\[data-voice\]"\)|closest\("\[data-voice\]"\)/.test(ui),
    'et le panneau écoute ces boutons');
  assert(/playBeepVoicePreview/.test(ui),
    'le tap JOUE la voix : « doux » ou « clair » ne veut rien dire sans l\'entendre');
});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

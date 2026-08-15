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
    2. Une seule synthèse — une cloche en modulation de fréquence à rapport
       INHARMONIQUE. Le rapport non entier est ce qui fait entendre du métal
       plutôt qu'une note ; un rapport entier donnerait un orgue.
    3. Registre bas et plancher de fréquence : un haut-parleur de téléphone ne
       restitue presque rien sous ~240 Hz, et les bips d'origine étaient jugés
       trop aigus.
    4. La cloche est au maximum dès l'attaque et ne fait que décroître. Un mode
       qui gonflerait serait un gong — ce n'est pas le son retenu.
    5. La mélodie appartient aux SIGNAUX, pas au son : le départ monte, la fin
       descend, et on les distingue les yeux fermés.
    6. Aucun bip ne contourne le mode muet, et le mode muet ne crée AUCUN nœud
       audio (pas un volume à zéro).
    7. Les cinq signaux restent appelés par les chronos : rebours, départ,
       minute EMOM, fin, fin de repos. Aucun ne doit disparaître en silence.
    8. Le sélecteur de voix est parti en entier : ni palette, ni bouton
       d'écoute, ni réglage stocké qui prétendrait choisir quelque chose.

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

  const journal = {oscillators:[], unlocks:0, sources:0, filtres:[], chaine:[], enveloppes:[], compresseurs:0};
  function param(nom){ return {__kind:nom||null, setValueAtTime(v){ this.value = v; }, value:0}; }
  const ctx = {
    state:'running', currentTime:0,
    resume(){ ctx.state = 'running'; },
    createOscillator(){
      const o = {type:'sine', frequency:param('frequence'), connect(){}, start(){ journal.oscillators.push({f:o.frequency.value, type:o.type}); }, stop(){}};
      return o;
    },
    // On enregistre vers QUOI chaque nœud se branche : créer un filtre puis
    // l'oublier dans le câblage laisserait passer un son non filtré.
    createGain(){
      // On enregistre l'ENVELOPPE : c'est elle, et pas les fréquences, qui
      // distingue un gong (le mode aigu monte APRÈS l'attaque) d'une cloche
      // (tous les modes sont au maximum dès l'attaque et ne font que décroître).
      const trace = [];
      const g = {gain:{setValueAtTime(v){ trace.push(v); },
                       exponentialRampToValueAtTime(v){ trace.push(v); }},
                 __env:trace,
                 connect(cible){ journal.chaine.push(cible && cible.__kind ? cible.__kind : 'sortie'); }};
      journal.enveloppes.push(trace);
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

// ── 2. La cloche ───────────────────────────────────────────────────────────
// Une seule synthèse, arrêtée après en avoir comparé onze à l'écoute. Ce qui
// doit rester vrai n'est plus « la palette est cohérente » mais « cette cloche
// est bien celle qu'on a choisie » — sinon un réglage dérive en silence et
// personne ne s'en aperçoit avant la prochaine séance.
scenario('registre et niveau de la cloche', () => {
  const {S} = bootAudio();
  assert(typeof S.coachVoiceCloche === 'function', 'la synthèse de la cloche existe');
  assert(S.COACH_BEEP_PITCH > 0 && S.COACH_BEEP_PITCH <= 0.7,
    'elle sonne dans le registre BAS (×' + S.COACH_BEEP_PITCH + ') : les bips d\'origine étaient jugés trop aigus');
  assert(S.COACH_BEEP_GAIN > 0 && S.COACH_BEEP_GAIN <= 4,
    'son gain reste dans des valeurs qui ne font pas que saturer le limiteur (×' + S.COACH_BEEP_GAIN + ')');
  assert(S.COACH_BEEP_FLOOR_HZ >= 200 && S.COACH_BEEP_FLOOR_HZ <= 400,
    'le plancher reste dans ce qu\'un haut-parleur de téléphone sait produire (' + S.COACH_BEEP_FLOOR_HZ + ' Hz)');
});
scenario('c\'est bien une cloche', () => {
  const {S, journal} = bootAudio();
  journal.oscillators.length = 0;
  S.bipCountdown();                    // un seul évènement : 880 Hz au programme
  const f = journal.oscillators.map(o => o.f).sort((a, b) => a - b);
  assert(f.length === 2, 'deux oscillateurs : une porteuse et son modulateur (' + f.length + ')');

  // LE point : un rapport NON ENTIER. C'est lui qui fait entendre du métal
  // plutôt qu'une note — avec un rapport entier on obtiendrait un orgue.
  const rapport = f[1] / f[0];
  assert(Math.abs(rapport - 1.41) < 0.02,
    'rapport inharmonique de ' + rapport.toFixed(2) + ' : c\'est ce qui sonne métallique, pas une note');
  assert(Math.abs(rapport - Math.round(rapport)) > 0.15,
    'et il reste franchement NON entier — un rapport entier donnerait un son d\'orgue, pas de cloche');

  // Le modulateur doit être BRANCHÉ sur la fréquence de la porteuse. Créé mais
  // non câblé, il tourne dans le vide : il ne reste qu'un sinus, et la cloche
  // devient un bip. Deux oscillateurs ne prouvent rien, le câblage si.
  assert(journal.chaine.indexOf('frequence') >= 0,
    'le modulateur est branché sur la FRÉQUENCE de la porteuse — c\'est ça, la modulation de fréquence');

  const attendu = Math.max(S.COACH_BEEP_FLOOR_HZ, 880 * S.COACH_BEEP_PITCH);
  assert(Math.abs(f[0] - attendu) < 0.01,
    'la porteuse est bien transposée : 880 Hz → ' + Math.round(f[0]) + ' Hz');

  // Le plancher ne se voit que sur les notes GRAVES : à 880 Hz transposé il ne
  // mord pas. La fin de séance descend à 330 Hz, soit 181 Hz une fois
  // transposée — sous ce que restitue un haut-parleur de téléphone.
  journal.oscillators.length = 0;
  S.bipCountdown(); S.bipStart(); S.bipEmom(); S.bipEnd(); S.bipRestDone();
  const grave = Math.min.apply(null, journal.oscillators.map(o => o.f));
  assert(grave >= S.COACH_BEEP_FLOOR_HZ - 0.01,
    'aucune note ne descend sous le plancher, y compris la plus grave des cinq signaux (' + Math.round(grave) + ' Hz)');
  assert(330 * S.COACH_BEEP_PITCH < S.COACH_BEEP_FLOOR_HZ,
    'et le cas est réel : la note de fin tomberait à ' + Math.round(330 * S.COACH_BEEP_PITCH) + ' Hz sans le plancher');
});
scenario('l\'attaque brille puis s\'éteint', () => {
  const {S, journal} = bootAudio();
  journal.enveloppes.length = 0;
  S.bipEmom();
  // Une cloche est au maximum dès l'attaque et ne fait que décroître. Un mode
  // qui monterait DEUX fois de suite serait un gonflement de gong — ce n'est
  // pas ce son-là qu'on a retenu.
  const gonflants = journal.enveloppes.filter(env => {
    let montees = 0;
    for(let i = 1; i < env.length; i++){
      if(env[i] > env[i-1] * 1.05) montees++;
      else break;
    }
    return montees >= 2;
  }).length;
  assert(gonflants === 0,
    'aucun mode ne gonfle après la frappe : c\'est une cloche, pas un gong');
  assert(journal.enveloppes.length > 0, 'l\'enveloppe est bien pilotée');
});
scenario('la mélodie appartient aux signaux, pas au son', () => {
  const src = read('app.js');
  assert(/function bipStart\(\)\{playBeep\(660[\s\S]{0,80}playBeep\(880/.test(src),
    'le départ monte (660 → 880)');
  assert(/function bipEnd\(\)\{playBeep\(440[\s\S]{0,80}playBeep\(330/.test(src),
    'la fin descend (440 → 330) : deux signaux qu\'on distingue les yeux fermés');
});
scenario('le sélecteur de voix est bien parti', () => {
  // Onze voix ont été comparées puis une seule retenue. Ce qui reste ne doit
  // pas être un demi-sélecteur : ni palette, ni bouton d'écoute, ni réglage
  // stocké qui prétendrait choisir quelque chose.
  const src = read('app.js'), ui = read('scripts/profiles/ui.js'), css = read('styles.css');
  assert(!/COACH_BEEP_VOICES/.test(src), 'aucune palette résiduelle dans le moteur');
  assert(!/playBeepVoicePreview|setCoachBeepVoice|coachBeepVoiceId/.test(src),
    'aucune fonction de choix laissée derrière');
  assert(!/data-voice|racine-voice/.test(ui), 'Réglages ne propose plus de voix');
  assert(!/racine-voice/.test(css), 'et son style est parti avec');
  assert((src.match(/function coachVoice[A-Za-z]+\(/g) || []).length === 1,
    'une seule synthèse subsiste dans le code');
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

});

console.log(failures ? '\nÉCHEC : ' + failures + ' contrôle(s)' : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);

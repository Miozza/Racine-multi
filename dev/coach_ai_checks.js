#!/usr/bin/env node
/*
  Racine — garde-fous Coach IA.

  Ce domaine fait deux choses que rien d'autre ne faisait dans Racine : il
  appelle le réseau, et il écrit dans l'entraînement. Les vérifications
  ci-dessous protègent les frontières qui rendent ça acceptable.

  La plus importante est la première : LE MOTEUR GARDE LA MAIN SUR LES POIDS.
  Elle est vérifiée sur le schéma d'outils ET sur le nettoyage, parce qu'une
  consigne de prompt ne se teste pas alors qu'un schéma, si.

  Voir scripts/coach_ai/*, docs/COACH_AI.md et CLAUDE.md §2.1 / §3.2.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
// Les fichiers de ce domaine COMMENTENT abondamment les règles qu'ils
// respectent (« jamais de localStorage.clear() »). Une recherche brute
// attraperait ces commentaires et ferait échouer la suite sur sa propre
// documentation : on teste donc le code seul.
function code(p){
  return read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(function(l){ return l.replace(/(^|[^:])\/\/.*$/, '$1'); })
    .join('\n');
}
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

const DOMAIN = [
  'scripts/coach_ai/config.js',
  'scripts/coach_ai/context.js',
  'scripts/coach_ai/plan.js',
  'scripts/coach_ai/client.js',
  'scripts/coach_ai/patch.js',
  'scripts/coach_ai/chat.js',
  'scripts/coach_ai/ui.js',
  'scripts/coach_ai/index.js'
];

// ── Câblage statique ────────────────────────────────────────────────────────
const html = read('index.html');
DOMAIN.forEach(function(f){
  assert(html.indexOf(f) !== -1, 'Chargé par index.html : ' + f);
});
assert(html.indexOf('programs/ai_custom.js') !== -1, 'Programme ai_custom chargé par index.html.');
assert(read('programs/index.js').indexOf('"ai_custom"') !== -1, 'ai_custom déclaré dans programs/index.js.');
assert(/id:\s*"ai_custom"[^}]*visibility:\s*"private"/.test(read('programs/index.js')),
  'ai_custom reste PRIVÉ : un programme dont le contenu est généré ne se publie pas au catalogue client.');
assert(read('programs/workouts.js').indexOf('CoachAIPlan.applyToWorkout') !== -1,
  'buildWorkout applique les ajustements Coach IA (entonnoir unique).');
assert(code('programs/workouts.js').indexOf('state.aiPlan') === -1,
  'programs/workouts.js ne lit pas state.aiPlan directement (délégation seulement).');
assert(read('scripts/app_navigation.js').indexOf('"coachai"') !== -1, 'Vue coachai déclarée dans la navigation.');

// ── Règle n°1 : aucun outil ne peut écrire une charge ───────────────────────
const patchSrc = read('scripts/coach_ai/patch.js');
const ctxPatch = {window:{}, console:console, localStorage:fakeStorage()};
ctxPatch.window.window = ctxPatch.window;
vm.createContext(ctxPatch);
vm.runInContext(patchSrc, ctxPatch, {filename:'patch.js'});
const CoachAIPatch = ctxPatch.window.CoachAIPatch;

const toolsJson = JSON.stringify(CoachAIPatch.tools());
// Tout ce qui pourrait servir à faire passer un poids dans un patch.
['"load"', '"charge"', '"poids"', '"weight"', '"lb"', '"kg"', '"pct"', '"pourcentage"', '"1rm"'].forEach(function(needle){
  assert(toolsJson.toLowerCase().indexOf(needle) === -1,
    'Aucun champ de charge dans le schéma des outils : ' + needle);
});
assert(toolsJson.indexOf('intention') !== -1,
  'Le canal d\'intensité prévu (champ `intention`) existe bien — sinon le modèle n\'a aucun moyen légitime de dire « léger ».');

// ── Règle n°1 bis : le nettoyage efface une charge même si elle passe ───────
const planSrc = read('scripts/coach_ai/plan.js');
const ctxPlan = {window:{}, console:console};
ctxPlan.window.window = ctxPlan.window;
ctxPlan.state = {};
ctxPlan.save = function(){};
ctxPlan.window.state = ctxPlan.state;
vm.createContext(ctxPlan);
vm.runInContext(planSrc, ctxPlan, {filename:'plan.js'});
const CoachAIPlan = ctxPlan.window.CoachAIPlan;

const hostile = CoachAIPlan.sanitizeWeek({
  label: 'Semaine test',
  days: {
    lundi: [{
      title: 'A. Squat', kind: 'main', time: '15 min',
      exercises: [{name:'Back Squat', format:'5×5', load:'315 lb', charge:275, note:'monte lourd', intention:'technique'}]
    }]
  }
});
assert(!!hostile, 'sanitizeWeek accepte une semaine valide.');
const ex = hostile.days.lundi[0].exercises[0];
assert(ex.load === '—', 'sanitizeExercise EFFACE la charge écrite par le modèle (load ramené à "—").');
assert(ex.charge === undefined, 'Aucun champ parasite ne survit au nettoyage.');
assert(ex.note.indexOf('technique') !== -1, 'L\'intention est reportée dans la note, où le moteur la lit.');
assert(ex.name === 'Back Squat' && ex.format === '5×5', 'Nom et format sont conservés tels quels.');

// kind inconnu ramené dans la liste du contrat de bloc
const weird = CoachAIPlan.sanitizeWeek({days:{mardi:[{title:'X', kind:'inventé', text:'quelque chose'}]}});
assert(weird && weird.days.mardi[0].kind === 'accessory', 'Un kind hors contrat est ramené à "accessory".');

// ── Écriture, relecture, retour en arrière ──────────────────────────────────
let res = CoachAIPlan.setWeek(2, {label:'S2', days:{lundi:[{title:'A', kind:'main', exercises:[{name:'Bench Press', format:'4×8'}]}]}});
assert(res.ok, 'setWeek écrit une semaine.');
assert(ctxPlan.state.aiPlan && ctxPlan.state.aiPlan.schema === 1, 'Le plan porte un numéro de schéma (migration possible).');
assert(CoachAIPlan.blocksFor('lundi', 2).length === 1, 'blocksFor relit la semaine écrite.');
assert(CoachAIPlan.blocksFor('lundi', 9) === null, 'Une semaine non générée ne renvoie rien (pas de séance inventée).');

CoachAIPlan.setWeek(2, {label:'S2 bis', days:{mardi:[{title:'B', kind:'main', exercises:[{name:'Deadlift', format:'3×3'}]}]}});
assert(CoachAIPlan.undo().ok, 'undo() existe et réussit.');
assert(CoachAIPlan.getWeek(2).label === 'S2', 'undo() rend bien la version précédente.');

// Migration ascendante : un plan d'une version antérieure garde ses semaines.
ctxPlan.state.aiPlan = {weeks:{'3':{label:'ancienne', days:{lundi:[]}}}};
assert(CoachAIPlan.get().weeks['3'], 'Un plan sans champ `schema` est migré sans perdre ses semaines.');

// ── Ajustements : surcouche, jamais mutation du template ───────────────────
ctxPlan.state.aiPlan = null;
CoachAIPlan.addAdjustment({week:1, day:'lundi', movement:'Back Squat', format:'5×3', note:'dos sensible'});
const template = {title:'A', exercises:[{name:'Back Squat', format:'4×8', note:'original'}]};
const w = CoachAIPlan.applyToWorkout({blocks:[template]}, 'lundi', 1);
assert(w.blocks[0].exercises[0].format === '5×3', 'L\'ajustement change le format affiché.');
assert(template.exercises[0].format === '4×8', 'Le bloc du programme n\'est PAS muté (copie, comme RacineMovementSwaps).');
assert(w.blocks[0].exercises[0].note.indexOf('original') !== -1, 'La note d\'origine est conservée.');
assert(w.blocks[0].exercises[0].note.indexOf('Coach IA') !== -1, 'L\'origine du changement est visible dans la note.');
const other = CoachAIPlan.applyToWorkout({blocks:[{title:'A', exercises:[{name:'Back Squat', format:'4×8'}]}]}, 'mardi', 1);
assert(other.blocks[0].exercises[0].format === '4×8', 'Un ajustement ne déborde pas sur un autre jour.');

// ── Rien n'est appliqué sans le geste de l'athlète ──────────────────────────
const chatSrc = read('scripts/coach_ai/chat.js');
assert(code('scripts/coach_ai/chat.js').indexOf('CoachAIPatch.apply') === -1,
  'chat.js n\'applique JAMAIS un patch : seul le geste Accepter le fait (scripts/coach_ai/ui.js).');
assert(chatSrc.indexOf('isProposal') !== -1 && chatSrc.indexOf('En attente de sa décision') !== -1,
  'Une proposition renvoie un tool_result d\'attente et arrête la boucle.');
assert(read('scripts/coach_ai/ui.js').indexOf('data-cai-accept') !== -1,
  'L\'écran expose un bouton Accepter explicite.');

// ── Données durables : aucune suppression en masse ─────────────────────────
DOMAIN.concat(['programs/ai_custom.js']).forEach(function(f){
  const src = code(f);
  assert(src.indexOf('localStorage.clear') === -1, 'Aucun localStorage.clear() dans ' + f + '.');
  assert(!/\.removeItem\((?!\s*(storageKey\(\)|KEY))/.test(src),
    'Aucune suppression de clé non ciblée dans ' + f + '.');
});
assert(code('scripts/coach_ai/chat.js').indexOf('localStorage.removeItem(storageKey())') !== -1,
  'clear() de la conversation ne touche QUE la clé de conversation.');

// ── Plafonds : le quota local n'a pas de copie serveur ─────────────────────
assert(/MAX_MESSAGES\s*=\s*\d+/.test(chatSrc) && chatSrc.indexOf('slice(-MAX_MESSAGES)') !== -1,
  'La conversation est plafonnée.');
assert(/LOG_MAX\s*=\s*\d+/.test(patchSrc) && patchSrc.indexOf('slice(-LOG_MAX)') !== -1,
  'Le journal des propositions est plafonné.');
assert(planSrc.indexOf('slice(-MAX_ADJUSTMENTS)') !== -1, 'Les ajustements sont plafonnés.');
assert(/MAX_TOOL_ROUNDS\s*=\s*\d+/.test(chatSrc) && chatSrc.indexOf('rounds < MAX_TOOL_ROUNDS') !== -1,
  'La boucle d\'outils est bornée (garde-fou de coût).');

// ── La clé API ne voyage pas ───────────────────────────────────────────────
const configSrc = read('scripts/coach_ai/config.js');
assert(code('scripts/coach_ai/config.js').indexOf('state.') === -1,
  'La clé API n\'est jamais écrite dans le state d\'un profil — donc jamais dans un export JSON.');
assert(configSrc.indexOf('racine_coach_ai_device_v1') !== -1, 'La clé vit dans une clé de stockage propre à l\'appareil.');
['scripts/ai/ai_export.js', 'scripts/profiles/prescription.js'].forEach(function(f){
  assert(code(f).indexOf('CoachAIConfig') === -1, f + ' n\'a pas accès à la configuration Coach IA.');
});

// ── Le contexte envoyé au modèle est en lecture seule ──────────────────────
const contextSrc = read('scripts/coach_ai/context.js');
assert(code('scripts/coach_ai/context.js').indexOf('localStorage.setItem') === -1 && code('scripts/coach_ai/context.js').indexOf('save()') === -1,
  'context.js ne écrit rien : il ne fait que lire l\'état pour le résumer.');
assert(/SESSIONS_LIMIT\s*=\s*\d+/.test(contextSrc) && /NOTES_LIMIT\s*=\s*\d+/.test(contextSrc),
  'Le contexte envoyé est borné (un historique de deux ans ne part pas dans un prompt).');

// ── L'appel réseau est explicite et isolé ──────────────────────────────────
const clientSrc = read('scripts/coach_ai/client.js');
assert(clientSrc.indexOf('anthropic-dangerous-direct-browser-access') !== -1,
  'L\'en-tête d\'accès navigateur direct est présent (sans lui, CORS refuse tout).');
assert(clientSrc.indexOf('anthropic-version') !== -1, 'La version d\'API est épinglée.');
DOMAIN.filter(function(f){ return f !== 'scripts/coach_ai/client.js'; }).forEach(function(f){
  assert(code(f).indexOf('fetch(') === -1, 'Un seul fichier fait du réseau : ' + f + ' n\'appelle pas fetch().');
});

// ── Sortie ─────────────────────────────────────────────────────────────────
function fakeStorage(){
  const store = {};
  return {
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function(k, v){ store[k] = String(v); },
    removeItem: function(k){ delete store[k]; }
  };
}

if(errors.length){
  console.error('\n✗ coach_ai_checks — ' + errors.length + ' échec(s) :');
  errors.forEach(function(e){ console.error('  ✗ ' + e); });
  process.exit(1);
}
console.log('✓ coach_ai_checks — ' + notes.length + ' vérifications passées.');

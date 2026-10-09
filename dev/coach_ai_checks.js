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
  'scripts/coach_ai/bridge.js',
  'scripts/coach_ai/chat.js',
  'scripts/coach_ai/ui.js',
  'scripts/coach_ai/index.js'
];

// ── Câblage statique ────────────────────────────────────────────────────────
const html = read('index.html');
DOMAIN.forEach(function(f){
  assert(html.indexOf(f) !== -1, 'Chargé par index.html : ' + f);
});
assert(html.indexOf('programs/archive/ai_custom.js') !== -1, 'Programme ai_custom archivé mais toujours chargé (aucun profil ne tombe sur « Programme absent »).');
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
DOMAIN.concat(['programs/archive/ai_custom.js']).forEach(function(f){
  const src = code(f);
  assert(src.indexOf('localStorage.clear') === -1, 'Aucun localStorage.clear() dans ' + f + '.');
  assert(!/\.removeItem\((?!\s*(storageKey\(\)|legacyKey\(\)|memoryKey\(\)|KEY))/.test(src),
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

// ── Modèle économique et plafond mensuel (V5.2.6) ──────────────────────────
//
// Cible : moins de 1 $ par mois. Haiku 4.5 par défaut, un compteur de dépense
// d'appareil, et un plafond vérifié avant chaque appel.
{
  const store = fakeStorage();
  const c = {window:{}, console:console, localStorage:store, Date:Date, JSON:JSON, Number:Number, Object:Object, String:String, isFinite:isFinite};
  c.window.window = c.window;
  vm.createContext(c);
  // Config schéma 1 telle qu'écrite par V5.2.5 : ancien défaut Opus, clé présente.
  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:1, apiKey:'sk-ant-test', model:'claude-opus-5', effort:'high', assistant:'claude', enabled:true}));
  vm.runInContext(configSrc, c, {filename:'config.js'});
  const Cfg = c.window.CoachAIConfig;

  let cfg = Cfg.get();
  assert(cfg.schema === 3, 'La config porte le schéma 3.');
  assert(cfg.apiKey === 'sk-ant-test' && cfg.effort === 'high', 'Migration 1 → 2 : clé et réglages conservés.');
  assert(cfg.model === 'claude-haiku-5-5', 'Migration 1 → 3 : l\'ancien défaut Opus (jamais choisi à la main) passe à Haiku, puis à son successeur Haiku 5.5.');
  assert(cfg.monthlyBudget === 1, 'Plafond mensuel par défaut : 1 $.');

  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:1, apiKey:'k', model:'claude-sonnet-5-5'}));
  assert(Cfg.get().model === 'claude-sonnet-5-5', 'Un modèle autre que l\'ancien défaut n\'est pas écrasé par la migration.');
  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:2, apiKey:'k', model:'claude-opus-5', monthlyBudget:3}));
  assert(Cfg.get().model === 'claude-opus-5-5', 'Opus choisi au schéma 2 reste Opus : il passe à son successeur direct, Opus 5.5.');
  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:2, apiKey:'k', model:'claude-haiku-4-5'}));
  assert(Cfg.get().model === 'claude-haiku-5-5', 'Migration 2 → 3 : Haiku 4.5 passe à Haiku 5.5 (meilleur, 10× moins cher).');
  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:3, apiKey:'k', model:'claude-haiku-4-5'}));
  assert(Cfg.get().model === 'claude-haiku-4-5', 'Un modèle choisi APRÈS le schéma 3 est un vrai choix : conservé.');
  assert(Cfg.models().every(function(m){ return !/4-5|opus-5$/.test(m.id); }) && Cfg.models().length === 3,
    'La liste propose les trois modèles actuels, pas les anciens.');
  assert(Cfg.modelInfo('claude-haiku-5-5').effort === true && !Cfg.modelInfo('claude-haiku-5-5').fallback
    && Cfg.modelInfo('claude-opus-5-5').fallback === true, 'Haiku 5.5 : effort oui, repli serveur non ; Opus 5.5 : repli serveur.');

  assert(Cfg.modelInfo('claude-haiku-4-5').effort === false, 'Haiku 4.5 : ni effort ni réflexion adaptative (sinon 400).');
  assert(Cfg.modelInfo('modele-inconnu').input >= 5, 'Modèle inconnu : compté au prix fort (plafond prudent).');

  const usage = {input_tokens:10000, output_tokens:1000, cache_creation_input_tokens:0, cache_read_input_tokens:0};
  assert(Math.abs(Cfg.costOf('claude-haiku-4-5', usage) - 0.015) < 1e-9, 'Coût Haiku : 10k entrée + 1k sortie = 0,015 $.');
  assert(Math.abs(Cfg.costOf('claude-haiku-4-5', {cache_read_input_tokens:10000}) - 0.001) < 1e-9, 'Lecture en cache comptée à 0,1×.');

  Cfg.set({monthlyBudget: 0.02});
  Cfg.recordUsage('claude-haiku-4-5', usage);
  assert(!Cfg.overBudget() && Cfg.monthSpend().calls === 1, 'Sous le plafond : l\'appel passe.');
  Cfg.recordUsage('claude-haiku-4-5', usage);
  assert(Cfg.overBudget(), 'Plafond atteint : overBudget() le dit.');
  Cfg.set({monthlyBudget: 0});
  assert(!Cfg.overBudget(), 'Plafond 0 = pas de plafond.');
  assert(JSON.parse(store.getItem('racine_coach_ai_device_v1')).apiKey === 'k', 'Enregistrer le plafond ne touche pas la clé.');
  Cfg.set({apiKey: '\u200B "sk-ant-api03-abc\u00A0def" \n'});
  assert(Cfg.get().apiKey === 'sk-ant-api03-abcdef', 'Clé collée : espaces, guillemets et caractères invisibles retirés.');
  store.setItem('racine_coach_ai_device_v1', JSON.stringify({schema:2, apiKey:'\uFEFFsk-ant-api03-xyz ', model:'claude-haiku-4-5'}));
  assert(Cfg.get().apiKey === 'sk-ant-api03-xyz', 'Une clé déjà enregistrée avec un caractère invisible est réparée à la lecture.');
  const preview = Cfg.keyPreview();
  assert(preview.indexOf('sk-ant-api') !== -1 && preview.indexOf('xyz') === -1 && preview.indexOf('16 caractères') !== -1,
    'L\'aperçu de la clé montre son préfixe et sa longueur, jamais la partie secrète.');
  assert(configSrc.indexOf('racine_coach_ai_usage_v1') !== -1 && /USAGE_MONTHS\s*=\s*\d+/.test(configSrc)
    && configSrc.indexOf('slice(-USAGE_MONTHS)') !== -1,
    'Le compteur de dépense vit dans une clé d\'appareil, plafonnée.');
}
{
  const cl = code('scripts/coach_ai/client.js');
  assert(cl.indexOf('CoachAIConfig.overBudget()') !== -1 && cl.indexOf('CoachAIConfig.overBudget()') < cl.indexOf('fetch('),
    'client.js vérifie le plafond AVANT l\'appel réseau.');
  assert(/if\(CoachAIConfig\.modelInfo\(model\)\.effort\)\{\s*body\.thinking/.test(cl),
    'Effort et réflexion ne sont envoyés qu\'aux modèles qui les acceptent.');
  assert(/CoachAIConfig\.recordUsage\((payload\.model \|\| )?model, payload\.usage\)/.test(cl),
    'Chaque réponse est comptée d\'après le `usage` déclaré par l\'API.');
}

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

// ── Le pont copier-coller : même contrat, mêmes limites ────────────────────
//
// C'est le chemin PAR DÉFAUT (un abonnement Pro ne couvre pas l'API). Il ne
// doit surtout pas devenir une porte dérobée : un patch collé à la main n'a
// pas plus de pouvoir qu'un patch venu de l'API.
const bridgeSrc = read('scripts/coach_ai/bridge.js');
const ctxBridge = {window:{}, console:console};
ctxBridge.window.window = ctxBridge.window;
vm.createContext(ctxBridge);
vm.runInContext(patchSrc, ctxBridge, {filename:'patch.js'});
vm.runInContext(bridgeSrc, ctxBridge, {filename:'bridge.js'});
const CoachAIBridge = ctxBridge.window.CoachAIBridge;

// Le contrat envoyé au modèle est ENGENDRÉ depuis tools() : une seule
// définition de ce qui est proposable, donc aucune dérive possible entre le
// chemin API et le chemin copier-coller.
const contract = ctxBridge.window.CoachAIPatch.contractText().toLowerCase();
['"load"', 'charge (', 'poids (', '`load`', '`charge`', '`poids`'].forEach(function(needle){
  assert(contract.indexOf(needle) === -1, 'Aucun champ de charge dans le contrat texte : ' + needle);
});
assert(contract.indexOf('intention') !== -1, 'Le contrat texte décrit bien le champ `intention`.');
assert(contract.indexOf('proposer_semaine') === -1 && !ctxBridge.window.CoachAIPatch.isProposal('proposer_semaine'),
  'Coach IA n\'écrit plus de semaines (2026-10-09) : les programmes passent par Claude et Claude Code.');
['proposer_remplacement', 'proposer_ajustement'].forEach(function(n){
  assert(contract.indexOf(n) !== -1, 'Le contrat texte décrit ' + n + '.');
});
['consulter_mouvement', 'consulter_seance', 'consulter_programme'].forEach(function(n){
  assert(contract.indexOf(n) === -1,
    'Le contrat texte n\'annonce pas un outil de lecture qui n\'existe pas hors API : ' + n + '.');
});
['proposer_retrait_remplacement', 'proposer_retrait_ajustement'].forEach(function(n){
  assert(contract.indexOf(n) !== -1, 'Le contrat texte décrit ' + n + '.');
});

// Le prompt doit porter l'interdiction en toutes lettres, en plus du schéma.
const promptSrc = bridgeSrc;
assert(/N'écris donc AUCUN poids/.test(promptSrc), 'Le prompt interdit explicitement d\'écrire un poids.');

// Lecture d'une réponse : texte seul, propositions, type inventé, JSON cassé.
let p1 = CoachAIBridge.parseResponse('Ton squat progresse bien, rien à changer cette semaine.');
assert(p1.ok && p1.proposals.length === 0 && p1.text.indexOf('squat') !== -1,
  'Une réponse en texte seul est valide et affichée (cas le plus fréquent).');

let p2 = CoachAIBridge.parseResponse(
  'Voici ce que je vois.\n' + CoachAIBridge.START +
  '{"propositions":[{"type":"proposer_remplacement","de":"Bench Press","vers":"DB Bench Press","raison":"épaule"}]}' +
  CoachAIBridge.END);
assert(p2.ok && p2.proposals.length === 1, 'Une proposition entre marqueurs est lue.');
assert(p2.proposals[0].name === 'proposer_remplacement', 'Le type est reconnu.');
assert(p2.text.indexOf('Voici ce que je vois') !== -1 && p2.text.indexOf('propositions') === -1,
  'Le texte de coach est séparé du bloc machine.');

let p3 = CoachAIBridge.parseResponse(CoachAIBridge.START + '{"propositions":[{"type":"supprimer_historique"}]}' + CoachAIBridge.END);
assert(p3.ok && p3.proposals.length === 0 && p3.rejected.length === 1,
  'Un type inventé est REFUSÉ et signalé, jamais deviné.');

let p4 = CoachAIBridge.parseResponse(CoachAIBridge.START + '{ceci nest pas du json' + CoachAIBridge.END);
assert(!p4.ok && /JSON/.test(p4.error), 'Un bloc illisible donne une erreur explicite, pas un plantage.');

// Repli sans marqueurs : un bloc ```json seul reste lisible.
let p5 = CoachAIBridge.parseResponse('Réponse.\n```json\n{"propositions":[{"type":"proposer_ajustement","semaine":1,"jour":"lundi","mouvement":"Back Squat","format":"5×3","raison":"x"}]}\n```');
assert(p5.ok && p5.proposals.length === 1, 'Un bloc ```json sans marqueurs est lu en repli.');

// Une semaine collée à la main n'est plus une proposition : refusée, jamais devinée.
let p6 = CoachAIBridge.parseResponse(CoachAIBridge.START + JSON.stringify({propositions:[{
  type:'proposer_semaine', semaine:3, label:'X',
  jours:[{jour:'lundi', blocs:[{title:'A', kind:'main', exercises:[{name:'Back Squat', format:'5×5', load:'315 lb'}]}]}]
}]}) + CoachAIBridge.END);
assert(p6.proposals.length === 0 && p6.rejected.length === 1, 'Une semaine collée est refusée : Coach IA n\'écrit plus de programme.');

// Le prompt lui-même ne doit nommer AUCUN fournisseur : c'est ce qui permet de
// le coller dans Claude, ChatGPT ou autre chose sans toucher une ligne de code,
// et de survivre à un changement d'abonnement.
ctxBridge.window.CoachAIConfig = {assistantLabel: function(){ return "ChatGPT"; }};
const builtPrompt = CoachAIBridge.buildPrompt('libre', 'ma question');
['claude', 'chatgpt', 'anthropic', 'openai', 'gpt-', 'gemini'].forEach(function(name){
  assert(builtPrompt.toLowerCase().indexOf(name) === -1,
    'Le prompt ne nomme aucun fournisseur (' + name + ') — il reste portable.');
});
assert(builtPrompt.indexOf('proposer_ajustement') !== -1 && builtPrompt.indexOf('ma question') !== -1,
  'Le prompt porte bien le contrat et la demande de l\'athlète.');
assert(code('scripts/coach_ai/bridge.js').indexOf('assistantLabel') !== -1,
  'Le nom affiché vient du réglage, pas d\'une chaîne codée en dur.');

// Le pont ne fait pas de réseau et n'applique rien tout seul.
assert(code('scripts/coach_ai/bridge.js').indexOf('CoachAIPatch.apply') === -1,
  'bridge.js n\'applique jamais un patch : seul le bouton Accepter le fait.');

// Sans clé, l'app doit rester pleinement utilisable : le pont est le défaut.
const uiSrc = code('scripts/coach_ai/ui.js');
assert(uiSrc.indexOf('function mode()') !== -1 && uiSrc.indexOf('CoachAIConfig.isReady()') !== -1,
  'L\'écran choisit son mode selon la présence d\'une clé.');
assert(uiSrc.indexOf('renderBridge()') !== -1, 'Le mode pont est rendu quand aucune clé n\'est enregistrée.');
assert(uiSrc.indexOf('classList.toggle("cai-pont"') !== -1 && read('styles.css').indexOf('#coachaiView.cai-pont { height: auto;') !== -1,
  'Mode copier-coller : l\'écran défile comme une page, le fil n\'est plus écrasé entre le bandeau et les étapes.');
assert(/#coachaiView > \.cai-settings \{\s*position: fixed;/.test(read('styles.css')) && uiSrc.indexOf('data-cai-close') !== -1 && read('index.html').indexOf('id="caiBackdrop"') !== -1,
  'Réglages et Carnet s\'ouvrent en feuille par-dessus la conversation (jamais dans le fil), avec Fermer et un fond qui ferme.');
assert(/caiClearKey[\s\S]{0,200}confirm\(/.test(uiSrc), 'Effacer la clé API demande confirmation.');

// ── Le contexte dit vrai : unités, metcons, notes, jour ────────────────────
// Rapport d'anomalies du 2026-10-02 sur le prompt Coach : courbe à 8000 %,
// section Brain vide sous son en-tête, metcons en « wod_X — 0 lb × 0 reps ×
// RPE 0 », note de l'app lue comme une note de l'athlète, « jour courant »
// pris pour la date du jour.
{
  const c = {console:console, Math:Math, Date:Date, JSON:JSON, localStorage:fakeStorage()};
  c.window = c;
  vm.createContext(c);
  vm.runInContext(read('scripts/charge/brain_memory.js'), c, {filename:'brain_memory.js'});
  c.todayIsoDate = function(){ return '2026-10-02'; };
  c.actualDayName = function(){ return 'vendredi'; };
  c.state = {week:1, day:'mardi', completedDays:[], missedDays:[], cycle:{goal:'pont_peak'}, profile:{name:'T'},
    history:[{date:'2026-09-30', week:8, day:'mercredi', results:{
      'Power Clean': {load:'235', reps:'1', rpe:'9', note:'explosif · PR automatique détecté', autoPr:true, prOld:225, prNew:235, prReps:1},
      'wod_D. Metcon': {load:'0', reps:'0', rpe:'0'},
      'Back Squat': {load:'300', reps:'1', rpe:'9.5', trophyPr:{label:'Back Squat 1RM', old:285, new:300}},
      'wod_C. Finisher': {load:'0', reps:'0', rpe:'8', result:'4 rounds + 6', rounds:'4'}
    }}]};
  c.localStorage.setItem('racine::__pending__::brain-memory-v1', JSON.stringify({version:'brain-memory-v1', schema:2, journal:[], profiles:{
    'back squat::strength': {label:'Back Squat', intent:'strength', testedPredictions:12, successfulPredictions:10, underPredictions:2, overPredictions:1,
      recentOutcomes:[1,1,0,1,1], precisionTrend:[{m:'2026-09', t:10, s:8}, {m:'2026-10', t:1, s:1}]}
  }}));
  vm.runInContext(read('scripts/coach_ai/context.js'), c, {filename:'context.js'});
  const txt = c.CoachAIContext.build();

  assert(txt.indexOf('2026-09 80 % (n=10)') !== -1 && txt.indexOf('8000') === -1,
    'Courbe de précision : precisionTrend() est déjà en %, aucune double multiplication.');
  assert(txt.indexOf('2026-10 100 % (n=1, mois en cours)') !== -1,
    'Chaque point de la courbe porte son n, et le mois en cours est signalé.');
  assert(/Back Squat · strength : 12 \/ 10 \/ 2 \/ 1/.test(txt),
    'La section Brain lit les vrais champs (testedPredictions…) au lieu d\'un en-tête vide.');
  assert(txt.indexOf('wod_') === -1, 'Aucune clé interne wod_X dans le prompt.');
  assert(txt.indexOf('D. Metcon (metcon) — metcon non enregistré') !== -1,
    'Un metcon sans donnée est dit « non enregistré », pas « 0 lb × 0 reps ».');
  assert(txt.indexOf('C. Finisher (metcon) — score 4 rounds + 6 · RPE 8') !== -1,
    'Un metcon renseigné montre son score.');
  assert(!/(^|[^0-9.])0 (lb|reps)|RPE 0\b/.test(txt), 'Ni charge, reps ni RPE à zéro : zéro veut dire « non saisi ».');
  const athleteNotes = (txt.split('## Notes écrites par l\'athlète')[1] || '').split('##')[0];
  assert(athleteNotes.indexOf('explosif') !== -1 && athleteNotes.indexOf('PR automatique') === -1,
    'Les notes de l\'athlète ne contiennent plus les notes générées par l\'app.');
  assert(txt.indexOf('[note de l\'app : PR automatique : 225 → 235 lb') !== -1,
    'La note système reste visible dans la séance, étiquetée comme venant de l\'app.');
  assert(txt.indexOf('Record Back Squat 1RM : 285 → 300 lb') !== -1 && athleteNotes.indexOf('Record') === -1,
    'Un trophée 1RM détecté est une note de l\'app, jamais une note de l\'athlète.');
  assert(txt.indexOf('Aujourd\'hui : vendredi 2026-10-02') !== -1 && txt.indexOf('jour affiché dans l\'app : mardi') !== -1,
    'Le jour affiché (curseur) n\'est plus présenté comme la date du jour.');

  // Sans prédiction testée, pas d'en-tête orphelin.
  c.localStorage.setItem('racine::__pending__::brain-memory-v1', JSON.stringify({version:'brain-memory-v1', schema:2, journal:[], profiles:{
    'face pull::hypertrophy': {label:'Face Pull', intent:'hypertrophy', testedPredictions:0, precisionTrend:[]}
  }}));
  assert(c.CoachAIContext.build().indexOf('Par mouvement et intention') === -1,
    'Section Brain vide → son en-tête n\'est pas affiché.');
}

// ── Sortie ─────────────────────────────────────────────────────────────────
function fakeStorage(){
  const store = {};
  return {
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function(k, v){ store[k] = String(v); },
    removeItem: function(k){ delete store[k]; }
  };
}

// ── Le coach voit ce qui est PRÉVU, pas seulement le passé ─────────────────
//
// Bug d'origine : « qu'est-ce que j'ai aujourd'hui ? » restait sans réponse,
// le contexte ne contenait que l'historique. La séance prévue est lue par
// buildWorkout() (l'entonnoir unique), la charge par le moteur.
{
  const ctxPlanned = {console:console, Date:Date};
  ctxPlanned.window = ctxPlanned;
  ctxPlanned.state = {week:2, day:'lundi', history:[], completedDays:['lundi'], missedDays:[], profile:{name:'Test'}};
  const wd = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][new Date().getDay()];
  const tomorrow = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'][(['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(wd) + 1) % 7];
  ctxPlanned.currentDayOrder = function(){ return [wd, tomorrow, 'lundi'].filter(function(d, i, a){ return a.indexOf(d) === i; }); };
  ctxPlanned.totalWeeks = function(){ return 4; };
  ctxPlanned.buildWeekInfo = function(){ return {1:{label:'Base',goal:'x'},2:{label:'Volume',goal:'y'},3:{label:'Intensité',goal:'z'},4:{label:'Deload',goal:'récupération'}}; };
  ctxPlanned.buildWorkout = function(day, week){
    return {day:{label:'Séance ' + day}, blocks:[{title:'A. Force', kind:'main', exercises:[{name:'Mvt_' + day + '_S' + week, format:'5×5', load:'75%'}]}]};
  };
  ctxPlanned.CoachCharge = {suggestForExercise: function(ex, b, o){ return o && o.week ? 200 + o.week : ''; }};
  vm.createContext(ctxPlanned);
  vm.runInContext(contextSrc, ctxPlanned, {filename:'context.js'});
  const C = ctxPlanned.CoachAIContext;
  const built = C.build();
  assert(built.indexOf('### ' + wd + ' — AUJOURD\'HUI') !== -1 && built.indexOf('Mvt_' + wd + '_S2') !== -1,
    'Le contexte contient la séance d\'aujourd\'hui, construite par buildWorkout().');
  assert(tomorrow === 'lundi' || built.indexOf('### ' + tomorrow + ' — DEMAIN') !== -1, 'Le contexte marque la séance de demain.');
  assert(built.indexOf('### lundi') !== -1 && built.indexOf('Mvt_lundi_S2') !== -1, 'Toute la semaine en cours est détaillée, pas seulement aujourd\'hui et demain.');
  const nextWeek = built.slice(built.indexOf('## Semaine suivante'));
  assert(nextWeek.indexOf('Mvt_lundi_S3 5×5') !== -1 && nextWeek.indexOf('charge du moteur') === -1,
    'La semaine suivante est en aperçu : mouvements et formats, sans faire tourner le moteur de charges.');
  assert(built.indexOf('charge du moteur : 202') !== -1 && built.indexOf('75%') === -1,
    'La charge montrée est celle du moteur, jamais le %1RM brut du programme.');
  assert(built.indexOf('S4 : Deload') !== -1, 'La carte du programme liste chaque semaine.');
  const seance = C.read('consulter_seance', {semaine:3, jour:'lundi'});
  assert(seance.indexOf('Mvt_lundi_S3') !== -1 && seance.indexOf('charge du moteur : 203') !== -1,
    'consulter_seance lit n\'importe quelle journée, charge du moteur comprise.');
  assert(C.read('consulter_seance', {semaine:9, jour:'lundi'}).indexOf('hors programme') !== -1,
    'consulter_seance refuse une semaine hors programme au lieu d\'inventer.');
  ctxPlanned.state.history = [
    {date:'2026-06-02', week:1, day:'lundi', results:{back_squat:{load:'200', reps:'5', rpe:'7', note:'premier jour'}}},
    {date:'2026-09-15', week:3, day:'mardi', results:{bench:{load:'185', reps:'5', rpe:'8'}}}
  ];
  const over = C.build();
  assert(over.indexOf('2 séances enregistrées, du 2026-06-02') !== -1 && over.indexOf('consulter_historique') !== -1,
    'Le contexte dit jusqu\'où remonte l\'historique et comment lire le reste.');
  ctxPlanned.state.history.push({date:'2026-10-08', week:2, day:'lundi', results:{'Mvt_lundi_S2':{load:'150', reps:'4', rpe:'7', planned:{load:140}}}});
  const withDone = C.build();
  assert(withDone.indexOf('FAIT : 150 lb × 4 reps × RPE 7 (suggéré avant la séance : 140 lb)') !== -1
    && withDone.indexOf('suggestion actuelle, recalculée après la séance : 202 lb') !== -1,
    'Séance faite : fait, suggéré AVANT la séance et suggestion actuelle sont trois chiffres distincts et étiquetés.');
  ctxPlanned.state.history.pop();
  ctxPlanned.state.history.push({date:'2026-10-02', week:2, day:'mardi', results:{'Push Press':{load:'215', reps:'3', extra:'1'}, 'Strict Press':{load:'175', reps:'2'}}});
  const noPlan = C.read('consulter_historique', {depuis:'2026-10-02', jusqua:'2026-10-02'});
  assert(noPlan.indexOf('215 lb × 3 reps (aucune suggestion enregistrée : mouvement ajouté hors programme)') !== -1
    && noPlan.indexOf('175 lb × 2 reps (aucune suggestion enregistrée)') !== -1,
    'Série sans suggestion figée : le coach est prévenu, il ne la comble pas avec la suggestion actuelle.');
  ctxPlanned.state.history.pop();
  // Bilan suggéré vs fait : calculé localement, signal quand l'écart se répète.
  ctxPlanned.state.history.push(
    {date: new Date().toISOString().slice(0, 10), week:2, day:'lundi', results:{'Back Squat':{load:'200', reps:'5', rpe:'7.5', planned:{load:170}}}},
    {date: new Date().toISOString().slice(0, 10), week:2, day:'mardi', results:{'Back Squat':{load:'205', reps:'5', rpe:'8', planned:{load:175}}}},
    {date: new Date().toISOString().slice(0, 10), week:2, day:'jeudi', results:{'Back Squat':{load:'210', reps:'5', rpe:'8', planned:{load:180}}}});
  const gap = C.gapReport({weeks: 8}).lignes.filter(function(r){ return r.mouvement === 'Back Squat'; })[0];
  assert(gap && gap.seances === 3 && gap.ecartMoyenLb === 30 && /trop prudent/.test(gap.signal),
    'Bilan : écart moyen fait − suggéré calculé par Racine, signal « trop prudent » quand il se répète à effort modéré.');
  assert(C.read('consulter_bilan', {}).indexOf('Back Squat : 3 séance(s), écart moyen +30 lb') !== -1, 'Le coach lit le même bilan par `consulter_bilan`.');
  ctxPlanned.state.history.splice(-3, 3);
  const juin = C.read('consulter_historique', {depuis:'2026-06-01', jusqua:'2026-06-30'});
  assert(juin.indexOf('premier jour') !== -1 && juin.indexOf('185') === -1, 'consulter_historique lit une période ancienne, et seulement elle.');
  assert(C.read('consulter_historique', {semaine:3}).indexOf('185') !== -1, 'consulter_historique filtre par semaine du programme.');
  const bridgeCtx = C.build({planned:'week'});
  assert(bridgeCtx.indexOf('consulter_historique') === -1, 'Le pont, sans outils, ne se voit pas promettre un outil de lecture.');
  assert(bridgeCtx.indexOf('Mvt_lundi_S2') !== -1, 'Le pont (sans outils) reçoit toute la semaine prévue.');
}
{
  const ctxSrc = code('scripts/coach_ai/context.js');
  assert(ctxSrc.indexOf('CoachChargeTrace.movement(') !== -1 && ctxSrc.indexOf('skipReplay: true') !== -1,
    '`expliquer_charge` relit la trace RÉELLE du moteur (pas de calcul parallèle), sans rejeu coûteux.');
  assert(CoachAIPatch.isRead('expliquer_charge') && CoachAIPatch.isRead('consulter_bilan'), 'Expliquer une charge et lire le bilan sont des lectures.');
  const uiCC = code('scripts/coach_ai/ui.js');
  assert(uiCC.indexOf('data-cai-cc') !== -1 && uiCC.indexOf('function buildRequest') !== -1
    && !/buildRequest[\s\S]{0,4000}CoachAIChat\.send|buildRequest[\s\S]{0,4000}CoachAIClient/.test(uiCC),
    '« → Claude Code » rédige la demande dans Racine, sans appel au modèle (coût nul).');
}
const chatSrcPlanned = code('scripts/coach_ai/chat.js');
assert(chatSrcPlanned.indexOf('CoachAIContext.read(name') !== -1,
  'chat.js aiguille TOUS les outils de lecture par CoachAIContext.read.');

// ── Mémoire : le fil se relit, le carnet tient, rien ne déborde ────────────
//
// V5.2.11 : les réponses du coach n'étaient pas réaffichées, et la coupe à 30
// messages bruts pouvait tomber au milieu d'une paire tool_use / tool_result.
{
  const store = fakeStorage();
  const ctxM = {console:console, Date:Date, JSON:JSON, Math:Math, localStorage:store};
  ctxM.window = ctxM;
  ctxM.CoachProfiles = {getActiveId:function(){ return 'p1'; }};
  vm.createContext(ctxM);
  // Une conversation v1 (messages API bruts, blocs d'outils compris).
  store.setItem('racine_coach_ai_chat_v1::p1', JSON.stringify([
    {role:'user', content:'Ma séance ?'},
    {role:'assistant', content:[{type:'text', text:'Tu as squat.'}, {type:'tool_use', id:'x', name:'consulter_seance', input:{}}]},
    {role:'user', content:[{type:'tool_result', tool_use_id:'x', content:'…'}]}
  ]));
  vm.runInContext(read('scripts/coach_ai/chat.js'), ctxM, {filename:'chat.js'});
  const Chat = ctxM.CoachAIChat;
  const migrated = Chat.turns();
  assert(migrated.length === 2 && migrated[1].role === 'coach' && migrated[1].text === 'Tu as squat.',
    'Migration v1 → v2 : questions ET réponses gardées, rouages d\'outils jetés.');
  assert(store.getItem('racine_coach_ai_chat_v1::p1') === null && store.getItem('racine_coach_ai_thread_v2::p1') !== null,
    'La clé v1 n\'est retirée qu\'après l\'écriture de la v2.');
  for(let i = 0; i < 60; i++) Chat.addTurn({role: i % 2 ? 'coach' : 'user', text: 'x'.repeat(3000)});
  const u = Chat.usage();
  assert(u.turns <= Chat.MAX_MESSAGES && store.getItem('racine_coach_ai_thread_v2::p1').length <= 60000,
    'Le fil est plafonné en nombre ET en octets (le téléphone reste léger).');
  const coachTurn = Chat.addTurn({role:'coach', text:'Propose.', proposals:[{name:'proposer_remplacement', input:{de:'A', vers:'B', raison:'r'}}]});
  assert(Chat.findProposal(coachTurn.id, 0).status === 'pending' && Chat.setProposalStatus(coachTurn.id, 0, 'accepted')
    && Chat.findProposal(coachTurn.id, 0).status === 'accepted', 'La décision sur une proposition est gardée dans le fil.');
  for(let i = 0; i < 30; i++) Chat.remember('Fait numéro ' + i, 'coach');
  Chat.remember('fait numéro 29', 'athlete');
  assert(Chat.memory().length === Chat.MAX_FACTS, 'Le carnet est plafonné et ne duplique pas un fait déjà noté.');
  assert(Chat.memoryText().indexOf('fait numéro 29') !== -1, 'Le carnet est rendu au modèle.');
  const arch = Chat.pendingArchive();
  assert(arch && arch.count > 0 && arch.markdown.indexOf('acceptée') !== -1, 'L\'archive GitHub porte les échanges et les décisions.');
  Chat.markArchived(arch.upTo);
  assert(Chat.pendingArchive() === null, 'Un échange archivé ne repart pas deux fois.');
  Chat.clear();
  assert(Chat.turns().length === 0 && Chat.memory().length === Chat.MAX_FACTS, 'Nouvelle conversation : le fil repart, le carnet reste.');
}
const chatMemSrc = code('scripts/coach_ai/chat.js');
assert(chatMemSrc.indexOf('windowMessages()') !== -1 && /API_WINDOW\s*=\s*\d+/.test(chatMemSrc),
  'Le modèle reçoit une fenêtre de texte bornée, jamais de blocs d\'outils stockés.');
assert(JSON.stringify(CoachAIPatch.tools()).indexOf('"retenir"') !== -1 && !CoachAIPatch.isProposal('retenir'),
  'L\'outil `retenir` existe et n\'est pas une proposition d\'entraînement.');
assert(read('scripts/coach_ai/ui.js').indexOf('CoachAIChat.turns()') !== -1,
  'L\'écran relit le fil depuis la mémoire (réponses du coach comprises).');

// ── Modèles 5.5 : consigne figée par message, refus, repli serveur ─────────
{
  const chatSrc55 = code('scripts/coach_ai/chat.js');
  assert(chatSrc55.indexOf('var system = systemBlocks();') !== -1 && chatSrc55.indexOf('system: systemBlocks()') === -1,
    'La consigne est construite une fois par message : `retenir` ne change pas le préfixe sous des blocs de réflexion (400 sur les modèles 5.5).');
  assert(chatSrc55.indexOf('stop_reason === "refusal"') !== -1, 'Un refus de filtre de sécurité est expliqué, pas rendu comme une réponse vide.');
  assert(chatSrc55.indexOf('MANUEL DE RACINE') !== -1, 'Le coach reçoit le manuel de l\'application.');
  const calls = [];
  const cc = {console:console, JSON:JSON, Object:Object, String:String, Number:Number};
  cc.window = cc;
  cc.CoachAIConfig = {get:function(){ return {apiKey:'sk-ant-api03-x', model:'claude-opus-5-5', effort:'medium'}; },
    overBudget:function(){ return false; }, modelInfo:function(m){ return m === 'claude-opus-5-5' ? {effort:true, fallback:true} : {effort:true}; },
    recordUsage:function(){}, ENDPOINT:'x', API_VERSION:'v', DEFAULT_MODEL:'claude-haiku-5-5', keyPreview:function(){ return ''; }, monthSpend:function(){ return {usd:0}; }};
  let reject = true;
  cc.fetch = async function(url, init){
    const body = JSON.parse(init.body);
    calls.push({beta: init.headers['anthropic-beta'] || '', fallbacks: body.fallbacks, thinking: body.thinking});
    if(body.fallbacks && reject) return {ok:false, status:400, json: async function(){ return {error:{message:'fallbacks: unsupported'}}; }};
    return {ok:true, status:200, json: async function(){ return {model:'claude-opus-5-5', content:[], usage:{}}; }};
  };
  vm.createContext(cc);
  vm.runInContext(read('scripts/coach_ai/client.js'), cc, {filename:'client.js'});
  (async function(){
    await cc.CoachAIClient.send({messages:[{role:'user', content:'x'}]});
    assert(calls.length === 2 && calls[0].fallbacks === 'default' && calls[0].beta === 'server-side-fallback-2026-07-01'
      && calls[1].fallbacks === undefined && calls[1].beta === '',
      'Opus 5.5 : repli serveur demandé ; s\'il est refusé, la requête repart sans lui (Coach IA reste utilisable).');
    assert(calls.every(function(c){ return c.thinking && c.thinking.type === 'adaptive'; }), 'Jamais de `thinking: disabled` (refusé par Opus 5.5).');
    calls.length = 0; cc.CoachAIConfig.get = function(){ return {apiKey:'k', model:'claude-haiku-5-5', effort:'medium'}; };
    await cc.CoachAIClient.send({messages:[{role:'user', content:'x'}]});
    assert(calls.length === 1 && calls[0].fallbacks === undefined, 'Haiku 5.5 : pas de repli serveur (il n\'en a pas).');
    finish();
  })().catch(function(e){ errors.push('Test client : ' + e.message); finish(); });
}

// Le test du client est asynchrone : le bilan attend sa fin.
function finish(){
  if(errors.length){
    console.error('\n✗ coach_ai_checks — ' + errors.length + ' échec(s) :');
    errors.forEach(function(e){ console.error('  ✗ ' + e); });
    process.exit(1);
  }
  console.log('✓ coach_ai_checks — ' + notes.length + ' vérifications passées.');
}

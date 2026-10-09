// Avis IA mouvement par l'API (scripts/ai/ai_ask.js) — le contrat, pas l'inventaire.
//  1. Sans clé / hors-ligne / plafond : pas d'appel, une raison pour le repli copier-coller.
//  2. Le prompt envoyé ne porte que le mouvement demandé.
//  3. La réponse est rangée comme un avis importé ; aucun poids n'est appliqué.
//  4. Un poids alternatif n'existe que si l'IA n'est pas d'accord ; le rack l'arrondit à l'affichage.
//  5. Aucun fetch() hors scripts/coach_ai/client.js ; le panneau garde le copier-coller.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const code = (f) => read(f).replace(/\/\/.*$/gm, '');

const store = {};
const cfg = {ready: true, over: false, reason: 'Aucune clé API enregistrée. Réglages → Coach IA.'};
const sent = [];
let reply = '';
const ctx = {
  localStorage: {
    getItem: (k) => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  navigator: {onLine: true},
  CoachAIConfig: {
    isReady: () => cfg.ready,
    unavailableReason: () => cfg.ready ? '' : cfg.reason,
    overBudget: () => cfg.over
  },
  CoachAIClient: {
    send: async (opts) => { sent.push(opts); return {model: 'claude-haiku-5-5', content: [{type: 'text', text: reply}]}; },
    textOf: (m) => m.content.map((b) => b.text).join('\n')
  },
  // Rack fictif : pas de 5 lb.
  CoachCharge: {roundLoad: (name, n) => Math.round(n / 5) * 5},
  Date, Math, Number, String, JSON, Object, Array, Promise, console
};
ctx.window = ctx;
vm.createContext(ctx);
['scripts/ai/ai_export.js', 'scripts/ai/ai_import.js', 'scripts/ai/ai_ask.js'].forEach((f) => vm.runInContext(read(f), ctx, {filename: f}));

function answer(verdict, alt){
  return 'Avis court.\nRACINE_AI_RESPONSE_START\n' + JSON.stringify({
    scope: 'movement', movement: 'Front Squat', verdict, confidence: 0.7,
    summary: verdict === 'agree' ? 'Charge juste.' : 'Trop ambitieux après un RPE 9.',
    suggested_action: 'reduce_aggressiveness', reason: 'RPE récent', alternative_load: alt, do_not_auto_apply: true
  }) + '\nRACINE_AI_RESPONSE_END';
}
const hint = {name: 'Front Squat', load: '185', rows: [
  {date: '2026-10-01', load: 175, reps: 5, rpe: 8},
  {date: '2026-09-24', load: 170, reps: 5, rpe: 9}
]};

(async () => {
  // 1. Repli
  cfg.ready = false;
  let m = ctx.RacineAIAsk.mode();
  assert(!m.api && /clé/.test(m.reason), 'Sans clé : pas d\'API, la raison est donnée.');
  await assert.rejects(ctx.RacineAIAsk.askMovement(hint), 'Sans clé, askMovement refuse.');
  cfg.ready = true; cfg.over = true;
  assert(!ctx.RacineAIAsk.mode().api, 'Plafond atteint : pas d\'API.');
  cfg.over = false; ctx.navigator.onLine = false;
  assert(!ctx.RacineAIAsk.mode().api, 'Hors-ligne : pas d\'API.');
  ctx.navigator.onLine = true;
  assert(ctx.RacineAIAsk.mode().api, 'Clé + réseau + budget : API.');
  assert.strictEqual(sent.length, 0, 'Aucun appel ne part tant que mode() refuse.');

  // 2 + 3 + 4. Désaccord avec poids proposé
  reply = answer('disagree', 177);
  const rec = await ctx.RacineAIAsk.askMovement(hint);
  assert.strictEqual(sent.length, 1, 'Un seul appel.');
  const prompt = sent[0].messages[0].content;
  assert(/Mouvement: Front Squat/.test(prompt) && /175 lb × 5/.test(prompt), 'Le prompt porte l\'historique du mouvement.');
  assert(!/CONTEXTE GLOBAL|cycle_findings/.test(prompt), 'Le prompt ne porte ni cycle ni programme.');
  assert(/alternative_load/.test(prompt), 'Le contrat demande le poids alternatif.');
  assert.strictEqual(rec.via, 'api');
  assert.strictEqual(rec.structured.alternative_load, 177);
  assert(rec.applied === false && rec.consultative_only === true, 'Avis consultatif, jamais appliqué.');
  assert.strictEqual(ctx.RacineAIImport.latestForMovement('Front Squat').id, rec.id, 'Rangé comme avis mouvement actif.');
  const html = ctx.RacineAIImport.renderAdviceSummaryForMovement('Front Squat');
  assert(/Poids proposé par l’IA : 177 lb/.test(html) && /≈ 175 lb au rack/.test(html), 'Poids IA + arrondi rack affichés.');
  assert(/Brain proposait 185/.test(html), 'Le poids de Brain est rappelé.');

  reply = answer('agree', 190);
  const ok = await ctx.RacineAIAsk.askMovement(hint);
  assert.strictEqual(ok.structured.alternative_load, null, 'D\'accord : pas de poids alternatif.');

  // Un avis collé à la main sans le champ reste lisible (ancien format).
  const old = ctx.RacineAIImport.importAdvice(answer('disagree', undefined), {scope: 'movement', movement: 'Front Squat'});
  assert.strictEqual(old.structured.alternative_load, null);
  assert.strictEqual(old.via, 'paste');

  // 5. Frontières
  const ask = code('scripts/ai/ai_ask.js');
  assert(ask.indexOf('fetch(') === -1, 'ai_ask.js ne fait pas de réseau lui-même.');
  assert(ask.indexOf('CoachAIClient.send') !== -1, 'ai_ask.js passe par CoachAIClient.');
  assert(!/setLoad|applyLoad|CoachAIPatch|\.load\s*=/.test(ask), 'ai_ask.js n\'écrit aucune charge.');
  const ui = read('scripts/ui_modals.js');
  assert(/askAiAdviceMovementBtn/.test(ui) && /copyAiAdviceMovementBtn/.test(ui) && /importAiAdviceMovementBtn/.test(ui),
    'Le panneau garde le copier-coller et l\'import en repli.');
  assert(/aiAskFallbackReason/.test(ui), 'Une erreur d\'envoi repasse au copier-coller.');
  assert(/scripts\/ai\/ai_ask\.js\?v=/.test(read('index.html')), 'ai_ask.js est chargé par index.html.');

  console.log('✓ ai_ask_checks ok');
})().catch((e) => { console.error('✗ ai_ask_checks :', e.message); process.exit(1); });

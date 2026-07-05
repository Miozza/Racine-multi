const fs = require('fs');
const vm = require('vm');
const path = require('path');
const store = {};
const context = {
  window: {},
  localStorage: {
    getItem: (k) => Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null,
    setItem: (k,v) => { store[k]=String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  Date,
  Math,
  Number,
  String,
  JSON,
  console
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/ai/ai_import.js'),'utf8'), context);

const bareJson = JSON.stringify({
  racine_ai_response_version: '1.0',
  prompt_version: 'RACINE_AI_PROMPT_V1',
  prompt_id: 'RACINE-TEST-MOVEMENT-BARBELL-ROW',
  scope: 'movement',
  movement: 'Barbell Row',
  verdict: 'partially_agree',
  confidence: 0.83,
  summary: 'Progression logique, mais stabilité à confirmer.',
  suggested_action: 'maintain_but_watch',
  reason: 'Le dernier RPE demande validation technique.',
  do_not_auto_apply: true
}, null, 2);
const rec = context.RacineAIImport.importAdvice(bareJson, {movement:'Barbell Row', scope:'movement'});
if(rec.status !== 'structured') throw new Error('Bare JSON should import as structured');
if(rec.parse_source !== 'json_fallback') throw new Error('Expected json_fallback source');
if(rec.parse_warning !== 'missing_markers') throw new Error('Expected missing_markers warning');
if(!rec.structured || rec.structured.suggested_action !== 'maintain_but_watch') throw new Error('Action not normalized');
const summary = context.RacineAIImport.renderAdviceSummaryForMovement('Barbell Row');
if(!summary.includes('Partiellement')) throw new Error('Structured summary not rendered');

const fenced = '```json\n' + bareJson + '\n```';
const rec2 = context.RacineAIImport.importAdvice(fenced, {movement:'Barbell Row', scope:'movement'});
if(rec2.status !== 'structured') throw new Error('Fenced JSON should import as structured');

console.log('✓ ai_import_fallback_smoke ok');
